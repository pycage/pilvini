"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.IconButton = function ()
    {
        tools.defineProperties(this, {
            enabled: { set: setEnabled, get: enabled },
            checked: { set: setChecked, get: checked },
            visible: { set: setVisible, get: visible },
            icon: { set: setIcon, get: icon },
            menu: { set: setMenu, get: menu },
            onClicked: { set: setOnClicked, get: onClicked }
        });

        var that = this;
        var m_enabled = true;
        var m_visible = true;
        var m_checked = false;
        var m_icon = "";
        var m_menu = null;
        var m_onClicked = null;

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
            event.stopPropagation();
            if (m_onClicked)
            {
                m_onClicked(that);
            }
            if (m_menu)
            {
                m_menu.popup(m_button);
            }
        });

        function setEnabled(value)
        {
            if (value)
            {
                m_button.removeClass("sh-disabled");
            }
            else
            {
                m_button.addClass("sh-disabled");
            }
            m_enabled = value;
        }

        function enabled()
        {
            return m_enabled;
        }

        function setVisible(value)
        {
            if (value)
            {
                m_button.css("display", "inline-block");
            }
            else
            {
                m_button.css("display", "none");
            }
            m_visible = value;
        }

        function visible()
        {
            return m_visible;
        }

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

        function setOnClicked(callback)
        {
            m_onClicked = callback;
        }

        function onClicked()
        {
            return m_onClicked;
        }

        this.get = function ()
        {
            return m_button;
        };
    };

});