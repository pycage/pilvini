function viewVideo(href)
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
            progressBar.find("> div").css("width", (p * 100.0) + "%");
            draggingCallback(p, true);
        });
        progressBar.on("mousemove", function (event)
        {
            if (isDragging)
            {
                var p = Math.max(0, Math.min(1, event.offsetX / $(this).width()));
                progressBar.find("> div").css("width", (p * 100.0) + "%");
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
                progressBar.find("> div").css("width", (p * 100.0) + "%");
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
            var total = video.prop("duration");
            var pos = video.prop("currentTime");
            $(".video-progress-bar > div").css("width", (pos / total * 100.0) + "%");
            $(".video-progress-label").html(formatTime(pos) + " / " + formatTime(total));
        }
    }

    function slideIn()
    {
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
        videoDiv.find("footer").animate({
            bottom: "-80px"
        }, 350, function ()
        {
            videoDiv.find("footer").css("visibility", "hidden");
        });
    }

    function togglePlay()
    {
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
        if (sh.isFullscreen())
        {
            sh.exitFullscreen();
            $(this).removeClass("sh-icon-unfullscreen").addClass("sh-icon-fullscreen");
        }
        else
        {
            sh.requestFullscreen(videoDiv);
            $(this).removeClass("sh-icon-fullscreen").addClass("sh-icon-unfullscreen");
        }
    }

    var popup = $("#preview-popup");
    var maxWidth = popup.width() - 80;
    var maxHeight = popup.height() - 80;

    popup.find("> div").html(
        tag("div")
        .style("position", "relative")
        .style("max-width", maxWidth + "px")
        .style("max-height", maxHeight + "px")
        .content(
            tag("div")
            .style("width", "100%")
            .style("height", "100%")
            .style("background-color", "black")
            .content(
                tag("video")
                .style("width", "100%")
                .style("height", "100%")
            )
            .content(
                tag("footer")
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
                    tag("div").class("video-progress-label")
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
                    tag("span").class("sh-left")
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-media-rwd10 video-rewind-button")
                        .style("padding-left", "0.5em")
                        .style("font-size", "80%")
                    )
                    .content(
                        tag("span").class("sh-fw-icon video-play-button")
                        .style("padding-left", "0.25em")
                    )
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-media-fwd30 video-forward-button")
                        .style("padding-left", "0.25em")
                        .style("font-size", "80%")
                    )
                )
                .content(
                    tag("h1")
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
                    tag("span").class("sh-right sh-fw-icon sh-icon-fullscreen video-fullscreen-button")
                )
                .content(
                    tag("div").class("video-progress-bar")
                    .style("position", "absolute")
                    .style("top", "0")
                    .style("left", "0")
                    .style("right", "0")
                    .style("height", "1rem")
                    .content(
                        tag("div")
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
                    tag("img").class("sh-right")
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

    var videoDiv = popup.find("> div > div > div");
    var video = popup.find("video");
    var btnPlay = $(".video-play-button");

    video.prop("autoplay", true);
    video.removeProp("controls");

    videoDiv.on("click", function (event) { event.stopPropagation(); });

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
        sh.popup_close("busy-popup");
        btnPlay.removeClass("sh-icon-media-play-circle").addClass("sh-icon-media-pause-circle");
    });

    video.on("pause", function ()
    {
        btnPlay.removeClass("sh-icon-media-pause-circle").addClass("sh-icon-media-play-circle");
    });

    video.on("waiting", function ()
    {
        sh.popup("busy-popup");
    });

    setupProgressBar($(".video-progress-bar"), function (p, dragging)
    {
        isSeeking = dragging;
        if (dragging)
        {
            var total = video.prop("duration") || 0;
            if (total > 0)
            {
                $(".video-progress-label").html(formatTime(Math.floor(p * total)) + " / " + formatTime(total));
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
    sh.popup("preview-popup");
    //sh.popup("busy-popup");

    popup.one("sh-closed", function ()
    {
        // force-stop buffering
        video.attr("src", "");
        video.trigger("load");

        popup.find("> div").html("");
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
    popup.find("h1").html(decodeURIComponent(name));
}