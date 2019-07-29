"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.MenuItem = function ()
    {
        tools.defineProperties(this, {
            enabled: { set: setEnabled, get: enabled },
            icon: { set: setIcon, get: icon },
            text: { set: setText, get: text },
            visible: { set: setVisible, get: visible },
            onClicked: { set: setOnClicked, get: onClicked }
        });

        var m_item;
        var m_icon = "";
        var m_text = "";
        var m_enabled = true;
        var m_visible = true;
        var m_onClicked = null;

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
            m_item.find("span").last().html(low.escapeHtml(text));
        }

        function text()
        {
            return m_text;
        }

        function setOnClicked(callback)
        {
            m_onClicked = callback;
            m_item.off("click").on("click", callback);
        }

        function onClicked()
        {
            return m_onClicked;
        }

        function setEnabled(value)
        {
            if (value)
            {
                m_item.removeClass("sh-disabled");
            }
            else
            {
                m_item.addClass("sh-disabled");
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
                m_item.removeClass("sh-hidden");
            }
            else
            {
                m_item.addClass("sh-hidden");
            }
            m_visible = value;
        }

        function visible()
        {
            return m_visible;
        }

        this.get = function ()
        {
            return m_item;
        };

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
    };

});