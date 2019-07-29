"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Labeled = function ()
    {
        tools.defineProperties(this, {
            text: { set: setText, get: text }
        });

        var m_text = "";

        var m_row = $(
            low.tag("p")
            .content(
                low.tag("label").content("")
                .style("display", "inline-block")
                .style("min-width", "10em")
            )
            .html()
        );

        function setText(text)
        {
            m_row.find("> label").html(low.escapeHtml(text));
            m_text = text;
        }

        function text()
        {
            return m_text;
        }

        this.add = function (widget)
        {
            m_row.append(widget.get());
        }

        this.get = function ()
        {
            return m_row;
        };
    };

});