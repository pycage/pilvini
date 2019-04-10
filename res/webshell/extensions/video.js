"use strict";

(function ()
{
    var isSeeking = false;

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

    /* Sets up the progress bar behavior.
     */
    function setupProgressBar(progressBar, draggingCallback, seekCallback)
    {
        var isDragging = false;

        progressBar.on("mousedown", function (event)
        {
            isDragging = true;
            var p = Math.max(0, Math.min(1, event.offsetX / $(this).width()));
            progressBar.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
            draggingCallback(p, true);
        });
        progressBar.on("mousemove", function (event)
        {
            if (isDragging)
            {
                var p = Math.max(0, Math.min(1, event.offsetX / $(this).width()));
                progressBar.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
                draggingCallback(p, true);
            }
        });
        progressBar.on("mouseup", function (event)
        {
            if (isDragging)
            {
                isDragging = false;
                var p = event.offsetX / $(this).width();
                seekCallback(p);
            }
        });
        progressBar.on("mouseleave", function (event)
        {
            isDragging = false;
            draggingCallback(0, false);
        });

        progressBar.on("touchstart", function (event)
        {
            event.preventDefault();
            isDragging = true;
            var x = event.originalEvent.touches[0].clientX - $(this).offset().left;
            var p = Math.max(0, Math.min(1, x / $(this).width()));
            progressBar.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
            this.lastTouchPos = p;
            draggingCallback(p, true);
        });
        progressBar.on("touchmove", function (event)
        {
            event.preventDefault();
            if (isDragging)
            {
                var x = event.originalEvent.touches[0].clientX - $(this).offset().left;
                var p = Math.max(0, Math.min(1, x / $(this).width()));
                progressBar.find("> div:nth-child(2)").css("width", (p * 100.0) + "%");
                this.lastTouchPos = p;
                draggingCallback(p, true);
            }
        });
        progressBar.on("touchend", function (event)
        {
            event.preventDefault();
            if (isDragging)
            {
                isDragging = false;
                seekCallback(this.lastTouchPos);
            }
        });
        progressBar.on("touchcancel", function (event)
        {
            event.preventDefault();
            isDragging = false;
            draggingCallback(0, false);
        });
    }

    /* Updates the current player position.
     */
    function updatePosition()
    {
        if (! isSeeking)
        {
            var video = popup.get().find("video");
            var total = video.prop("duration") || 0;
            var pos = video.prop("currentTime") || 0;
            popup.get().find(".video-progress-label").html(formatTime(pos) + " / " + formatTime(total));
            popup.get().find(".video-progress-bar > div:nth-child(2)").last().css("width", (pos / total * 100.0) + "%");
        }
        updateBuffering();
    }

        /* Updates the current buffering progress.
     */
    function updateBuffering()
    {
        var video = popup.get().find("video");
        var buffered = video.prop("buffered");
        var total = video.prop("duration");

        popup.get().find(".video-progress-bar > div:nth-child(1)").each(function (i)
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

    function slideIn()
    {
        var videoDiv = popup.get().find("> div > div > div");
        videoDiv.find("footer")
        .css("visibility", "visible")
        .animate({
            bottom: "0px"
        }, 350, function ()
        {

        });
    }

    function slideOut()
    {
        var videoDiv = popup.get().find("> div > div > div");
        videoDiv.find("footer").animate({
            bottom: "-80px"
        }, 350, function ()
        {
            videoDiv.find("footer").css("visibility", "hidden");
        });
    }

    function togglePlay()
    {
        var video = popup.get().find("video");
        if (video.prop("paused"))
        {
            video.trigger("play");
        }
        else
        {
            video.trigger("pause");
        }
    }

    function toggleFullscreen()
    {
        var videoDiv = popup.get().find("> div > div > div");

        var fullscreenButton = videoDiv.find(".video-fullscreen-button");
        if (sh.fullscreenStatus())
        {
            sh.fullscreenExit();
            fullscreenButton.removeClass("sh-icon-unfullscreen").addClass("sh-icon-fullscreen");
        }
        else
        {
            sh.fullscreenEnter(videoDiv);
            fullscreenButton.removeClass("sh-icon-fullscreen").addClass("sh-icon-unfullscreen");
        }
        setTimeout(updateSizeConstraints, 300);
    }

    /* Updates the video size constraints.
     */
    function updateSizeConstraints()
    {
        var video = popup.get().find("video");
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
        .css("max-height", viewHeight + "px");

        if (h2 < viewHeight && sh.fullscreenStatus())
        {
            video.css("transform", "translateY(" + ((viewHeight - h2) / 2)  + "px)");
        }
        else
        {
            video.css("transform", "initial");
        }
    }

    function viewVideo(href)
    {  
        popup = new sh.Popup();
    
        popup.get().find("> div").html(
            sh.tag("div")
            .style("position", "relative")
            .content(
                sh.tag("div")
                .style("background-color", "black")
                .content(
                    sh.tag("video")
                )
                .content(
                    sh.tag("footer")
                    .style("background-color", "rgba(1, 1, 1, 0.6)")
                    .style("color", "#fff")
                    .style("font-size", "200%")
                    .style("position", "absolute")
                    .style("margin", "0")
                    .style("left", "0")
                    .style("right", "0")
                    .style("bottom", "-80px")
                    .style("min-height", "80px")
                    .style("line-height", "80px")
                    .style("visibility", "hidden")
                    .content(
                        sh.tag("div").class("video-progress-label")
                        .style("position", "absolute")
                        .style("top", "6px")
                        .style("left", "0")
                        .style("right", "0")
                        .style("text-align", "center")
                        .style("line-height", "1rem")
                        .style("font-size", "1rem")
                        .content("0:00 | 1:23")
                    )
                    .content(
                        sh.tag("span").class("sh-left")
                        .content(
                            sh.tag("span").class("sh-fw-icon sh-icon-media-rwd10 video-rewind-button")
                            .style("padding-left", "0.5em")
                            .style("font-size", "80%")
                        )
                        .content(
                            sh.tag("span").class("sh-fw-icon video-play-button")
                            .style("padding-left", "0.25em")
                        )
                        .content(
                            sh.tag("span").class("sh-fw-icon sh-icon-media-fwd30 video-forward-button")
                            .style("padding-left", "0.25em")
                            .style("font-size", "80%")
                        )
                    )
                    .content(
                        sh.tag("h1")
                        .style("font-size", "1rem")
                        .style("position", "absolute")
                        .style("margin", "0")
                        .style("padding", "0")
                        .style("padding-top", "1em")
                        .style("margin-left", "8em")
                        .style("margin-right", "8em")
                        .style("white-space", "nowrap")
                        .style("text-overflow", "ellipsis")
                        .style("overflow", "hidden")
                        .style("left", "0.25em")
                        .style("right", "0.25em")
                        .style("color", "#fff")
                    )
                    .content(
                        sh.tag("span").class("sh-right sh-fw-icon sh-icon-fullscreen video-fullscreen-button")
                    )
                    .content(
                        sh.tag("div").class("video-progress-bar")
                        .style("position", "absolute")
                        .style("top", "0")
                        .style("left", "0")
                        .style("right", "0")
                        .style("height", "1rem")
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
                            .style("height", "4px")
                            .style("background-color", "var(--color-primary-background)")
                        )
                    )
                    /*
                    .content(
                        sh.tag("img").class("sh-right")
                        .style("width: 100px")
                        .style("height: 80px")
                        )
                    */
                )
            )
            .html()
        );
    
        /*
        // test video capturing capability
        function hack()
        {
            var canvas = document.createElement("canvas");
            canvas.width = 100;
            canvas.height = 80;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(video.get(0), 0, 0, 80, 80);
            videoDiv.find("footer > img").attr("src", canvas.toDataURL());
            setTimeout(hack, 1000);
        }
        setTimeout(hack, 500);
        */
    
        var videoDiv = popup.get().find("> div > div > div");
        var video = popup.get().find("video");
        var btnPlay = popup.get().find(".video-play-button");
    
        video.prop("autoplay", true);
        video.removeProp("controls");
    
        videoDiv.on("click", function (event) { event.stopPropagation(); });
    
        video.on("canplay", updateSizeConstraints);
        video.on("durationchange", updatePosition);
        video.on("timeupdate", updatePosition);
    
        btnPlay.on("click", togglePlay);
    
        videoDiv.find(".video-rewind-button").on("click", function (event)
        {
            var currentTime = video.prop("currentTime");
            if (currentTime - 10 > 0)
            {
                video.prop("currentTime", currentTime - 10);
            }
            else
            {
                video.prop("currentTime", 0);
            }
        });
    
        videoDiv.find(".video-forward-button").on("click", function (event)
        {
            var duration = video.prop("duration");
            var currentTime = video.prop("currentTime");
            if (currentTime + 30 < duration)
            {
                video.prop("currentTime", currentTime + 30);
            }
            else
            {
                video.prop("currentTime", duration);
            }
        });
    
        videoDiv.find(".video-fullscreen-button").on("click", toggleFullscreen);
    
        video.on("click", function (event)
        {     
            if (videoDiv.find("footer").css("visibility") === "visible")
            {
                slideOut();
            }
            else
            {
                slideIn();
            }
        });
    
        video.on("dblclick", toggleFullscreen);
    
        video.on("playing", function ()
        {
            btnPlay.removeClass("sh-icon-media-play-circle").addClass("sh-icon-media-pause-circle");
        });
    
        video.on("pause", function ()
        {
            btnPlay.removeClass("sh-icon-media-pause-circle").addClass("sh-icon-media-play-circle");
        });
    
        video.on("waiting", function ()
        {
            
        });
    
        video.on("progress", updateBuffering);
    
        setupProgressBar(popup.get().find(".video-progress-bar"), function (p, dragging)
        {
            isSeeking = dragging;
            if (dragging)
            {
                var total = video.prop("duration") || 0;
                if (total > 0)
                {
                    popup.get().find(".video-progress-label").html(formatTime(Math.floor(p * total)) + " / " + formatTime(total));
                }
            }
        },
        function (p)
        {
            isSeeking = false;
            video.prop("currentTime", p * video.prop("duration"));
        });
    
    
        video.attr("src", href);
        video.trigger("load");
    
        popup.get().one("sh-closed", function ()
        {
            // force-stop buffering
            video.attr("src", "");
            video.trigger("load");
            popup = null;
    
            //popup.find("> div").html("");
        });
    
        var idx = href.lastIndexOf("/");
        var name;
        if (idx !== -1)
        {
            name = href.substr(idx + 1);
        }
        else
        {
            name = href;
        }
        popup.get().find("h1").html(decodeURIComponent(name));
        popup.show();
    }
    

    var popup = null;

    $(window).resize(function ()
    {
        if (popup)
        {
            updateSizeConstraints();
        }
    });

    mimeRegistry.register("video/mp4", viewVideo);
    mimeRegistry.register("video/webm", viewVideo);
})();
