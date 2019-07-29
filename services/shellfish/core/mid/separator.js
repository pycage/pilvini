"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Separator = function ()
    {
        var m_sep = $(
            low.tag("hr")
            .html()
        );

        this.get = function ()
        {
            return m_sep;
        };
    };

});
