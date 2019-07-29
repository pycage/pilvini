"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Box = function ()
    {
        tools.defineProperties(this, {
            visible: { set: setVisible, get: visible }
        });

        var m_isVisible = true;

        var m_item = $(
            low.tag("div")
            .html()
        );

        function setVisible(v)
        {
            m_isVisible = v;
            m_item.css("display", v ? "block" : "none");
        }

        function visible()
        {
            return m_isVisible;
        }

        this.get = function ()
        {
            return m_item;
        };

        this.add = function (child)
        {
            m_item.append(child.get());
        };
    };

});
