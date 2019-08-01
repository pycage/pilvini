"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.BusyPopup = function ()
    {
        tools.defineProperties(this, {
            text: { set: setText, get: text }
        });

        var m_text = "";
        var m_popup = $(
            low.tag("div").class("sh-popup")
            .content(
                low.tag("div").class("sh-dropshadow")
                .style("color", "var(--color-primary)")
                .style("text-align", "center")
                .style("padding", "1em")
                .content(
                    low.tag("span").class("sh-fw-icon sh-icon-busy-indicator")
                    .style("font-size", "200%")
                )
                .content(low.tag("br"))
                .content(low.tag("br"))
                .content(
                    low.tag("span").content("")
                )
            )
            .html()
        );

        function setText(text)
        {
            m_popup.find("span").last().html(low.resolveIcons(low.escapeHtml(text)));
            m_text = text;
        }

        function text()
        {
            return m_text;
        }

        this.show = function ()
        {
            $("body").append(m_popup);
        };

        this.hide = function ()
        {
            m_popup.remove();
        };
    };

});
