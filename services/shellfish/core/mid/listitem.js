"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.ListItem = function ()
    {
        tools.defineProperties(this, {
            action: { set: setAction, get: action },
            fillMode: { set: setFillMode, get: fillMode },
            icon: { set: setIcon, get: icon },
            subtitle: { set: setSubtitle, get: subtitle },
            title: { set: setTitle, get: title },
            selected: { set: setSelected, get: selected },
            onClicked: { set: setOnClicked, get: onClicked }
        });

        var m_action = ["", null];
        var m_icon = "";
        var m_fillMode = "cover";
        var m_title = "";
        var m_subtitle = "";
        var m_isSelected = false;
        var m_onClicked = null;

        var m_listItem = $(
            low.tag("li")
            .style("height", "80px")
            .on("click", "")
            .content(
                low.tag("div").class("sh-left icon")
                .style("display", "none")
                .style("width", "80px")
                .style("background-repeat", "no-repeat")
                .style("background-position", "50% 50%")
            )
            .content(
                low.tag("div")
                .style("position", "absolute")
                .style("top", "1em")
                .style("left", "0")
                .style("right", "0")
                .style("padding-left", "0.5em")
                .content(
                    low.tag("h1").content("")
                )
                .content(
                    low.tag("h2").content("")
                )
            )
            .content(
                low.tag("div").class("sh-right")
                .style("display", "none")
                .style("width", "42px")
                .style("text-align", "center")
                .style("border-left", "solid 1px var(--color-border)")
                .content(
                    low.tag("span").class("sh-fw-icon")
                    .style("line-height", "80px")
                )
            )
            .html()
        );

        var m_iconBox = m_listItem.find("> div").eq(0);
        var m_labelBox = m_listItem.find("> div").eq(1);
        var m_buttonBox = m_listItem.find("> div").eq(2);

        this.get = function ()
        {
            return m_listItem;
        };

        function setIcon(url)
        {
            m_labelBox.css("left", "80px");
            m_iconBox.css("display", "block");
            m_iconBox.css("background-image", "url(" + url + ")");
            m_icon = url;
        }
        
        function icon()
        {
            return m_icon;
        }
        
        function setFillMode(fillMode)
        {
            m_iconBox.css("background-size", fillMode || "auto");
            m_fillMode = fillMode;
        }

        function fillMode()
        {
            return m_fillMode;
        }

        function setTitle(title)
        {
            m_labelBox.find("h1").html(low.escapeHtml(title));
            m_title = title;
        }

        function title()
        {
            return m_title;
        }

        function setSubtitle(subtitle)
        {
            m_labelBox.find("h2").html(low.escapeHtml(subtitle));
            m_subtitle = subtitle;
        }

        function subtitle()
        {
            return m_subtitle;
        }

        function setSelected(value)
        {
            if (value)
            {
                m_buttonBox.addClass("sh-inverted");
            }
            else
            {
                m_buttonBox.removeClass("sh-inverted");
            }
            m_isSelected = value;
        }

        function selected()
        {
            return m_isSelected;
        }

        function setAction(action)
        {
            var icon = action[0];
            var callback = action[1];

            m_labelBox.css("right", "42px");
            m_buttonBox.css("display", "block");
            m_buttonBox.find("span").addClass(icon);
            m_buttonBox.on("click", function (event)
            {
                event.stopPropagation();
                callback();
            });
            m_action = action;
        }

        function action()
        {
            return m_action;
        }

        function setOnClicked(callback)
        {
            m_listItem.off("click").on("click", callback);
            m_onClicked = callback;
        }

        function onClicked()
        {
            return m_onClicked;
        }
    };

});