"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Headline = function Headline()
    {
        tools.defineProperties(this, {
            title: { set: setTitle, get: title },
            subtitle: { set: setSubtitle, get: subtitle }
        });

        var m_title = "";
        var m_subtitle = "";
        var m_label = $(
            low.tag("div")
            .style("line-height", "1.3rem")
            .style("padding-top", "0.2rem")
            .content(
                low.tag("h1").style("overflow", "none").content("")
            )
            .content(
                low.tag("h2").style("overflow", "none").content("")
            )
            .html()
        );

        function setTitle(text)
        {
            m_label.find("h1").html(low.resolveIcons(low.escapeHtml(text)));
            m_title = text;
        }

        function title()
        {
            return m_title;
        }

        function setSubtitle(text)
        {
            m_label.find("h2").html(low.resolveIcons(low.escapeHtml(text)));
            m_subtitle = text;
        }

        function subtitle()
        {
            return m_subtitle;
        }

        this.get = function ()
        {
            return m_label;
        };

        tools.initAs(this, tools.VISUAL);
    };

});