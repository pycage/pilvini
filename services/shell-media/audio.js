"use strict";

(function ()
{
    var m_metaDataCache = { };

    var m_statusItem = null;
    var m_playerItem = null;
    var m_player = null;
    var m_playlist = null;

    var m_properties = {
        status: sh.binding("paused"), // playing | paused | buffering | stalled
        position: sh.binding(0),
        total: sh.binding(0),
        title: sh.binding(""),
        artist: sh.binding(""),
        cover: sh.binding("")
    };

    /* Formats the given time in seconds to look pretty.
     */
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

    /* Class representing a playlist.
     */
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

    /* Class representing the status item content.
     */
    var StatusContent = function ()
    {
        Object.defineProperties(this, {
            title: { set: setTitle, get: title, enumerable: true },
            artist: { set: setArtist, get: artist, enumerable: true },
            cover: { set: setCover, get: cover, enumerable: true }
        });

        var m_title = "";
        var m_artist = "";
        var m_cover = "";

        var m_item = $(
            sh.tag("div")
            .style("display", "flex")
            .content(
                sh.tag("div")
                .style("width", "64px")
                .style("height", "64px")
                .style("background-repeat", "no-repeat")
                .style("background-position", "50% 50%")
                .style("background-size", "cover")
            )
            .content(
                sh.tag("div")
                .style("flex-grow", "1")
                .content(
                    sh.tag("h1")
                )
                .content(
                    sh.tag("h2")
                )
            )
            .html()
        );

        function setTitle(title)
        {
            m_item.find("h1").html(sh.escapeHtml(title));
            m_title = title;
        }

        function title()
        {
            return m_title;
        }

        function setArtist(artist)
        {
            m_item.find("h2").html(sh.escapeHtml(artist));
            m_artist = artist;
        }

        function artist()
        {
            return m_artist;
        }

        function setCover(cover)
        {
            m_item.find("> div:nth-child(1)").css("background-image", "url(" + cover + ")");
            m_cover = cover;
        }

        function cover()
        {
            return m_cover;
        }

        this.get = function ()
        {
            return m_item;
        };
    };

    /* Class representing the cover image.
     */
    var CoverImage = function ()
    {
        Object.defineProperties(this, {
            source: { set: setSource, get: source, enumerable: true }
        });

        var m_source = "";
        var m_image = $(
            sh.tag("img")
            .style("width", "100%")
            .html()
        );

        function setSource(src)
        {
            m_image.prop("src", src);
            m_source = src;
        }

        function source()
        {
            return m_source;
        }

        this.get = function ()
        {
            return m_image;
        };
    };

    /* Class representing a WakeLock holder to not get playback killed on
     * Android devices.
     */
    var WakeLocker = function ()
    {
        Object.defineProperties(this, {
            locked: { set: setLocked, get: locked, enumerable: true }
        });

        var m_isLocked = false;
        var m_locker = $(
            sh.tag("video")
            .style("display", "none")
            .attr("muted", "true")
            .attr("loop", "true")
            .attr("src", "/::res/webshell/extensions/audio/null.mp4")
            .html()
        );

        function setLocked(value)
        {
            if (value)
            {
                m_locker.trigger("play");
            }
            else
            {
                m_locker.trigger("pause");
            }
            m_isLocked = value;
        }

        function locked()
        {
            return m_isLocked;
        }

        this.get = function ()
        {
            return m_locker;
        };
    }

    /* Class representing the player controls.
     */
    var PlayerControls = function ()
    {
        Object.defineProperties(this, {
            position: { set: setPosition, get: position, enumerable: true },
            total: { set: setTotal, get: total, enumerable: true },
            status: { set: setStatus, get: status, enumerable: true },
            onSeeked: { set: setOnSeeked, get: onSeeked, enumerable: true },
            onPreviousClicked: { set: setOnPreviousClicked, get: onPreviousClicked, enumerable: true },
            onNextClicked: { set: setOnNextClicked, get: onNextClicked, enumerable: true },
            onPlayClicked: { set: setOnPlayClicked, get: onPlayClicked, enumerable: true }
        });

        var m_isSeeking = false;
        var m_position = 0;
        var m_total = 0;
        var m_status = "paused";
        var m_onSeeked = null;
        var m_onPreviousClicked = null;
        var m_onNextClicked = null;
        var m_onPlayClicked = null;

        var m_controls = $(
            sh.tag("footer").class("sh-dropshadow")
            .style("height", "160px")
            .style("text-align", "center")
            .content(
                sh.tag("div")
                .style("position", "absolute")
                .style("top", "0")
                .style("left", "0")
                .style("right", "0")
                .style("height", "16px")
                .content(
                    sh.tag("div")
                    .style("position", "absolute")
                    .style("top", "0")
                    .style("left", "0")
                    .style("width", "0%")
                    .style("height", "100%")
                    .style("background-color", "red")
                )
                .content(
                    sh.tag("div")
                    .style("position", "absolute")
                    .style("top", "0")
                    .style("left", "0")
                    .style("width", "0%")
                    .style("height", "100%")
                    .style("background-color", "var(--color-highlight-background)")
                )
            )
            .content(
                sh.tag("div")
                .style("position", "absolute")
                .style("top", "16px")
                .style("left", "0")
                .style("right", "0")
                .content("0:42 / 1:23")
            )
            .content(
                sh.tag("div")
                .style("position", "relative")
                .style("margin-top", "48px")
                .style("font-size", "80px")
                .content(
                    sh.tag("span").class("sh-fw-icon sh-icon-media-play-circle")
                )
                .content(
                    sh.tag("span").class("sh-left sh-fw-icon sh-icon-media-previous")
                )
                .content(
                    sh.tag("span").class("sh-right sh-fw-icon sh-icon-media-next")
                )
            )
            .html()
        );

        var m_progressBar = m_controls.find("> div:nth-child(1)");
        var m_progressLabel = m_controls.find("> div:nth-child(2)");
        var m_buttonBox = m_controls.find("> div:nth-child(3)");

        m_buttonBox.find("> span:nth-child(2)")
        .on("click", function ()
        {
            if (m_onPreviousClicked)
            {
                m_onPreviousClicked();
            }
        });

        m_buttonBox.find("> span:nth-child(3)")
        .on("click", function ()
        {
            if (m_onNextClicked)
            {
                m_onNextClicked();
            }
        });

        m_buttonBox.find("> span:nth-child(1)")
        .on("click", function ()
        {
            if (m_onPlayClicked)
            {
                m_onPlayClicked();
            }
        });



        // setup seek mechanics

        m_progressBar.on("mousedown", function (event)
        {
            m_isSeeking = true;
        });

        m_progressBar.on("mousemove", function (event)
        {
            if (m_isSeeking)
            {
                var p = event.offsetX / $(this).width();
                if (m_total > 0)
                {
                    m_progressLabel.html(formatTime(Math.floor(p * m_total)) + " / " + formatTime(m_total));
                    m_progressBar.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
                }
            }
        });

        m_progressBar.on("mouseup", function (event)
        {
            if (m_isSeeking)
            {
                m_isSeeking = false;
                var p = event.offsetX / $(this).width();
                if (m_onSeeked)
                {
                    m_onSeeked(p * m_total);
                }
            }
        });

        m_progressBar.on("mouseleave", function (event)
        {
            m_isSeeking = false;
        });

        m_progressBar.on("touchstart", function (event)
        {
            event.preventDefault();
            event.stopPropagation();
            m_isSeeking = true;
            var p = event.originalEvent.touches[0].clientX / $(this).width();
            this.lastTouchPos = p;
        });

        m_progressBar.on("touchmove", function (event)
        {
            event.preventDefault();
            event.stopPropagation();
            if (m_isSeeking)
            {
                var p = event.originalEvent.touches[0].clientX / $(this).width();
                if (m_total > 0)
                {
                    m_progressLabel.html(formatTime(Math.floor(p * m_total)) + " / " + formatTime(m_total));
                    m_progressBar.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
                }
                this.lastTouchPos = p;
            }
        });

        m_progressBar.on("touchend", function (event)
        {
            event.preventDefault();
            event.stopPropagation();
            if (m_isSeeking)
            {
                m_isSeeking = false;
                if (m_onSeeked)
                {
                    m_onSeeked(this.lastTouchPos * m_total);
                }
            }
        });

        m_progressBar.on("touchcancel", function (event)
        {
            event.preventDefault();
            event.stopPropagation();
            m_isSeeking = false;
        });


        function setPosition(pos)
        {
            if (m_total > 0 && ! m_isSeeking)
            {
                var p = 100.0 * pos / m_total;
                m_progressBar.find("> div:nth-child(2)").css("width", p + "%");
                m_progressLabel.html(formatTime(m_position) + " / " + formatTime(m_total));
            }
            m_position = pos;
        }

        function position()
        {
            return m_position;
        }

        function setTotal(total)
        {
            m_total = total;
        }

        function total()
        {
            return m_total;
        }

        function setStatus(status)
        {
            var btn = m_buttonBox.find("> span:nth-child(1)");

            switch (m_status)
            {
            case "playing":
                btn.removeClass("sh-icon-media-pause-circle");
                break;
            case "paused":
                btn.removeClass("sh-icon-media-play-circle");
                break;
            case "buffering":
                btn.removeClass("sh-busy-indicator");
                break;
            case "stalled":
                btn.removeClass("sh-busy-indicator");
                break;
            }

            switch (status)
            {
            case "playing":
                btn.addClass("sh-icon-media-pause-circle");
                break;
            case "paused":
                btn.addClass("sh-icon-media-play-circle");
                break;
            case "buffering":
                btn.addClass("sh-busy-indicator");
                break;
            case "stalled":
                btn.addClass("sh-busy-indicator");
                break;
            }

            m_status = status;
        }

        function status()
        {
            return m_status;
        }

        function setOnSeeked(callback)
        {
            m_onSeeked = callback;
        }

        function onSeeked()
        {
            return m_onSeeked;
        }

        function setOnPreviousClicked(callback)
        {
            m_onPreviousClicked = callback;
        }

        function onPreviousClicked()
        {
            return m_onPreviousClicked;
        }

        function setOnNextClicked(callback)
        {
            m_onNextClicked = callback;
        }

        function onNextClicked()
        {
            return m_onNextClicked;
        }

        function setOnPlayClicked(callback)
        {
            m_onPlayClicked = callback;
        }

        function onPlayClicked()
        {
            return m_onPlayClicked;
        }

        this.get = function ()
        {
            return m_controls;
        };
    };

    /* Fetches metadata for the given track.
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

    /* Filters the current file selection for audio files.
     */
    function audioSelection()
    {
        return files.properties().selection.value().filter(function (idx)
        {
            var meta = files.properties().files.value()[idx];
            return meta.mimeType === "audio/flac" ||
                   meta.mimeType === "audio/mp3" ||
                   meta.mimeType === "audio/ogg";
        });
    }

    /* Adds the given file to the playlist.
     */
    function addToPlaylist(uri)
    {
        m_playlist.add(uri, m_playlist.size() === 0);
    }

    /* Creates the player status item.
     */
    function createPlayerItem()
    {
        return sh.element(ui.StatusItem)
        .text(sh.predicate([m_properties.position, m_properties.total], function ()
        {
            return formatTime(m_properties.position.value()) + " / " + formatTime(m_properties.total.value());
        }))
        .progress(sh.predicate([m_properties.position, m_properties.total], function ()
        {
            if (m_properties.total.value() > 0)
            {
                return 100.0 * m_properties.position.value() / m_properties.total.value();
            }
        }))
        .onClicked(pushPlayerPage)
        .left(
            sh.element(sh.IconButton)
            .icon(sh.predicate([m_properties.status], function ()
            {
                switch (m_properties.status.value())
                {
                case "playing":
                    return "sh-icon-media-pause";
                case "paused":
                    return "sh-icon-media-play";
                default:
                    return "sh-busy-indicator";
                }
            }))
            .onClicked(function ()
            {
                if (m_player.prop("paused"))
                {
                    m_player.trigger("play");
                }
                else
                {
                    m_player.trigger("pause");
                }
            })
        )
        .left(
            sh.element(sh.IconButton).icon("sh-icon-media-next")
            .onClicked(function ()
            {
                m_playlist.next();
            })
        )
        .right(
            sh.element(sh.IconButton).icon("sh-icon-close")
            .onClicked(function ()
            {
                m_playlist.clear();
            })
        )
        .add(
            sh.element(StatusContent)
            .title(m_properties.title)
            .artist(m_properties.artist)
            .cover(m_properties.cover)
        )
        .get();
    }

    /* Creates and pushes the player page.
     */
    function pushPlayerPage()
    {
        var page = sh.element(sh.NSPage)
        .onSwipeBack(function ()
        {
            page.pop_();
        })
        .header(
            sh.element(sh.PageHeader)
            .title(m_properties.title)
            .subtitle(m_properties.artist)
            .left(
                sh.element(sh.IconButton).icon("sh-icon-back")
                .onClicked(function ()
                {
                    page.pop_();
                })
            )
        )
        .footer(
            sh.element(PlayerControls)
            .position(m_properties.position)
            .total(m_properties.total)
            .status(m_properties.status)
            .onSeeked(function (pos)
            {
                m_player.prop("currentTime", pos);
            })
            .onPreviousClicked(m_playlist.previous)
            .onNextClicked(m_playlist.next)
            .onPlayClicked(function ()
            {
                if (m_player.prop("paused"))
                {
                    m_player.trigger("play");
                }
                else
                {
                    m_player.trigger("pause");
                }
            })
        )
        .add(
            sh.element(WakeLocker)
            .locked(sh.predicate([m_properties.status], function ()
            {
                return m_properties.status.value() === "playing";
            }))
        )
        .add(
            sh.element(CoverImage).source(m_properties.cover)
        )
        .add(
            sh.element(sh.ListView).id("listview")
        );

        page.push_(function ()
        {
            for (var i = 0; i < m_playlist.size(); ++i)
            {
                var item = m_playlist.itemAt(i);

                var trackTitle = sh.binding(item[1]);
                var trackArtist = sh.binding("");
                var trackCover = sh.binding("");

                // closure
                (function (trackNo, trackTitle, trackArtist, trackCover)
                {
                    fetchMetadata(item[1], function (uri, data)
                    {
                        parseMetadata(uri, data, function (title, artist, pic)
                        {
                            trackTitle.assign(title);
                            trackArtist.assign(artist);
                            trackCover.assign(pic);
                        });
                    });

                    page.find("listview").add(
                        sh.element(sh.ListItem).id("listitem-" + trackNo)
                        .title(trackTitle)
                        .subtitle(trackArtist)
                        .icon(trackCover)
                        .fillMode("cover")
                        .onClicked(function ()
                        {
                            m_playlist.goto(trackNo);
                        })
                        .action(["sh-icon-close", function ()
                        {
                            m_playlist.removeAt(trackNo);
                            page.find("listitem-" + trackNo).get().get().remove();
                        }])
                    );
                }) (i, trackTitle, trackArtist, trackCover);
            }
        });
    }

    // setup selection watcher

    files.properties().selection.watch(function ()
    {
        var selection = audioSelection();

        if (selection.length > 0 && ! m_statusItem)
        {
            m_statusItem = sh.element(ui.StatusItem)
            .text(sh.predicate([files.properties().selection], function ()
            {
                return "Add " + audioSelection().length + " audio files to playlist";
            }))
            .left(
                sh.element(sh.IconButton).icon("sh-icon-media-add-to-playlist")
                .onClicked(function ()
                {
                    audioSelection()
                    .map(function (idx)
                    {
                        return files.properties().files.value()[idx].uri;
                    })
                    .forEach(addToPlaylist);
                    files.properties().selection.assign([]);
                })
            );

            files.pushStatus(m_statusItem.get());
        }
        else if (selection.length === 0 && m_statusItem)
        {
            files.popStatus(m_statusItem.get());
            m_statusItem = null;
        }
    });


    // setup audio player

    var m_player = $(
        sh.tag("audio").style("display", "none")
        .html()
    );

    m_player.on("pause", function ()
    {
        m_properties.status.assign("paused");
    });
    m_player.on("play", function ()
    {
        m_properties.status.assign("playing");
    });
    m_player.on("playing", function ()
    {
        m_properties.status.assign("playing");
    });
    m_player.on("durationchange", function ()
    {
        m_properties.total.assign(m_player.prop("duration"));
    });
    m_player.on("timeupdate", function ()
    {
        m_properties.position.assign(m_player.prop("currentTime"));
    });
    m_player.on("progress", function () { });
    m_player.on("waiting", function ()
    {
        m_properties.status.assign("buffering");
    });
    m_player.on("ended", function ()
    {
        m_properties.status.assign("paused");
        m_playlist.next();
    });
    m_player.on("stalled", function ()
    {
        m_properties.status.assign("stalled");
    });


    // setup playlist

    m_playlist = new Playlist(function (entry)
    {       
        if (entry)
        {
            if (! m_playerItem)
            {
                m_playerItem = createPlayerItem();
                files.pushStatus(m_playerItem);
            }

            // play
            m_player.prop("src", entry[1]);
            m_player.trigger("load");
            m_player.trigger("play");

            fetchMetadata(entry[1], function (uri, data)
            {
                parseMetadata(uri, data, function (title, artist, pic)
                {
                    m_properties.title.assign(title);
                    m_properties.artist.assign(artist);                   
                    m_properties.cover.assign(pic);
                });
            });
        }
        else
        {
            if (m_playerItem)
            {
                files.popStatus(m_playerItem);
                m_playerItem = null;
            }

            // force-stop buffering
            m_player.prop("src", "");
            m_player.trigger("load");
        }
    });


    mimeRegistry.register("audio/flac", addToPlaylist);
    mimeRegistry.register("audio/mp3", addToPlaylist);
    mimeRegistry.register("audio/ogg", addToPlaylist);
})();
