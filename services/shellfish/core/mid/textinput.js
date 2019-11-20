"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.TextInput = function TextInput()
    {
        tools.defineProperties(this, {
            text: { set: setText, get: text },
            password: { set: setPassword, get: password },
            focus: { set: setFocus, get: focus }
        });

        var m_password = false;
        var m_focus = false;

        var m_input = $(
            low.tag("input").attr("type", "text")
            .attr("value", "")
            .on("keydown", "event.stopPropagation();")
            .html()
        );

        this.get = function ()
        {
            return m_input;
        };

        function setText(text)
        {
            m_input.val(text);
        }

        function text()
        {
            return m_input.val();
        }

        function setPassword(value)
        {
            m_input.prop("type", value ? "password" : "text");
            m_password = value;
        }

        function password()
        {
            return m_password;
        }

        function setFocus(value)
        {
            m_input.prop("autofocus", value);
            m_focus = value;
        }

        function focus()
        {
            return m_focus;
        }

        tools.initAs(this, tools.VISUAL);
    };

});