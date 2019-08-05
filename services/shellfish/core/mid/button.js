"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Button = function ()
    {
        tools.defineProperties(this, {
            checked: { set: setChecked, get: checked },
            icon: { set: setIcon, get: icon },
            text: { set: setText, get: text },
            isDefault: { set: setIsDefault, get: isDefault },
            menu: { set: setMenu, get: menu }
        });

        var m_checked = false;
        var m_icon = "";
        var m_text = "";
        var m_isDefault = false;
        var m_menu = null;

        var m_button = $(
            low.tag("div")
            .style("position", "relative")
            .style("display", "inline-block")
            .style("height", "100%")
            .style("text-align", "center")
            .style("padding", "0.2rem")
            .style("overflow", "hidden")
            .on("click", "")
            .content(
                low.tag("input").attr("type", "button")
                .style("position", "absolute")
                .style("visibility", "hidden")
            )
            .content(
                low.tag("div")
                .style("display", "flex")
                .style("height", "100%")
                .style("align-items", "center")
                .style("justify-content", "center")    
                .content(
                    low.tag("span")
                    .style("font-size", "2rem")        
                )
                .content(
                    low.tag("span")   
                )
            )
            .html()
        );

        m_button.on("click", function (event)
        {
            if (m_menu)
            {
                m_menu.popup(m_button);
            }
        });

        function update()
        {
            if (m_icon !== "")
            {
                m_button.find("span").first()
                .removeClass("sh-hidden")
                .html(low.resolveIcons("[icon:" + m_icon + "]"));

                if (m_text === "")
                {
                    m_button.find("span").first().addClass("sh-fw-icon");
                }
                else
                {
                    m_button.find("span").first().removeClass("sh-fw-icon");
                }
            }
            else
            {
                m_button.find("span").first()
                .addClass("sh-hidden")
                .html("");
            }
            m_button.find("span").last().html(low.escapeHtml(m_text));

            if (m_text !== "")
            {
                m_button.css("minWidth", "6rem");
                m_button.addClass("sh-framed");
            }
            else
            {
                m_button.css("minWidth", "0");
                m_button.removeClass("sh-framed");
            }
        }

        function setChecked(value)
        {
            if (value)
            {
                m_button.addClass("sh-checked");
            }
            else
            {
                m_button.removeClass("sh-checked");
            }
            m_checked = value;
        }

        function checked()
        {
            return m_checked;
        }

        function setIcon(icon)
        {
            m_icon = icon;
            update();
        }

        function icon()
        {
            return m_icon;
        }

        function setText(text)
        {
            m_text = text;
            update();
        }

        function text()
        {
            return m_text;
        }

        function setIsDefault(value)
        {
            m_button.find("input").prop("type", value ? "submit" : "button");
            m_isDefault = value;
        }

        function isDefault()
        {
            return m_isDefault;
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
        }

        tools.initAs(this, tools.VISUAL | tools.INTERACTIVE);
    };

});