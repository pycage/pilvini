function viewVideo(href)
{
    var popup = $("#preview-popup");
    var w = popup.width() - 32;
    var h = popup.height() - 32;

    popup.find("> div").html(
        tag("div")
        .content(
            tag("video")
            .style("max-width", w + "px")
            .style("max-height", h + "px")
        )
        .content(
            tag("h1").class("sh-font-small")
            .style("position", "absolute")
            .style("margin", "0")
            .style("padding", "0")
            .style("white-space", "nowrap")
            .style("text-overflow", "ellipsis")
            .style("overflow", "hidden")
            .style("text-align", "right")
            .style("left", "0.25em")
            .style("right", "0.25em")
            .style("top", "0.25em")
            .style("text-shadow", "#000 0px 0px 1px")
            .style("color", "white")
        )
        .html()
    );

    var video = popup.find("video");
    video.prop("autoplay", true);
    video.prop("controls", true);

    video.on("playing", function ()
    {
        sh.popup_close("busy-popup");
        popup.find("h1").css("visibility", "hidden");
    });

    video.on("pause", function ()
    {
        popup.find("h1").css("visibility", "visible");
    });

    video.on("waiting", function ()
    {
        sh.popup("busy-popup");
    });


    video.attr("src", href);
    sh.popup("preview-popup");
    //sh.popup("busy-popup");

    popup.one("sh-closed", function ()
    {
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