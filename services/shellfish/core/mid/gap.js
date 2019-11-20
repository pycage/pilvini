"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Gap = function Gap()
    {
        var m_item = $(
            low.tag("div")
            .style("display", "inline-block")
            .style("width", "3rem")
            .style("height", "1px")
            .html()
        );

        this.get = function ()
        {
            return m_item;
        };

        tools.initAs(this, tools.VISUAL);
    };

});
