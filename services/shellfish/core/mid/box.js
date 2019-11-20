"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Box = function Box()
    {
        var m_item = $(
            low.tag("div")
            .html()
        );

        this.get = function ()
        {
            return m_item;
        };

        this.add = function (child)
        {
            m_item.append(child.get());
        };

        tools.initAs(this, tools.VISUAL);
    };

});
