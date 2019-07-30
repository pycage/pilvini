"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.IconButton = function ()
    {
        tools.defineProperties(this, {
            checked: { set: setChecked, get: checked },
            icon: { set: setIcon, get: icon },
            menu: { set: setMenu, get: menu },
        });

        var that = this;
        var m_checked = false;
        var m_icon = "";
        var m_menu = null;

        var m_button = $(
            low.tag("div")
            .style("display", "inline-block")
            .style("width", "3rem")
            .style("height", "100%")
            .style("text-align", "center")
            .content(
                low.tag("div")
                .style("display", "flex")
                .style("height", "100%")
                .style("align-items", "center")
                .style("justify-content", "center")    
                .content(
                    low.tag("span").class("sh-fw-icon")
                    .style("font-size", "2rem")        
                )
            )
            .on("click", "")
            .html()
        );

        m_button.on("click", function (event)
        {
            if (m_menu)
            {
                m_menu.popup(m_button);
            }
        });

        function setChecked(value)
        {
            if (value)
            {
                m_button.css("background-color", "var(--color-highlight-background)")
            }
            else
            {
                m_button.css("background-color", "")
            }
            m_checked = value;
        }

        function checked()
        {
            return m_checked;
        }

        function setIcon(icon)
        {
            m_button.find("span").removeClass(m_icon).addClass(icon);
            m_icon = icon;
        }

        function icon()
        {
            return m_icon;
        }

        function setMenu(menu)
        {
            m_menu = menu;
        }

        function menu()
        {
            return m_menu;
        }

        this.get = function ()
        {
            return m_button;
        };

        tools.initAs(this, tools.VISUAL | tools.INTERACTIVE);
    };

});