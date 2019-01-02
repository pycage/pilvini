function viewVideo(href)
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

    /* Updates the current player position.
     */
    function updatePosition()
    {
        var total = video.prop("duration");
        var pos = video.prop("currentTime");
        progressBar.css("width", (pos / total * 100.0) + "%");
        progressLabel.html(formatTime(pos) + " / " + formatTime(total));
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
            btnFullscreen.removeClass("sh-icon-unfullscreen").addClass("sh-icon-fullscreen");
        }
        else
        {
            sh.requestFullscreen(videoDiv);
            btnFullscreen.removeClass("sh-icon-fullscreen").addClass("sh-icon-unfullscreen");
        }
    }

    var popup = $("#preview-popup");
    var w = popup.width() - 32;
    var h = popup.height() - 32;

    popup.find("> div").html(
        tag("div")
        .style("position", "relative")
        .style("max-width", w + "px")
        .style("max-height", h + "px")
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
                tag("div").class("progressBar")
                .style("position", "absolute")
                .style("top", "0")
                .style("left", "0")
                .style("right", "0")
                .style("height", "4px")
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
            .content(
                tag("div")
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
                    tag("span").class("sh-fw-icon sh-icon-media-rwd10")
                    .style("padding-left", "0.5em")
                    .style("font-size", "80%")
                )
                .content(
                    tag("span").class("sh-fw-icon")
                    .style("padding-left", "0.25em")
                )
                .content(
                    tag("span").class("sh-fw-icon sh-icon-media-fwd30")
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
                tag("span").class("sh-right sh-fw-icon sh-icon-fullscreen")
            )
        )
        .html()
    );

    var videoDiv = popup.find("> div > div");
    var video = popup.find("video");
    var progressBar = videoDiv.find("footer > div:nth-child(1) > div");
    var progressLabel = videoDiv.find("footer > div:nth-child(2)")
    var btnPlay = videoDiv.find("footer > span > span:nth-child(2)");
    var btnRwd = videoDiv.find("footer > span > span:nth-child(1)");
    var btnFwd = videoDiv.find("footer > span > span:nth-child(3)");
    var btnFullscreen = videoDiv.find("footer > span:nth-child(5)");

    video.prop("autoplay", true);
    video.removeProp("controls");

    videoDiv.on("click", function (event) { event.stopPropagation(); });

    video.on("durationchange", updatePosition);
    video.on("timeupdate", updatePosition);

    btnPlay.on("click", togglePlay);

    btnRwd.on("click", function (event)
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

    btnFwd.on("click", function (event)
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

    btnFullscreen.on("click", toggleFullscreen);

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