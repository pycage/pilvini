"use strict";

var shellMedia = {
    videoExtensions: []
};

(function ()
{
    var m_uri = sh.binding("");
    var m_size = sh.binding(0);
    var m_position = sh.binding(0);
    var m_duration = sh.binding(0);
    var m_buffered = sh.binding(null);
    var m_status = sh.binding("paused"); // playing | paused | buffering | stalled
    var m_isFullscreen = sh.binding(false);

    function VideoPopup()
    {
        Object.defineProperties(this, {
            header: { set: setHeader, get: header, enumerable: true },
            footer: { set: setFooter, get: footer, enumerable: true },
            uri: { set: setUri, get: uri, enumerable: true },
            size: { set: setSize, enumerable: true }
        });

        var m_header = null;
        var m_footer = null;
        var m_uri = "";

        var m_item = $(
            sh.tag("div")
            .style("position", "relative")
            .content(
                sh.tag("div")
                .style("background-color", "black")
                .content(
                    sh.tag("video")
                    .style("max-width", "320px")
                    .style("max-height", "240px")
                )
            )
            .content(
                sh.tag("header")
                .style("font-size", "200%")
                .style("top", "0")
            )
            .content(
                sh.tag("footer")
                .style("font-size", "200%")
                .style("bottom", "0")
                .style("min-height", "80px")
                .style("line-height", "80px")
            )
            .html()
        );

        m_item.on("click", function (event)
        {
            event.stopPropagation();
        });

        m_item.find("video")
        .prop("autoplay", true)
        .removeProp("controls")
        .on("canplay", updateSizeConstraints)
        .on("pause", function ()
        {
            m_status.assign("paused");
        })
        .on("play", function ()
        {
            m_status.assign("playing");
        })
        .on("playing", function ()
        {
            m_status.assign("playing");
        })
        .on("waiting", function ()
        {
            m_status.assign("buffering");
        })
        .on("ended", function ()
        {
            m_status.assign("paused");
        })
        .on("stalled", function ()
        {
            m_status.assign("stalled");
        })
        .on("durationchange", function ()
        {
            m_duration.assign(this.duration || 0);
        })
        .on("timeupdate", function ()
        {
            m_position.assign(this.currentTime || 0);
        })
        .on("progress", function ()
        {
            m_buffered.assign(this.buffered);
        })
        .on("click", function (event)
        {
            if (m_item.find("footer").css("visibility") === "visible")
            {
                slideOut();
            }
            else
            {
                slideIn();
            }
        })
        .on("dblclick", toggleFullscreen);


        /* Updates the video size constraints.
        */
        function updateSizeConstraints()
        {
            var video = m_item.find("video");
            var w = video.width();
            var h = video.height();
            var ratio = w / h;

            var margin = sh.fullscreenStatus() ? 0 : 80;
            var viewWidth = $(window).width() - margin;
            var viewHeight = $(window).height() - margin;

            var w2 = viewHeight * ratio;
            var h2 = viewHeight;
            if (w2 > viewWidth)
            {
                w2 = viewWidth;
                h2 = viewWidth / ratio;
            }

            video
            .css("min-width", w2 + "px")
            .css("min-height", h2 + "px")
            .css("max-width", viewWidth + "px")
            .css("max-height", viewHeight + "px")
            .css("margin", sh.fullscreenStatus() ? "0" : "0.2rem");

            if ((w2 < viewWidth || h2 < viewHeight) && sh.fullscreenStatus())
            {
                video.css("transform",
                        "translateX(" + ((viewWidth - w2) / 2) + "px) " +
                        "translateY(" + ((viewHeight - h2) / 2)  + "px)");
            }
            else
            {
                video.css("transform", "initial");
            }
        }

        function slideIn()
        {            
            m_item.find("header")
            .css("visibility", "visible")
            .animate({
                top: "0px"
            }, 350, function ()
            {
    
            });
    
            m_item.find("footer")
            .css("visibility", "visible")
            .animate({
                bottom: "0px"
            }, 350, function ()
            {
    
            });
        }
    
        function slideOut()
        {
            var headerHeight = m_item.find("header").height();
            var footerHeight = m_item.find("footer").height();

            m_item.find("header").animate({
                top: "-" + headerHeight + "px"
            }, 350, function ()
            {
                m_item.find("header").css("visibility", "hidden");
            });
    
            m_item.find("footer").animate({
                bottom: "-" + footerHeight + "px"
            }, 350, function ()
            {
                m_item.find("footer").css("visibility", "hidden");
            });
        }

        function toggleFullscreen()
        {    
            if (sh.fullscreenStatus())
            {
                sh.fullscreenExit();
                m_isFullscreen.assign(false);
            }
            else
            {
                sh.fullscreenEnter(m_item);
                m_isFullscreen.assign(true);
            }
            setTimeout(updateSizeConstraints, 300);
        }

        function setHeader(header)
        {
            if (m_header)
            {
                m_header.get().detach();
            }
            m_item.find("header").append(header.get());
            m_header = header;
        }

        function header()
        {
            return m_header;
        }

        function setFooter(footer)
        {
            if (m_footer)
            {
                m_footer.get().detach();
            }
            m_item.find("footer").append(footer.get());
            m_footer = footer;
        }

        function footer()
        {
            return m_footer;
        }

        function setUri(uri)
        {
            console.log("set URI: " + uri);
            m_uri = uri;
            m_item.find("video").prop("src", uri).trigger("load");
        }

        function uri()
        {
            return m_uri;
        }

        function setSize(s)
        {
            if (m_item.find("video").prop("duration") > 0)
            {
                updateSizeConstraints();
            }
        }

        this.get = function ()
        {
            return m_item;
        };

        this.play = function ()
        {
            m_item.find("video").trigger("play");
        };

        this.pause = function ()
        {
            m_item.find("video").trigger("pause");
        };

        this.seek = function (s)
        {
            m_item.find("video").prop("currentTime", s);
        };

        this.fullscreen = function ()
        {
            toggleFullscreen();
        };
    }

    function Header()
    {
        Object.defineProperties(this, {
            title: { set: setTitle, get: title, enumerable: true }
        });

        var m_title = "";
        var m_item = $(
            sh.tag("h1")
            .style("font-size", "1rem")
            .style("position", "absolute")
            .style("margin", "0")
            .style("padding", "0")
            .style("white-space", "nowrap")
            .style("text-overflow", "ellipsis")
            .style("overflow", "hidden")
            .style("left", "0.25em")
            .style("right", "0.25em")
            .html()
        );

        function setTitle(title)
        {
            m_title = title;
            m_item.html(sh.escapeHtml(title));
        }

        function title()
        {
            return m_title;
        }

        this.get = function ()
        {
            return m_item;
        };
    }

    function Footer()
    {
        Object.defineProperties(this, {

        });

        var m_item = $(
            sh.tag("div")
            .html()
        );

        this.get = function ()
        {
            return m_item;
        };

        this.add = function (child)
        {
            m_item.append(child.get());
        };
    }

    function ProgressBar()
    {
        Object.defineProperties(this, {
            position: { set: setPosition, get: position, enumerable: true },
            duration: { set: setDuration, get: duration, enumerable: true },
            ranges: { set: setRanges, get: ranges, enumerable: true },
            onSeeked: { set: setOnSeeked, get: onSeeked, enumerable: true }
        });

        var m_position = 0;
        var m_duration = 0;
        var m_ranges = [];
        var m_onSeeked = null;
        var m_isDragging = false;

        var m_item = $(
            sh.tag("div")
            .style("position", "relative")
            .style("height", "2rem")
            .style("line-height", "2rem")
            .style("background-color", "rgba(0, 0, 0, 0.2)")
            .content(
                sh.tag("div")
                .style("position", "absolute")
                .style("top", "0")
                .style("left", "0")
                .style("width", "100%")
                .style("height", "100%")
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
            .content(
                sh.tag("div")
                .style("position", "absolute")
                .style("top", "0")
                .style("left", "0")
                .style("bottom", "0")
                .style("right", "0")
                .content(
                    sh.tag("h1")
                    .style("text-align", "center")
                    .style("font-size", "1.5rem")
                )
            )
            .html()
        );

        m_item.on("mousedown", function (event)
        {
            m_isDragging = true;
            var p = Math.max(0, Math.min(1, event.offsetX / $(this).width()));
            m_item.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
            draggingCallback(p);
        });
        m_item.on("mousemove", function (event)
        {
            if (m_isDragging)
            {
                var p = Math.max(0, Math.min(1, event.offsetX / $(this).width()));
                m_item.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
                draggingCallback(p);
            }
        });
        m_item.on("mouseup", function (event)
        {
            if (m_isDragging)
            {
                m_isDragging = false;
                var p = event.offsetX / $(this).width();
                if (m_onSeeked)
                {
                    m_onSeeked(p);
                }
            }
        });
        m_item.on("mouseleave", function (event)
        {
            m_isDragging = false;
        });

        m_item.on("touchstart", function (event)
        {
            event.preventDefault();
            m_isDragging = true;
            var x = event.originalEvent.touches[0].clientX - $(this).offset().left;
            var p = Math.max(0, Math.min(1, x / $(this).width()));
            m_item.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
            this.lastTouchPos = p;
            draggingCallback(p);
        });
        m_item.on("touchmove", function (event)
        {
            event.preventDefault();
            if (m_isDragging)
            {
                var x = event.originalEvent.touches[0].clientX - $(this).offset().left;
                var p = Math.max(0, Math.min(1, x / $(this).width()));
                m_item.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
                this.lastTouchPos = p;
                draggingCallback(p);
            }
        });
        m_item.on("touchend", function (event)
        {
            event.preventDefault();
            if (m_isDragging)
            {
                m_isDragging = false;
                if (m_onSeeked)
                {
                    m_onSeeked(this.lastTouchPos);
                }
            }
        });
        m_item.on("touchcancel", function (event)
        {
            event.preventDefault();
            m_isDragging = false;
        });


        function formatTime(seconds)
        {
            var t = seconds;
            var hsecs = Math.floor(t * 100) % 100;
            var secs = Math.floor(t) % 60;
            t /= 60;
            var minutes = Math.floor(t) % 60;
            t /= 60;
            var hours = Math.floor(t);
    
            var h = hours.toFixed(0);
            var m = minutes.toFixed(0);
            var s = secs.toFixed(0);
            var hs = hsecs.toFixed(0);
    
            if (h.length === 1) { h = "0" + h; }
            if (m.length === 1) { m = "0" + m; }
            if (s.length === 1) { s = "0" + s; }
            if (hs.length === 1) { hs = "0" + hs; }
    
            return (hours > 0 ? h + ":" : "") + m + ":" + s + "." + hs;
        }

        function draggingCallback(p)
        {
            if (m_duration > 0)
            {
                var pos = p * m_duration;
                m_item.find("> div:nth-child(2)").last().css("width", (pos / m_duration * 100.0) + "%");
                m_item.find("h1").html(formatTime(pos) + " / " + formatTime(m_duration));
            }
        }

        function setPosition(pos)
        {
            m_position = pos;
            if (m_duration > 0 && ! m_isDragging)
            {
                m_item.find("> div:nth-child(2)").last().css("width", (m_position / m_duration * 100.0) + "%");
                m_item.find("h1").html(formatTime(m_position) + " / " + formatTime(m_duration));
            }
        }

        function position()
        {
            return m_position;
        }

        function setDuration(duration)
        {
            m_duration = duration;
            if (m_duration > 0 && ! m_isDragging)
            {
                m_item.find("> div:nth-child(2)").last().css("width", (m_position / m_duration * 100.0) + "%");
                m_item.find("h1").html(formatTime(m_position) + " / " + formatTime(m_duration));
            }
        }

        function duration()
        {
            return m_duration;
        }

        function setRanges(ranges)
        {
            m_ranges = ranges;

            if (m_duration === 0)
            {
                return;
            }

            m_item.find("> div:nth-child(1)").each(function (i)
            {
                var box = $(this);
                while (box.find("> div").length > ranges.length)
                {
                    box.find("> div").last().remove();
                }
                while (box.find("> div").length < ranges.length)
                {
                    box.append(
                        sh.tag("div")
                        .style("position", "absolute")
                        .style("background-color", "rgba(255, 0, 0, 0.3)")
                        .style("top", "0")
                        .style("bottom", "0")
                        .style("pointer-events", "none")
                        .style("touch-action", "none")
                        .html()
                    );
                }
    
                var gauges = box.find("> div");
                for (var i = 0; i < ranges.length; ++i)
                {
                    console.log("range " + i + ": " + ranges[i][0] + " - " + ranges[i][1]);
                    gauges.eq(i)
                    .css("left", (ranges[i][0] / m_duration * 100) + "%")
                    .css("right", (100 - ranges[i][1] / m_duration * 100) + "%");
                }
            });
        }

        function ranges()
        {
            return m_ranges;
        }

        function setOnSeeked(onSeeked)
        {
            m_onSeeked = onSeeked;
        }

        function onSeeked()
        {
            return m_onSeeked;
        }

        this.get = function ()
        {
            return m_item;
        };
    }



    function openVideo(uri)
    {
        var popup = sh.element(sh.Popup)
        .add(
            sh.element(VideoPopup).id("video")
            .header(
                sh.element(Header)
                .title(sh.predicate([m_uri], function ()
                {
                    var uri = m_uri.value();
                    var idx = uri.lastIndexOf("/");
                    return decodeURIComponent(idx !== -1 ? uri.substr(idx + 1)
                                                         : uri);
                }))
            )
            .footer(
                sh.element(Footer)
                .add(
                    sh.element(ProgressBar)
                    .position(m_position)
                    .duration(m_duration)
                    .ranges(sh.predicate([m_buffered], function ()
                    {
                        var ranges = [];
                        var buffered = m_buffered.value();
                        if (! buffered)
                        {
                            return [];
                        }
                        for (var i = 0; i < buffered.length; ++i)
                        {
                            ranges.push([buffered.start(i), buffered.end(i)]);
                        }
                        return ranges;
                    }))
                    .onSeeked(function (p)
                    {
                        popup.find("video").seek_(p * m_duration.value());
                    })
                )
                .add(
                    sh.element(shellMedia.VideoEditor).id("editToolbar")
                    .visible(false)
                    .uri(m_uri)
                    .position(m_position)
                    .duration(m_duration)
                    .onSeeked(function (seconds)
                    {
                        popup.find("video").seek_(seconds);
                    })
                )
                .add(
                    sh.element(sh.Toolbar)
                    .add(
                        sh.element(sh.IconButton)
                        .icon(sh.predicate([m_status], function ()
                        {
                            switch (m_status.value())
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
                            if (m_status.value() === "playing")
                            {
                                popup.find("video").pause_();
                            }
                            else
                            {
                                popup.find("video").play_();
                            }
                        })
                    )
                    .add(
                        sh.element(sh.IconButton)
                        .icon("sh-icon-media-rwd10")
                        .onClicked(function ()
                        {
                            popup.find("video")
                            .seek_(m_position.value() > 10 ? m_position.value() - 10
                                                           : 0);
                        })
                    )
                    .add(
                        sh.element(sh.IconButton)
                        .icon("sh-icon-media-fwd30")
                        .onClicked(function ()
                        {
                            popup.find("video")
                            .seek_(m_position.value() + 30 < m_duration.value() ? m_position.value() + 30
                                                                                : m_duration.value());
                        })
                    )
                    .right(
                        sh.element(sh.IconButton)
                        .icon("sh-icon-media-cut")
                        .onClicked(function ()
                        {
                            var editToolbar = popup.find("editToolbar").get();
                            editToolbar.visible = ! editToolbar.visible;
                        })
                    )
                    .right(
                        sh.element(sh.IconButton)
                        .icon(sh.predicate([m_isFullscreen], function ()
                        {
                            return m_isFullscreen.value() ? "sh-icon-unfullscreen"
                                                          : "sh-icon-fullscreen"
                        }))
                        .onClicked(function ()
                        {
                            popup.find("video").fullscreen_();
                        })
                    )
                )
            )
            .uri(m_uri)
            .size(m_size)
        );

        popup.get().get().one("sh-closed", function ()
        {
            // force-stop buffering
            m_uri.assign("");
            popup.dispose();
            popup = null;
        });

        popup.show_();

        m_uri.assign(uri);
    }



    $(window).resize(function ()
    {
        m_size.assign($(window).width() * $(window).height());
    });

    mimeRegistry.register("video/mp4", openVideo);
    mimeRegistry.register("video/webm", openVideo);

    importJs(["/::res/shell-media/video-editor.js"], function () { });
})();
