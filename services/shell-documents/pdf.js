"use strict";

(function ()
{
    var IFrame = function ()
    {
        Object.defineProperties(this, {
            source: { set: setSource, get: source, enumerable: true }
        });

        var m_source = "";
        var m_iframe = $(
            sh.tag("iframe")
            .style("width", "calc(100vw - 80px)")
            .style("height", "calc(100vh - 80px)")
            .html()
        );

        function setSource(src)
        {
            m_iframe.prop("src", src);
            m_source = src;
        }

        function source()
        {
            return m_source;
        }

        this.get = function ()
        {
            return m_iframe;
        };
    };

    function viewPdf(href)
    {
        var popup = sh.element(sh.Popup)
        .add(
            sh.element(IFrame)
            .source("/::res/shell-documents/pdfjs/web/viewer.html?file=" + encodeURI(href))
        );
        
        popup.show_();
    }

    mimeRegistry.register("application/pdf", viewPdf);
})();
