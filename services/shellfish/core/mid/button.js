"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Button = function ()
    {
        tools.defineProperties(this, {
            text: { set: setText, get: text },
            action: { set: setOnClicked, get: onClicked },
            onClicked: { set: setOnClicked, get: onClicked },
            isDefault: { set: setIsDefault, get: isDefault }
        });

        var m_text = "";
        var m_onClicked = null;
        var m_isDefault = false;

        var m_button = $(
            low.tag("input").attr("type", "button")
            .on("click", "")
            .attr("value", "")
            .html()
        );

        function setText(text)
        {
            m_button.prop("value", low.escapeHtml(text));
            m_text = text;
        }

        function text()
        {
            return m_text;
        }

        function setOnClicked(callback)
        {
            m_button.off("click").on("click", callback);
            m_onClicked = callback;
        }

        function onClicked()
        {
            return m_onClicked;
        }

        function setIsDefault(value)
        {
            m_button.prop("type", value ? "submit" : "button");
            m_isDefault = value;
        }

        function isDefault()
        {
            return m_isDefault;
        }

        this.get = function ()
        {
            return m_button;
        }
    };

});