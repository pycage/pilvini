"use strict";

function viewPdf(href)
{
    var parts = href.split("/");
    var name = decodeURI(parts[parts.length - 1]);

    var page = ui.showPage(name);

    page.find("section").html("<iframe>");
    var iframe = page.find("iframe");
    iframe.css("position", "absolute");
    iframe.css("top", "-1px")
          .css("left", 0)
          .css("width", "100%")
          .css("height", ($(window).height() - page.find("header").height()) + "px");
    iframe.prop("src", "/::res/webshell/extensions/pdfjs/web/viewer.html?file=" + encodeURI(href));
}

(function ()
{
    mimeRegistry.register("application/pdf", viewPdf);
})();
