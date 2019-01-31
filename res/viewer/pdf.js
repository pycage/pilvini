"use strict";

function viewPdf(href)
{
    var parts = href.split("/");
    var name = decodeURI(parts[parts.length - 1]);

    var page = ui.showPage(name);
    sh.onSwipeBack(page, function () { page.pop(); });

    page.find("section").html("<iframe>");
    var iframe = page.find("iframe");
    iframe.css("position", "absolute");
    iframe.css("top", page.find("header").height() + "px")
          .css("left", 0)
          .css("width", "100%")
          .css("height", ($(window).height() - page.find("header").height()) + "px");
    iframe.prop("src", "/::res/viewer/pdfjs/web/viewer.html?file=" + encodeURI(href));
    sh.push(page);
}

$(document).ready(function ()
{
    mimeRegistry.register("application/pdf", viewPdf);
});
