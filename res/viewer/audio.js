var Audio = function ()
{
    var that = this;
    var m_haveFooter = false;
    var m_isSeeking = false;

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
            callback(uri, m_metaDataCache[uri]);
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
            showError("Failed to retrieve tags: " + err);
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

        //getTitleLabel().html(escapeHtml(title));
        //getArtistLabel().html(escapeHtml(artist));
        var pic = "";
        if (cover)
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
            //getCoverImage().css("background-image", "url(" + pic + ")");
        }
        else
        {
            //getCoverImage().css("background-image", "");
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
            $(".audio-progress-bar > div").css("width", (pos / total * 100.0) + "%");
        }
    }

    /* Updates the play status.
     */
    function updatePlayStatus()
    {
        if (audio.prop("paused"))
        {
            $(".audio-play-button").removeClass("sh-icon-media-pause-circle").addClass("sh-icon-media-play-circle");
        }
        else
        {
            $(".audio-play-button").removeClass("sh-icon-media-play-circle").addClass("sh-icon-media-pause-circle");
        }

        $(".audio-playlist-indicator").css("visibility", "hidden");
        $(".audio-playlist-indicator").eq(m_playlist.position()).css("visibility", "visible");
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
                $(".audio-title").html(escapeHtml(title));
                $(".audio-artist").html(escapeHtml(artist));
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

    /* Updates the background dim.
     */
    function updateBackgroundDim()
    {
        if (m_playlist.size() > 0 && mayUseFixedBackground())
        {
            var p = $(window).scrollTop() / ($(document).height() - $(window).height());
            $(".audio-background-dim").css("background-color", "rgba(0, 0, 0, " + (0.4 + p * 0.5) + ")");
        }
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

    /* Opens the player footer.
     */
    function openFooter()
    {
        m_haveFooter = true;
        sh.set_footer("main-page", 80);
    
        var t = tag("div").class("sh-theme-dark")
                .content(
                    tag("div").class("sh-left audio-cover")
                    .style("width", "80px")
                    .style("background-size", "80px 80px")
                    .style("background-repeat", "no-repeat")
                    .style("text-align", "center")
                    .style("font-size", "200%")
                    .style("line-height", "80px")
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-media-play-circle audio-play-button")
                        .style("color", "white")
                        .style("text-shadow", "#000 0px 0px 1px")
                    )
                )
                .content(
                    tag("div").class("audio-progress-bar")
                    .style("position", "absolute")
                    .style("top", "0")
                    .style("left", "80px")
                    .style("right", "42px")
                    .style("height", "4px")
                    .content(
                        tag("div")
                        .style("position", "absolute")
                        .style("top", "0")
                        .style("left", "0")
                        .style("width", "0%")
                        .style("height", "4px")
                        .style("background-color", "var(--color-primary)")
                    )
                )
                .content(
                    tag("div")
                    .style("margin-left", "80px")
                    .style("margin-right", "42px")
                    .style("margin-top", "4px")
                    .style("padding-top", "1em")
                    .style("padding-left", "0.5em")
                    .style("text-align", "left")
                    .content(
                        tag("h1").class("audio-title")
                        .style("line-height", "1.2em")
                        .content("-")
                    )
                    .content(
                        tag("h2").class("sh-font-small audio-title")
                        .style("line-height", "1.2em")
                        .content("-")
                    )
                )
                .content(
                    tag("div").class("sh-right audio-close-button")
                    .style("width", "42px")
                    .style("text-align", "center")
                    .style("border-left", "solid 1px var(--color-border)")
                    .style("line-height", "80px")
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-close")
                    )
                );

        var footer = $("#main-page > footer");
       
        footer.html(t.html());
        footer.addClass("sh-inverse");

        footer.find("> div > div:nth-child(3)").on("click", function ()
        {
            openPage();
        });

        footer.find(".audio-play-button").on("click", function ()
        {
            if (audio.prop("paused"))
            {
                audio.trigger("play");
            }
            else
            {
                audio.trigger("pause");
            }
        });

        footer.find(".audio-close-button").on("click", function ()
        {
            m_playlist.clear();
        });

    }

    /* Closes the player footer.
     */
    function closeFooter()
    {
        m_haveFooter = false;
        $("#main-page > footer").html("");
        sh.set_footer("main-page", 0);
    }

    /* Creates the playlist UI.
     */
    function makePlaylistUi()
    {
        var t = tag("ul").class("sh-listview")
                .style("padding-top", "3rem")
                .style("text-align", "left")
        for (var i = 0; i < m_playlist.size(); ++i)
        {
            t.content(
                tag("li").class("audio-playlist-item")
                .data("playlist-key", m_playlist.itemAt(i)[0])
                .style("height", "80px")
                .style("background-color", "transparent")
                //.style("color", "#fff")
                .on("click", "")
                .content(
                    tag("div").class("sh-left")
                    .style("width", "80px")
                    .style("height", "80px")
                    .style("background-size", "cover")
                    .style("background-color", "#666")
                )
                .content(
                    tag("div").class("sh-left")
                    .style("margin-left", "80px")
                    .style("padding-left", "1rem")
                    .style("line-height", "80px")
                    .style("font-size", "200%")
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-media-play audio-playlist-indicator")
                        .style("visibility", "hidden")
                    )
                )
                .content(
                    tag("h1").content("-")
                    .style("margin-left", "80px")
                    .style("margin-right", "42px")
                    .style("padding-top", "1rem")
                    .style("padding-left" ,"3rem")
                )
                .content(
                    tag("h2").content("-")
                    .style("margin-left", "80px")
                    .style("margin-right", "42px")
                    .style("padding-left" ,"3rem")
                )
                .content(
                    tag("div").class("sh-right audio-playlist-delete-button")
                    .style("width", "42px")
                    .style("text-align", "center")
                    .style("border-left", "solid 1px var(--color-border)")
                    .style("line-height", "80px")
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-close")
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
        var t = tag("div").class("sh-page sh-page-fullscreen sh-theme-dark")
                .content(
                    tag("span").class("sh-left sh-fw-icon sh-icon-back")
                    .style("position", "fixed")
                    .style("height", "1em")
                    .on("click", "sh.pop();")
                )
                .content(
                    tag("section").class("audio-cover audio-background-dim")
                    .style("background-size", "cover")
                    .style("background-position", "50% 0%")
                    .style("background-attachment", mayUseFixedBackground() ? "fixed" : "scroll")
                    .style("background-blend-mode", "darken")
                    .style("background-color", "rgba(0, 0, 0, .80)")
                    .style("text-align", "center")
                    .style("text-shadow", "#000 0px 0px 1px")
                    .content(
                        tag("div").class("audio-scroll-gap")
                        .style("display", "flex")
                        .style("align-items", "center")
                        .style("justify-content", "center")
                        .style("height", "0")
                        .content(
                            tag("span").class("sh-fw-icon sh-icon-media-play-circle audio-play-button")
                            .style("font-size", "16vw")
                        )
                    )
                    /*
                    .content(
                        tag("div").class("audio-cover")
                        .style("display", "inline-block")
                        .style("background-size", "cover")
                        .style("width", "16rem")
                        .style("height", "16rem")
                    )
                    */
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-move-up audio-playlist-puller")
                        .style("font-size", "200%")
                    )
                    .content(
                        tag("div")
                        .style("position", "relative")
                        .style("margin-bottom", "3rem")
                        .content(
                            tag("span").class("sh-left sh-fw-icon sh-icon-media-previous audio-previous-button")
                            .style("font-size", "12vw")
                        )
                        .content(
                            tag("h1").class("audio-title").content("-")
                            .style("font-size", "6vw")
                            .style("margin-left", "12vw")
                            .style("margin-right", "12vw")
                            .style("line-height", "1.2em")
                        )
                        .content(
                            tag("h2").class("audio-artist").content("-")
                            .style("font-size", "4vw")
                            .style("margin-left", "12vw")
                            .style("margin-right", "12vw")
                            .style("line-height", "1.2em")
                        )
                        .content(
                            tag("span").class("sh-right sh-fw-icon sh-icon-media-next audio-next-button")
                            .style("font-size", "12vw")
                        )
                    )
                    .content(
                        tag("span").class("audio-progress-label")
                        .style("line-height", "1.2em")
                        .content("00:00 / 00:00")
                    )
                    .content(
                        tag("div").class("audio-progress-bar")
                        .style("position", "relative")
                        .style("height", "1rem")
                        .style("margin", "0")
                        .content(
                            tag("div")
                            .style("position", "absolute")
                            .style("top", "0")
                            .style("left", "0")
                            .style("width", "0%")
                            .style("height", "100%")
                            .style("background-color", "var(--color-primary)")
                        )
                    )
                    .content(
                        makePlaylistUi()
                    )
                );

        $("body").append(t.html());
        var page = $(".sh-page").last();
        var pageHeader = page.find("header h1");
        var pageSection = page.find("section");

        sh.onSwipeBack(page, function () { sh.pop(); });

        //page.find(".audio-cover").css("background-image", getCoverImage().css("background-image"));

        //pageSection.css("height", ($(window).height() - pageHeader.height()) + "px");

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
                    $(item).find("h1").html(escapeHtml(title));
                    $(item).find("h2").html(escapeHtml(artist));
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

        pageSection.find(".audio-play-button").on("click", function ()
        {   
            if (audio.prop("paused"))
            {
                audio.trigger("play");
            }
            else
            {
                audio.trigger("pause");
            }
        });

        pageSection.find(".audio-previous-button").on("click", m_playlist.previous);
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
                    $(".audio-progress-bar > div").css("width", (p * 100.0) + "%");
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
            m_isSeeking = true;
            var p = event.originalEvent.touches[0].clientX / $(this).width();
            this.lastTouchPos = p;
        });

        pageSection.find(".audio-progress-bar").on("touchmove", function (event)
        {
            event.preventDefault();
            if (m_isSeeking)
            {
                var p = event.originalEvent.touches[0].clientX / $(this).width();
                var total = audio.prop("duration") || 0;
                if (total > 0)
                {
                    $(".audio-progress-label").html(formatTime(Math.floor(p * total)) + " / " + formatTime(total));
                    $(".audio-progress-bar > div").css("width", (p * 100.0) + "%");
                }
                this.lastTouchPos = p;
            }
        });

        pageSection.find(".audio-progress-bar").on("touchend", function (event)
        {
            event.preventDefault();
            if (m_isSeeking)
            {
                m_isSeeking = false;
                audio.prop("currentTime", this.lastTouchPos * audio.prop("duration"));
            }
        });

        pageSection.find(".audio-progress-bar").on("touchcancel", function (event)
        {
            event.preventDefault();
            m_isSeeking = false;
        });


        // setup playlist puller button

        pageSection.find(".audio-playlist-puller").on("click", function ()
        {
            var scrollTarget = 0;
            if ($(document).scrollTop() === 0)
            {
                scrollTarget = $(this).offset().top;
                //$(document).scrollTop($(this).offset().top);
            }
            else
            {
                scrollTarget = 0;
                //$(document).scrollTop(0);
            }

            $("html, body").animate({
                scrollTop: scrollTarget
            }, "slow", function () { });
        });


        page.on("sh-closed", function ()
        {
            page.remove();
        });

        var pos = pageSection.find("ul").offset().top;
        $(".audio-scroll-gap").height($(window).height() - pos);

        updatePlayStatus();
        updatePosition();
        updateMetadata();
        updateBackgroundDim();                
        
        sh.push(page);
    }

    /* Plays the given URI.
     */
    function play(uri)
    {
        audio.prop("src", uri);
        audio.trigger("load");
        audio.trigger("play");
        updateMetadata();
    }


    var m_playlist = new Playlist(function (entry)
    {
        if (! m_haveFooter)
        {
            openFooter();
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

            closeFooter();
        }
    });


    this.add = function (uri)
    {
        m_playlist.add(uri, m_playlist.size() === 0);
    };

    this.enqueue = function (uri)
    {
        m_playlist.add(uri, false);
    };

    this.restoreUi = function ()
    {
        if (m_haveFooter)
        {
            openFooter();
            updateMetadata();
        }
    };

    this.updateBackgroundDim = updateBackgroundDim;
    this.updatePullerState = updatePullerState;

    $("body").append("<audio id='audio-player' style='display: none;'></audio>");
    var audio = $("#audio-player");
    audio.on("pause", updatePlayStatus);
    audio.on("play", updatePlayStatus);
    audio.on("durationchange", updatePosition);
    audio.on("timeupdate", updatePosition);
    audio.on("ended", m_playlist.next);
};





/*
function viewAudio(href)
{
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


    function getAudioFiles()
    {
        var items = $("#filesbox .filelink");
        var audios = [];

        for (var i = 0; i < items.length; ++i)
        {
            var item = items[i];
            var mimeType = $(item).data("mimetype");
            var url = $(item).data("url");

            if (mimeType.indexOf("audio/") === 0)
            {
                audios.push(url);
            }
        }

        return audios;
    }

}
*/


var audio;
$(document).ready(function ()
{
    audio = new Audio();

    var item = tag("li")
               .on("click", "sh.menu_close(); eachSelected(audio.enqueue)")
               .content("Add to Playlist");
    $("#actions-submenu").append(item.html());

    $("#main-page").on("pilvini-page-replaced", function ()
    {
        audio.restoreUi();
    });

    $(window).scroll(function ()
    {
        audio.updatePullerState();
        audio.updateBackgroundDim();
    });
});