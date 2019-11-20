"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Menu = function Menu()
    {
        var m_menu;

        m_menu = $(
            low.tag("div").class("sh-menu sh-hidden")
            .content(
                low.tag("div")
                .content(
                    low.tag("ul")
                    .style("max-height", "75vh")
                    .style("overflow-x", "hidden")
                    .style("overflow-y", "auto")
                    .style("white-space", "nowrap")
                )
            )
            .html()
        );

        m_menu.on("click", function (event)
        {
            event.stopPropagation();
            m_menu.detach();
        });

        this.clear = function()
        {
            m_menu.find("> div").html("");
            m_menu.find("> div").append("<ul>");
        };

        this.add = function (item)
        {
            var ul = m_menu.find("> div > ul").last();
            ul.append(item.get());
        };

        this.popup = function (parent)
        {
            $("body").append(m_menu);
            low.menuOpen(m_menu, parent, function () { });
        };

        this.close = function ()
        {
            m_menu.detach();
        };

        tools.initAs(this, tools.VISUAL);
    };

});