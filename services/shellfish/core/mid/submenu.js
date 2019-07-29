"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.SubMenu = function ()
    {
        tools.defineProperties(this, {
            text: { set: setText, get: text },
            visible: { set: setVisible, get: visible }
        });
        
        var m_subMenu;
        var m_text = "";

        function setText(text)
        {
            m_text = text;
            m_subMenu.find("h1").html(low.escapeHtml(text));
        }

        function text()
        {
            return m_text;
        }

        this.add = function (item)
        {
            var ul = m_subMenu.find("ul").last();
            ul.append(item.get());
        };

        function setVisible(value)
        {
            if (value)
            {
                m_subMenu.removeClass("sh-hidden");
            }
            else
            {
                m_subMenu.addClass("sh-hidden");
            }
        }

        function visible()
        {
            return true;
        }

        this.get = function ()
        {
            return m_subMenu;
        };

        m_subMenu = $(
            low.tag("div")
            .content(
                low.tag("h1").class("sh-submenu")
                .on("click", "")
            )
            .content(
                low.tag("ul")
            )
            .html()
        );

        m_subMenu.find("> h1").on("click", function (event)
        {
            event.stopPropagation();
            var item = this;
            m_subMenu.parent().find(".sh-submenu").each(function (i)
            {
                if (this !== item)
                {
                    $(this).removeClass("sh-submenu-visible");
                }
            });
            $(item).toggleClass("sh-submenu-visible");
        });
    };

});