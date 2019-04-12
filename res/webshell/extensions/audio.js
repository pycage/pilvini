"use strict";

var Audio = function ()
{
    var that = this;
    var m_isSeeking = false;
    var m_statusItem = null;

    var m_metaDataCache = { };

    var Playlist = function (playCallback)
    {
        var m_keyCounter = 0;
        var m_items = [];
        var m_position = -1;

        this.clear = function ()
        {
            m_items = [];
            m_position = -1;
            playCallback(undefined);
        };

        this.add = function (uri, skipTo)
        {
            m_items.push(["" + (++m_keyCounter), uri]);
            if (skipTo || m_items.length === 1)
            {
                m_position = m_items.length - 1;
                playCallback(m_items[m_position]);
            }
        };

        this.previous = function ()
        {
            if (m_position > 0)
            {
                --m_position;
                playCallback(m_items[m_position]);
            }
        }

        this.next = function ()
        {
            if (m_position < m_items.length - 1)
            {
                ++m_position;
                playCallback(m_items[m_position]);
            }
        };

        this.goto = function (i)
        {
            if (i >= 0 && i < m_items.length)
            {
                m_position = i;
                playCallback(m_items[m_position]);
            }
        };

        this.removeAt = function (i)
        {
            if (i < m_position)
            {
                m_items.splice(i, 1);
                --m_position;
            }
            else if (i > m_position)
            {
                m_items.splice(i, 1);
            }
            else
            {
                m_items.splice(i, 1);
                playCallback(m_items[m_position]);
            }
        }

        this.size = function ()
        {
            return m_items.length;
        };

        this.itemAt = function (i)
        {
            return m_items[i];
        };

        this.indexOf = function (key)
        {
            for (var i = 0; i < m_items.length; ++i)
            {
                if (key == m_items[i][0])
                {
                    return i;
                }
            }
            return -1;
        };

        this.current = function (i)
        {
            return m_items[m_position];
        };

        this.position = function ()
        {
            return m_position;
        };
    };

    function mayUseFixedBackground()
    {
        return false;
        /*
        var ua = navigator.userAgent;
        if (! ua)
        {
            return true;
        }
        else if (ua.indexOf("SailfishBrowser") !== -1)
        {
            return false;
        }
        else
        {
            return true;
        }
        */
    }

    function formatTime(seconds)
    {
        var t = seconds;
        var secs = Math.floor(t) % 60;
        t /= 60;
        var minutes = Math.floor(t) % 60;
        t /= 60;
        var hours = Math.floor(t);

        var h = hours.toFixed(0);
        var m = minutes.toFixed(0);
        var s = secs.toFixed(0);

        if (h.length === 1) { h = "0" + h; }
        if (m.length === 1) { m = "0" + m; }
        if (s.length === 1) { s = "0" + s; }

        return (hours > 0 ? h + ":" : "") + m + ":" + s;
    }

    /* Fetches metadata for the current track.
     */
    function fetchMetadata(uri, callback)
    {
        if (m_metaDataCache[uri])
        {
            setTimeout(function ()
            {
                callback(uri, m_metaDataCache[uri]);
            }, 300);
            return;
        }

        $.ajax({
            url: "/::tags" + uri,
            type: "GET",
            dataType: "json"
        })
        .done(function (data, status, xhr)
        {
            //console.log(JSON.stringify(data));
            m_metaDataCache[uri] = data;
            callback(uri, data);
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Failed to retrieve tags: " + err);
            callback(uri, { });
        });
    }

    /* Parses the current metadata.
     */
    function parseMetadata(uri, data, callback)
    {
        function extractTitle(uri)
        {
            var parts = decodeURIComponent(uri).split("/");
            var p = parts[parts.length - 1];
            return p;
        }

        var title = data.TITLE || extractTitle(uri);
        var artist = data.ARTIST || "-";
        var cover = data.PICTURE;

        var pic = "";
        if (cover && cover.mimeType && cover.data)
        {
            var buffer = "";
            var contentType = "";
            
            for (var i = 0; i < cover.mimeType.data.length; ++i)
            {
                contentType += String.fromCharCode(cover.mimeType.data[i]);
            }

            for (i = 0; i < cover.data.length; ++i)
            {
                buffer += String.fromCharCode(cover.data.charCodeAt(i) & 0xff);
            }

            pic = "data:" + contentType + ";base64," + btoa(buffer);
        }

        callback(title, artist, pic);
    }

    /* Updates the current player position.
     */
    function updatePosition()
    {
        if (! m_isSeeking)
        {
            var total = audio.prop("duration") || 0;
            var pos = audio.prop("currentTime") || 0;
            $(".audio-progress-label").html(formatTime(pos) + " / " + formatTime(total));
            $(".audio-progress-bar > div:nth-child(2)").css("width", (pos / total * 100.0) + "%");
        }
        updateBuffering();
    }

    /* Updates the current buffering progress.
     */
    function updateBuffering()
    {
        var buffered = audio.prop("buffered");
        var total = audio.prop("duration");

        $(".audio-progress-bar > div:nth-child(1)").each(function (i)
        {
            var box = $(this);
            while (box.find("> div").length > buffered.length)
            {
                box.find("> div").last().remove();
            }
            while (box.find("> div").length < buffered.length)
            {
                box.append(
                    sh.tag("div")
                    .style("position", "absolute")
                    .style("background-color", "red")
                    .style("top", "0")
                    .style("bottom", "0")
                    .html()
                );
            }

            var gauges = box.find("> div");
            for (var i = 0; i < buffered.length; ++i)
            {
                console.log("buffered " + i + ": " + buffered.start(i) + " - " + buffered.end(i));
                gauges.eq(i)
                .css("left", (buffered.start(i) / total * 100) + "%")
                .css("right", (100 - buffered.end(i) / total * 100) + "%");
            }
        });
    }

    /* Updates the play status.
     */
    function updatePlayStatus()
    {
        if (audio.prop("paused"))
        {
            $(".audio-play-button")
            .removeClass("sh-busy-indicator")
            .removeClass("sh-icon-media-pause-circle")
            .addClass("sh-icon-media-play-circle");
        }
        else
        {
            $(".audio-play-button")
            .removeClass("sh-busy-indicator")
            .removeClass("sh-icon-media-play-circle")
            .addClass("sh-icon-media-pause-circle");
        }

        $(".audio-playlist-indicator").css("visibility", "hidden");
        $(".audio-playlist-indicator").eq(m_playlist.position()).css("visibility", "visible");
    }

    /* Updates the wait status.
     */
    function updateWaitStatus()
    {
        $(".audio-play-button")
        .removeClass("sh-icon-media-pause-circle")
        .removeClass("sh-icon-media-play-circle")
        .addClass("sh-busy-indicator");
    }

    /* Updates the meta data.
     */
    function updateMetadata()
    {
        if (! m_playlist.current())
        {
            return;
        }

        fetchMetadata(m_playlist.current()[1], function (uri, data)
        {
            parseMetadata(uri, data, function (title, artist, pic)
            {
                $(".audio-title").html(sh.escapeHtml(title));
                $(".audio-artist").html(sh.escapeHtml(artist));
                if (pic !== "")
                {
                    $(".audio-cover").css("background-image", "url(" + pic + ")");
                }
                else
                {
                    $(".audio-cover").css("background-image", "");
                }
            });
        })
    }

    /* Updates the playlist puller state.
     */
    function updatePullerState()
    {
        var puller = $(".audio-playlist-puller");
        if (puller.length)
        {
            if ($(document).scrollTop() > 0)
            {
                puller.removeClass("sh-icon-move-up").addClass("sh-icon-move-down");
            }
            else
            {
                puller.removeClass("sh-icon-move-down").addClass("sh-icon-move-up");
            }
        }
    }

    /* Pushes the status item.
     */
    function pushStatusItem()
    {
        var item = $(
            sh.tag("div")
            .style("position", "relative")
            .style("height", "64px")
            .content(
                sh.tag("div").class("sh-left audio-cover")
                .style("width", "64px")
                .style("height", "80px")
                .style("background-size", "64px 64px")
                .style("background-repeat", "no-repeat")
                .style("text-align", "center")
                .style("font-size", "200%")
                .style("line-height", "64px")
                .content(
                    sh.tag("span").class("sh-fw-icon sh-icon-media-play-circle audio-play-button")
                    .style("color", "white")
                    .style("text-shadow", "#000 0px 0px 1px")
                )
            )
            .content(
                sh.tag("div").class("audio-progress-bar")
                .style("position", "absolute")
                .style("top", "0")
                .style("left", "64px")
                .style("right", "42px")
                .style("height", "4px")
                .content(
                    sh.tag("div")
                    .style("position", "absolute")
                    .style("top", "0")
                    .style("left", "0")
                    .style("width", "100%")
                    .style("height", "1px")
                )
                .content(
                    sh.tag("div")
                    .style("position", "absolute")
                    .style("top", "0")
                    .style("left", "0")
                    .style("width", "0%")
                    .style("height", "100%")
                    .style("background-color", "var(--color-primary)")
                )
            )
            .content(
                sh.tag("div")
                .style("margin-left", "64px")
                .style("margin-right", "42px")
                .style("margin-top", "4px")
                .style("padding-top", "0.5em")
                .style("padding-left", "0.5em")
                .style("text-align", "left")
                .content(
                    sh.tag("h1").class("audio-title")
                    .style("line-height", "1.2em")
                    .content("-")
                )
                .content(
                    sh.tag("h2").class("sh-font-small audio-artist")
                    .style("line-height", "1.2em")
                    .content("-")
                )
            )
            .content(
                sh.tag("div").class("sh-right audio-close-button")
                .style("width", "42px")
                .style("text-align", "center")
                .style("border-left", "solid 1px var(--color-border)")
                .style("line-height", "80px")
                .content(
                    sh.tag("span").class("sh-fw-icon sh-icon-close")
                )
            )
            .content(
                sh.tag("video")
                .style("display", "none")
                /*
                .style("position", "absolute")
                .style("width", "64px")
                .style("height", "64px")
                .style("top", "0")
                .style("right", "0")
                */
                //.attr("src", "/Videos/video2.mp4")
                .attr("src", "/::res/webshell/extensions/audio/null.mp4")
            )
            .html()
        );

        item.on("click", openPage);
        item.find(".audio-close-button").on("click", function (event)
        {
            event.stopPropagation();
            item.close();
        });
        
        item.find(".audio-play-button").on("click", function (event)
        {
            event.stopPropagation();
            if (audio.prop("paused"))
            {
                audio.trigger("play");
                item.wakeLock();
            }
            else
            {
                audio.trigger("pause");
                item.wakeUnlock();
            }
        });

        // acquire wake lock to not get playback killed on Android devices
        var wakeLocker = item.find("video");
        wakeLocker.prop("muted", true);
        wakeLocker.prop("loop", true);
        wakeLocker.trigger("load");

        item.wakeLock = function ()
        {
            console.log("Acquiring Wakelock");
            wakeLocker.trigger("play");
        };

        item.wakeUnlock = function ()
        {
            console.log("Releasing Wakelock");
            wakeLocker.trigger("pause");
        };

        item.close = function ()
        {
            m_playlist.clear();
            var obj = {
                get: function () { return item; }
            };
            files.popStatus(obj);
            m_statusItem = null;
        };

        var obj = {
            get: function () { return item; }
        };

        files.pushStatus(obj);

        return item;
    }

    /* Creates the playlist UI.
     */
    function makePlaylistUi()
    {
        var t = sh.tag("ul").class("sh-listview")
                .style("text-align", "left")
                .style("background-color", "var(--color-primary-background-translucent)")
        for (var i = 0; i < m_playlist.size(); ++i)
        {
            t.content(
                sh.tag("li").class("audio-playlist-item")
                .data("playlist-key", m_playlist.itemAt(i)[0])
                .style("height", "80px")
                .style("background-color", "var(--color-primary-background-translucent)")
                //.style("color", "#fff")
                .on("click", "")
                .content(
                    sh.tag("div").class("sh-left")
                    .style("width", "80px")
                    .style("height", "80px")
                    .style("background-size", "cover")
                    .style("background-color", "#666")
                )
                .content(
                    sh.tag("div").class("sh-left")
                    .style("margin-left", "80px")
                    .style("padding-left", "1rem")
                    .style("line-height", "80px")
                    .style("font-size", "200%")
                    .content(
                        sh.tag("span").class("sh-fw-icon sh-icon-media-play audio-playlist-indicator")
                        .style("visibility", "hidden")
                    )
                )
                .content(
                    sh.tag("h1").content("-")
                    .style("margin-left", "80px")
                    .style("margin-right", "42px")
                    .style("padding-top", "1rem")
                    .style("padding-left" ,"3rem")
                )
                .content(
                    sh.tag("h2").content("-")
                    .style("margin-left", "80px")
                    .style("margin-right", "42px")
                    .style("padding-left" ,"3rem")
                )
                .content(
                    sh.tag("div").class("sh-right audio-playlist-delete-button")
                    .style("width", "42px")
                    .style("text-align", "center")
                    .style("border-left", "solid 1px var(--color-border)")
                    .style("line-height", "80px")
                    .content(
                        sh.tag("span").class("sh-fw-icon sh-icon-close")
                    )
                )
            );
        }

        return t;
    }

    /* Opens the player page.
     */
    function openPage()
    {
        var t = sh.tag("div").class("audio-cover")
                .style("background-size", "cover")
                .style("background-position", "50% 0%")
                .style("background-attachment", mayUseFixedBackground() ? "fixed" : "scroll")
                .style("color", "var(--primary-color)")
                .content(
                    sh.tag("div").class("audio-scroll-gap audio-cover")
                    .style("position", "relative")
                    .style("background-size", "contain")
                    .style("background-position", "50% 0%")
                    .style("background-repeat", "no-repeat")
                    .style("background-color", "var(--color-primary-background-translucent)")
                    .style("height", "100vh")
                    .content(
                        sh.tag("div")
                        .style("position", "absolute")
                        .style("left", "0")
                        .style("right", "0")
                        .style("bottom", "0")
                        .style("text-align", "center")
                        .style("text-shadow", "var(--color-primary-background) 0px 0px 1px")
                        .style("background-color", "var(--color-primary-background-translucent)")
                        .content(
                            sh.tag("div").class("audio-progress-bar")
                            .style("position", "relative")
                            .style("height", "1rem")
                            .style("margin", "0")
                            .content(
                                sh.tag("div")
                                .style("position", "absolute")
                                .style("top", "0")
                                .style("left", "0")
                                .style("width", "100%")
                                .style("height", "1px")
                            )
                            .content(
                                sh.tag("div")
                                .style("position", "absolute")
                                .style("top", "0")
                                .style("left", "0")
                                .style("width", "0%")
                                .style("height", "100%")
                                .style("background-color", "var(--color-primary)")
                            )
                        )
                        .content(
                            sh.tag("div")
                            .style("margin-bottom", "1rem")
                            .content(
                                sh.tag("span").class("audio-progress-label")
                                .style("line-height", "1.2em")
                                .content("00:00 / 00:00")
                            )
                        )
                        .content(
                            sh.tag("span").class("sh-fw-icon sh-icon-media-play-circle audio-play-button")
                            .style("font-size", "4rem")
                        )
                        .content(
                            sh.tag("span").class("sh-left sh-fw-icon sh-icon-media-previous audio-previous-button")
                            .style("font-size", "4rem")
                            .style("margin-top", "3rem")
                        )
                        .content(
                            sh.tag("span").class("sh-right sh-fw-icon sh-icon-media-next audio-next-button")
                            .style("font-size", "4rem")
                            .style("margin-top", "3rem")
                        )
                        .content(
                            sh.tag("h1").class("audio-title").content("-")
                            .style("font-size", "1.5rem")
                            .style("margin-top", "1rem")
                            .style("margin-left", "1rem")
                            .style("margin-right", "1rem")
                            .style("line-height", "1.2em")
                        )
                        .content(
                            sh.tag("h2").class("audio-artist").content("-")
                            .style("font-size", "1.2rem")
                            .style("margin-left", "1rem")
                            .style("margin-right", "1rem")
                            .style("margin-bottom", "1rem")
                            .style("line-height", "1.2em")
                        )
                        .content(
                            sh.tag("span").class("sh-fw-icon sh-icon-move-up audio-playlist-puller")
                            .style("font-size", "2rem")
                        )

                    )
                )
                .content(
                    sh.tag("div")
                    .style("background-color", "var(--color-primary-background-translucent)")
                    .content(
                        sh.tag("div")
                        .style("background-color", "var(--color-primary-background-translucent)")
                        .style("padding", "1rem")
                        .style("text-align", "center")
                        .content(
                            "&nbsp;"
                        )
                    )
                )
                .content(
                    makePlaylistUi()
                );

        var page = new sh.Page("", "");
        page.get().addClass("sh-theme-dark");
        page.addToHeaderLeft(new sh.IconButton("sh-icon-back", function () { page.pop(); }));

        page.get().css("padding-top", "0");
        page.get().find("> header")
        .css("background-color", "var(--color-primary-background-translucent)");
        page.get().find("> section").html(t.html());
        var pageSection = page.get().find("> section");

        pageSection.find(".audio-play-button").on("click", function ()
        {
            if (audio.prop("paused"))
            {
                audio.trigger("play");
                m_statusItem.wakeLock();
            }
            else
            {
                audio.trigger("pause");
                m_statusItem.wakeUnlock();
            }
        });

        pageSection.find(".audio-previous-button").on("click", function ()
        {
            if (audio.prop("currentTime") > 3 || m_playlist.position() === 0)
            {
                audio.prop("currentTime", 0);
            }
            else
            {
                m_playlist.previous();
            }
        });
        pageSection.find(".audio-next-button").on("click", m_playlist.next);


        // setup seek mechanics

        pageSection.find(".audio-progress-bar").on("mousedown", function (event)
        {
            m_isSeeking = true;
        });

        pageSection.find(".audio-progress-bar").on("mousemove", function (event)
        {
            if (m_isSeeking)
            {
                var p = event.offsetX / $(this).width();
                var total = audio.prop("duration") || 0;
                if (total > 0)
                {
                    $(".audio-progress-label").html(formatTime(Math.floor(p * total)) + " / " + formatTime(total));
                    $(".audio-progress-bar > div:nth-child(2)").css("width", (p * 100.0) + "%");
                }
            }
        });

        pageSection.find(".audio-progress-bar").on("mouseup", function (event)
        {
            if (m_isSeeking)
            {
                m_isSeeking = false;
                var p = event.offsetX / $(this).width();
                audio.prop("currentTime", p * audio.prop("duration"));
            }
        });

        pageSection.find(".audio-progress-bar").on("mouseleave", function (event)
        {
            m_isSeeking = false;
        });

        pageSection.find(".audio-progress-bar").on("touchstart", function (event)
        {
            event.preventDefault();
            event.stopPropagation();
            m_isSeeking = true;
            var p = event.originalEvent.touches[0].clientX / $(this).width();
            this.lastTouchPos = p;
        });

        pageSection.find(".audio-progress-bar").on("touchmove", function (event)
        {
            event.preventDefault();
            event.stopPropagation();
            if (m_isSeeking)
            {
                var p = event.originalEvent.touches[0].clientX / $(this).width();
                var total = audio.prop("duration") || 0;
                if (total > 0)
                {
                    $(".audio-progress-label").html(formatTime(Math.floor(p * total)) + " / " + formatTime(total));
                    $(".audio-progress-bar > div:nth-child(2)").css("width", (p * 100.0) + "%");
                }
                this.lastTouchPos = p;
            }
        });

        pageSection.find(".audio-progress-bar").on("touchend", function (event)
        {
            event.preventDefault();
            event.stopPropagation();
            if (m_isSeeking)
            {
                m_isSeeking = false;
                audio.prop("currentTime", this.lastTouchPos * audio.prop("duration"));
            }
        });

        pageSection.find(".audio-progress-bar").on("touchcancel", function (event)
        {
            event.preventDefault();
            event.stopPropagation();
            m_isSeeking = false;
        });


        // setup playlist puller button

        pageSection.find(".audio-playlist-puller").on("click", function ()
        {
            var scrollTarget = 0;
            if ($(document).scrollTop() === 0)
            {
                scrollTarget = $(this).offset().top;
            }
            else
            {
                scrollTarget = 0;
            }

            $("html, body").animate({
                scrollTop: scrollTarget
            }, "slow", function () { });
        });

        var pos = pageSection.find("ul").offset().top;
        console.log("ul offset " + pos);
        console.log("window height: " + $(window).height());

        page.push(function ()
        {
            updatePlayStatus();
            updatePosition();
            updateMetadata();

            // load metadata in playlist
            pageSection.find(".audio-playlist-item").each(function (i, item)
            {
                var playlistKey = $(item).data("playlist-key");
                var playlistIndex = m_playlist.indexOf(playlistKey);
                var playlistUri = m_playlist.itemAt(playlistIndex)[1];

                fetchMetadata(playlistUri, function (uri, data)
                {
                    parseMetadata(uri, data, function (title, artist, pic)
                    {
                        $(item).find("h1").html(sh.escapeHtml(title));
                        $(item).find("h2").html(sh.escapeHtml(artist));
                        if (pic !== "")
                        {
                            $(item).find("div:nth-child(1)").css("background-image", "url(" + pic + ")");
                        }
                    });
                });

                var playlistKey = $(item).data("playlist-key");

                $(item).on("click", function ()
                {
                    var idx = m_playlist.indexOf(playlistKey);
                    m_playlist.goto(idx);
                });

                $(item).find(".audio-playlist-delete-button").on("click", function ()
                {
                    var idx = m_playlist.indexOf(playlistKey);
                    $(item).remove();
                    m_playlist.removeAt(idx);
                });
            });
        });
    }

    /* Plays the given URI.
     */
    function play(uri)
    {
        audio.prop("src", uri);
        audio.trigger("load");
        audio.trigger("play");
        updateMetadata();
        m_statusItem.wakeLock();
    }


    var m_playlist = new Playlist(function (entry)
    {
        if (! m_statusItem)
        {
            m_statusItem = pushStatusItem();
        }

        if (entry)
        {
            play(entry[1]);
        }
        else
        {
            // force-stop buffering
            audio.prop("src", "");
            audio.trigger("load");
            m_statusItem.wakeUnlock();
        }

        updatePlayStatus();
        updatePosition();
        updateBuffering();
        updateMetadata();
    });


    this.add = function (uri)
    {
        m_playlist.add(uri, m_playlist.size() === 0);
    };

    this.enqueue = function (item)
    {
        var uri = $(item).data("meta").uri;
        m_playlist.add(uri, false);
    };

    this.updatePullerState = updatePullerState;

    $("body").append("<audio id='audio-player' style='display: none;'></audio>");
    var audio = $("#audio-player");
    audio.on("pause", updatePlayStatus);
    audio.on("play", updatePlayStatus);
    audio.on("playing", updatePlayStatus);
    audio.on("durationchange", updatePosition);
    audio.on("timeupdate", updatePosition);
    audio.on("progress", updateBuffering);
    audio.on("waiting", updateWaitStatus);
    audio.on("ended", m_playlist.next);

    audio.on("stalled", function ()
    {
        ui.showError("Media data is not available.");
    });
};



var audio;
(function ()
{
    audio = new Audio();

    files.actionsMenu().add(
        sh.element(sh.MenuItem).text("Add to Playlist")
        .visible(
            or(
                files.predicates.mimeTypeSelected("audio/flac"),
                files.predicates.mimeTypeSelected("audio/mp3"),
                files.predicates.mimeTypeSelected("audio/ogg")
            )
        )
        .callback(files.eachSelected(audio.enqueue))
    );

    $(window).scroll(function ()
    {
        audio.updatePullerState();
    });

    mimeRegistry.register("audio/flac", audio.add);
    mimeRegistry.register("audio/mp3", audio.add);
    mimeRegistry.register("audio/ogg", audio.add);
})();
