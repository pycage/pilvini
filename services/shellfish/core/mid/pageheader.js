"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    /* Element representing a page header with title and buttons.
     */
    exports.PageHeader = function ()
    {
        tools.defineProperties(this, {
            title: { set: setTitle, get: title },
            subtitle: { set: setSubtitle, get: subtitle },
            left: { set: addLeft, get: left },
            right: { set: addRight, get: right },
            //onClicked: { set: setOnClicked, get: onClicked }
        });

        var m_title = "";
        var m_subtitle = "";
        var m_left = [];
        var m_right = [];
        //var m_onClicked = null;

        var m_header = $(
            low.tag("header").class("sh-dropshadow")
            .style("padding-left", "3em")
            .style("padding-right", "3em")
            .content(
                low.tag("div")
                .style("line-height", "1.3rem")
                .style("padding-top", "0.2rem")
                .content(
                    low.tag("h1").style("overflow", "none").content("")

                )
                .content(
                    low.tag("h2").style("overflow", "none").content("")
                )
            )
            .content(
                low.tag("div").class("sh-left")
            )
            .content(
                low.tag("div").class("sh-right")
            )
            .html()
        );

        function setTitle(title)
        {
            m_header.find("> div > h1").html(low.resolveIcons(low.escapeHtml(title)));
            m_title = title;
        }

        function title()
        {
            return m_title;
        }

        function setSubtitle(subtitle)
        {
            m_header.find("> div > h2").html(low.resolveIcons(low.escapeHtml(subtitle)));
            m_subtitle = subtitle;
        }

        function subtitle()
        {
            return m_subtitle;
        }

        function addLeft(child)
        {
            m_header.find("> div.sh-left").append(child.get());
            m_left.push(child);
        }

        function left()
        {
            return m_left;
        }

        function addRight(child)
        {
            m_header.find("> div.sh-right").append(child.get());
            m_right.push(child);
        }

        function right()
        {
            return m_right;
        }

        this.get = function ()
        {
            return m_header;
        };

        tools.initAs(this, tools.VISUAL | tools.INTERACTIVE);
    };

});