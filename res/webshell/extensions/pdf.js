"use strict";

(function ()
{
    function viewPdf(href)
    {
        var parts = href.split("/");
        var name = decodeURI(parts[parts.length - 1]);
    
        var page = sh.element(sh.NSPage)
        .onSwipeBack(function () { page.pop_(); })
        .header(
            sh.element(sh.PageHeader).title(name).subtitle("PDF Document")
            .left(
                sh.element(sh.IconButton).icon("sh-icon-back")
                .onClicked(function () { page.pop_(); })
            )
        );
        page.push_();
    
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
    
        page.get().get().find("> section").append(iframe);
    }

    mimeRegistry.register("application/pdf", viewPdf);
})();
