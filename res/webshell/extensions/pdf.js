"use strict";

function viewPdf(href)
{
    var parts = href.split("/");
    var name = decodeURI(parts[parts.length - 1]);

    var page = new sh.Page(name, "");
    page.setSwipeBack(function () { page.pop(); });
    page.addToHeaderLeft(new sh.IconButton("sh-icon-back", function () { page.pop(); }));
    page.push();

    var iframe = $(
        sh.tag("iframe")
        .style("position", "absolute")
        .style("top", "-1px")
        .style("left", "0")
        .style("width", "100vw")
        .style("height", "calc(100vh - 3rem)")
        .attr("src", "/::res/webshell/extensions/pdfjs/web/viewer.html?file=" + encodeURI(href))
        .html()
    );

    page.get().find("> section").append(iframe);
}

(function ()
{
    mimeRegistry.register("application/pdf", viewPdf);
})();
