"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Toolbar = function ()
    {
        tools.defineProperties(this, {
            visible: { set: setVisible, get: visible },
            left: { set: addLeft, get: left },
            right: { set: addRight, get: right }
        });

        var m_isVisible = true;
        var m_left = [];
        var m_right = [];

        var m_item = $(
            low.tag("div")
            .style("position", "relative")
            .style("height", "3rem")
            .style("line-height", "3rem")
            .style("overflow", "hidden")
            .style("white-space", "nowrap")
            .content(
                low.tag("div").class("sh-left")
            )
            .content(
                low.tag("div").class("sh-right")
            )
            .html()
        );

        function setVisible(v)
        {
            m_isVisible = v;
            if (v)
            {
                m_item.css("display", "block");
            }
            else
            {
                m_item.css("display", "none");
            }
        }

        function visible()
        {
            return m_isVisible;
        }

        function addLeft(child)
        {
            m_left.push(child);
            m_item.find("> div:nth-child(1)").append(child.get());
        }

        function left()
        {
            return m_left;
        }

        function addRight(child)
        {
            m_right.push(child);
            m_item.find("> div:nth-child(2)").append(child.get());
        }

        function right()
        {
            return m_right;
        }

        this.get = function ()
        {
            return m_item;
        };

        this.add = function (child)
        {
            addLeft(child);
        };
    };

});
