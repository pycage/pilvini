"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.MenuItem = function ()
    {
        tools.defineProperties(this, {
            icon: { set: setIcon, get: icon },
            text: { set: setText, get: text },
        });

        var m_item;
        var m_icon = "";
        var m_text = "";

        m_item = $(
            low.tag("li")
            .style("position", "relative")
            .on("click", "")
            .content(
                low.tag("span").class("sh-left sh-fw-icon")
            )
            .content(
                low.tag("span")
                .style("padding-left", "1.2em")
                .content("")
            )
            .html()
        );

        function setIcon(icon)
        {
            m_item.find("span").first().removeClass(m_icon).addClass(icon);
            m_icon = icon;
        }

        function icon()
        {
            return m_icon;
        }

        function setText(text)
        {
            m_text = text;
            m_item.find("span").last().html(low.resolveIcons(low.escapeHtml(text)));
        }

        function text()
        {
            return m_text;
        }

        this.get = function ()
        {
            return m_item;
        };

        tools.initAs(this, tools.VISUAL | tools.INTERACTIVE | tools.CLICK_THROUGH);
    };

});