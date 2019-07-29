"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Switch = function ()
    {
        tools.defineProperties(this, {
            enabled: { set: setEnabled, get: enabled },
            checked: { set: setChecked, get: checked },
            onToggled: { set: setOnToggled, get: onToggled }
        });

        var m_enabled = true;
        var m_onToggled = null;
        var m_swtch = $(
            low.tag("label").class("sh-switch")
            .content(
                low.tag("input").attr("type", "checkbox")
            )
            .content(
                low.tag("span")
            )
            .html()
        );

        m_swtch.find("input").on("click", function ()
        {
            if (m_onToggled)
            {
                m_onToggled(!! m_swtch.find("input").prop("checked"));
            }
        });

        this.get = function ()
        {
            return m_swtch;
        };

        function setEnabled(value)
        {
            if (value)
            {
                m_swtch.removeClass("sh-disabled");
            }
            else
            {
                m_swtch.addClass("sh-disabled");
            }
            m_enabled = value;
        }

        function enabled()
        {
            return m_enabled;
        }

        function setChecked(value)
        {
            m_swtch.find("input").prop("checked", value);
        }

        function checked()
        {
            return !! m_swtch.find("input").prop("checked");
        }

        function setOnToggled(cb)
        {
            m_onToggled = cb;
        }

        function onToggled()
        {
            return m_onToggled;
        }
    };

});