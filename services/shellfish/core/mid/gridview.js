"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.GridView = function ()
    {
        var m_items = [];

        var m_gridView = $(
            low.tag("div")
            .style("display", "flex")
            .style("flex-direction", "row")
            .style("flex-wrap", "wrap")
            .style("justify-content", "flex-start")
            .html()
        );

        this.get = function ()
        {
            return m_gridView;
        };

        this.add = function (item)
        {
            m_items.push(item);
            m_gridView.append(item.get());
        };

        this.item = function (n)
        {
            return m_items[n];
        };
    };

});