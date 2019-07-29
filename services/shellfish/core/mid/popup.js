"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Popup = function ()
    {
        var m_popup = $(
            low.tag("div").class("sh-popup")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .content(
                low.tag("div").class("sh-dropshadow")
                .style("position", "relative")
                .style("background-color", "black")
                .style("overflow", "hidden")
            )
            .html()
        );

        m_popup.on("click", function ()
        {
            m_popup.trigger("sh-closed");
            m_popup.remove();
        });

        this.get = function ()
        {
            return m_popup;
        };

        this.add = function (item)
        {
            m_popup.find("> div").append(item.get());
        };

        this.show = function ()
        {
            $("body").append(m_popup);
            m_popup.attr("tabindex", -1).focus();
        };
    };

});