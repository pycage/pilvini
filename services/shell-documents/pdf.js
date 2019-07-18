"use strict";

const mods = [
    "shellfish/low",
    "shellfish/mid",
    "shellfish/high",
    "shell/mime-registry"
];

require(mods, function (low, mid, high, mimeReg)
{
    var IFrame = function ()
    {
        Object.defineProperties(this, {
            source: { set: setSource, get: source, enumerable: true }
        });

        var m_source = "";
        var m_iframe = $(
            low.tag("iframe")
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
        var popup = high.element(mid.Popup)
        .add(
            high.element(IFrame)
            .source("/::res/shell-documents/pdfjs/web/viewer.html?file=" + encodeURI(href))
        );
        
        popup.show_();
    }

    mimeReg.mimeRegistry.register("application/pdf", viewPdf);
});
