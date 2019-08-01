"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Dialog = function ()
    {
        tools.defineProperties(this, {
            title: { set: setTitle, get: title },
            button: { set: addButton, get: buttons }
        });

        var m_title = "";
        var m_buttons = [];

        var m_dialog = $(
            low.tag("form").class("sh-popup")
            .on("click", "event.stopPropagation();")
            .on("submit", "return false;")
            .content(
                low.tag("div").class("sh-dropshadow")
                .style("background-color", "var(--color-primary-background)")
                .style("max-width", "calc(100vw - 80px)")
                .content(
                    low.tag("header")
                    .style("border", "none")
                    .style("background-color", "var(--color-highlight-background)")
                    .content(
                        low.tag("h1")
                        .content("")
                    )
                )
                .content(
                    low.tag("section")
                    .style("margin-top", "2rem")
                    .style("margin-bottom", "2.5rem")
                    .style("max-width", "calc(100vw - 2rem)")
                    .style("max-height", "calc(100vh - 4.5rem - 2rem)")
                    .style("overflow", "auto")
                )
                .content(
                    low.tag("footer")
                    .style("border", "none")
                    .style("height", "2.5rem")
                    .style("line-height", "2.5rem")
                    .style("background-color", "var(--color-secondary-background)")
                    .content(
                        low.tag("span").class("sh-right")
                        .style("margin-top", "0.3rem")
                        .style("margin-bottom", "0.3rem")
                    )
                )
            )
            .html()
        );

        m_dialog.find("> div > header")
        .on("mousedown", function ()
        {
            m_dialog.addClass("sh-translucent");
        })
        .on("mouseup", function ()
        {
            m_dialog.removeClass("sh-translucent");
        })
        .on("mouseleave", function ()
        {
            m_dialog.removeClass("sh-translucent");
        });

        this.get = function ()
        {
            return m_dialog;
        };

        /* Shows this dialog.
         */
        this.show = function ()
        {
            if (document.fullscreenElement)
            {
                $(document.fullscreenElement).append(m_dialog);
            }
            else
            {
                $("body").append(m_dialog);
            }
            m_dialog.find("input").first().attr("tabindex", -1).focus();
        };

        /* Closes this dialog.
         */
        this.close = function ()
        {
            m_dialog.detach();
        }

        function setTitle(title)
        {
            m_dialog.find("header h1").html(low.escapeHtml(title));
            m_title = title;
        }

        function title()
        {
            return m_title;
        }

        function addButton(button)
        {
            m_buttons.push(button);
            m_dialog.find("footer > span").append(button.get().get());
            m_dialog.find("footer > span").append($("<span>&nbsp;</span>"));
        }

        function buttons()
        {
            return m_buttons;
        }

        /* Adds a widget to this dialog.
        */
        this.add = function (widget)
        {
            m_dialog.find("section").append(widget.get());
        };
    };

});