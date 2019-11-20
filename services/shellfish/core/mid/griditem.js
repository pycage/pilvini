"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.GridItem = function GridItem()
    {
        tools.defineProperties(this, {
            action: { set: setAction, get: action },
            fillMode: { set: setFillMode, get: fillMode },
            icon: { set: setIcon, get: icon },
            title: { set: setTitle, get: title },
            selected: { set: setSelected, get: selected },
            onClicked: { set: setOnClicked, get: onClicked }
        });

        var m_action = ["", null];
        var m_icon = "";
        var m_fillMode = "cover";
        var m_title = "";
        var m_isSelected = false;
        var m_onClicked = null;

        var m_gridItem = $(
            low.tag("div")
            .style("position", "relative")
            .style("width", "160px")
            .style("height", "160px")
            .style("padding", "0").style("margin", "0")
            .style("margin-top", "2px")
            .style("margin-left", "2px")
            .style("background-repeat", "no-repeat")
            .style("background-position", "50% 50%")
            .content(
                low.tag("h1")
                .style("position", "absolute")
                .style("background-color", "var(--color-primary-background-translucent)")
                .style("padding", "0")
                .style("left", "0")
                .style("right", "0")
                .style("bottom", "0")
                .style("font-size", "80%")
                .style("text-align", "center")
                .content("")
            )
            .html()
        );

        var m_iconBox = m_gridItem;
        var m_buttonBox = m_gridItem.find("> div").eq(2);

        this.get = function ()
        {
            return m_gridItem;
        };

        function setIcon(url)
        {
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
            m_gridItem.find("h1").html(low.resolveIcons(low.escapeHtml(title)));
            m_title = title;
        }

        function title()
        {
            return m_title;
        }

        function setSelected(value)
        {
            if (value)
            {
                m_gridItem.find("> div").last().addClass("sh-inverted");
            }
            else
            {
                m_gridItem.find("> div").last().removeClass("sh-inverted");
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

            var box = $(
                low.tag("div")
                .style("position", "absolute")
                .style("top", "0")
                .style("right", "0")
                .style("width", "42px")
                .style("height", "42px")
                .style("text-align", "center")
                .style("border-radius", "3px")
                .content(
                    low.tag("span").class("sh-fw-icon " + icon)
                    .style("line-height", "42px")
                )
                .html()
            );
            box.on("click", function (event)
            {
                event.stopPropagation();
                callback();
            });

            m_gridItem.append(box);
            m_action = action;
        }

        function action()
        {
            return m_action;
        }

        function setOnClicked(callback)
        {
            m_gridItem.off("click").on("click", callback);
            m_onClicked = callback;
        }

        function onClicked()
        {
            return m_onClicked;
        }
    };

});
