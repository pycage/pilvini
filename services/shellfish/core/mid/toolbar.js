"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Toolbar = function Toolbar()
    {
        tools.defineProperties(this, {
            left: { set: addLeft, get: left },
            right: { set: addRight, get: right },
            size: { set: setSize, get: size }
        });

        var m_left = [];
        var m_right = [];
        var m_size = 1;

        var m_item = $(
            low.tag("div")
            .style("position", "relative")
            .style("height", "3rem")
            .style("overflow", "hidden")
            .style("white-space", "nowrap")
            .style("flex-grow", "1")
            .content(
                low.tag("div").class("sh-left")
            )
            .content(
                low.tag("div").class("sh-right")
            )
            .html()
        );

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

        function setSize(s)
        {
            m_size = s;
            m_item.css("height", "calc(3rem * " + s + ")");
        }

        function size()
        {
            return m_size;
        }

        this.get = function ()
        {
            return m_item;
        };

        this.add = function (child)
        {
            addLeft(child);
        };

        tools.initAs(this, tools.VISUAL);
    };

});
