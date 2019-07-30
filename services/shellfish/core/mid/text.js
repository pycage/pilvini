"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Text = function ()
    {
        tools.defineProperties(this, {
            text: { set: setText, get: text }
        });

        var m_text = "";
        var m_label = $(
            low.tag("span")
            .content("")
            .html()
        );

        function setText(text)
        {
            m_label.html(low.escapeHtml(text));
            m_text = text;
        }

        function text()
        {
            return m_text;
        }

        this.get = function ()
        {
            return m_label;
        };
        
        tools.initAs(this, tools.VISUAL);
    };

});
