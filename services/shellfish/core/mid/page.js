"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{
   
    /* Element representing a page on the UI page stack.
     */
    exports.Page = function ()
    {
        tools.defineProperties(this, {
            header: { set: setHeader, get: header },
            footer: { set: setFooter, get: footer },
            left: { set: setLeft, get: left },
            right: { set: setRight, get: right },
            script: { set: setScript, get: script },
            onSwipeBack: { set: setOnSwipeBack, get: onSwipeBack },
            onClosed: { set: setOnClosed, get: onClosed }
        });

        var that = this;
        var m_header = null;
        var m_footer = null;
        var m_left = null;
        var m_right = null;
        var m_onSwipeBack = null;
        var m_onClosed = null;

        var m_page = $(
            low.tag("div").class("sh-page sh-hidden")
            .content(
                low.tag("section")
                .style("position", "relative")
            )
            .html()
        );

        function setHeader(header)
        {
            if (m_header)
            {
                m_header.get().detach();
            }
            m_page.append(header.get());
            m_header = header;
            that.updateGeometry();
        }

        function header()
        {
            return m_header;
        }

        function setFooter(footer)
        {
            if (m_footer)
            {
                m_footer.get().detach();
            }
            m_page.append(footer.get());
            m_footer = footer;
            that.updateGeometry();
        }

        function footer()
        {
            return m_footer;
        }

        function setLeft(left)
        {
            if (m_left)
            {
                m_left.get().detach();
            }
            m_page.append(left.get());
            m_left = left;
            that.updateGeometry();
        }

        function left()
        {
            return m_left;
        }

        function setRight(right)
        {
            if (m_right)
            {
                m_right.get().detach();
            }
            m_page.append(right.get());
            m_right = right;
            that.updateGeometry();
        }

        function right()
        {
            return m_right;
        }

        function setScript(uri)
        {
            m_page.append($(
                low.tag("script").attr("src", uri)
                .html()
            ));
        }

        function script()
        {
            return "";
        }

        function setOnSwipeBack(callback)
        {
            low.pageOnSwipe(m_page, callback);
            m_onSwipeBack = callback;
        }

        function onSwipeBack()
        {
            return m_onSwipeBack;
        }

        function setOnClosed(callback)
        {
            m_onClosed = callback;
        }

        function onClosed()
        {
            return m_onClosed;
        }

        this.get = function ()
        {
            return m_page;
        };

        this.add = function (child)
        {
            m_page.find("> section").append(child.get());
        };

        /* Pushes this page onto the page stack.
         */
        this.push = function (callback)
        {
            $("body").append(m_page);
            that.updateGeometry();
            low.pagePush(m_page, callback, $(".sh-page").length === 1);

            m_page.one("sh-closed", function ()
            {
                if (m_onClosed)
                {
                    m_onClosed();
                }
            });
        };

        /* Pops this page off the page stack.
         */
        this.pop = function (callback)
        {
            low.pagePop(function ()
            {
                m_page.detach();
                if (callback)
                {
                    callback();
                }
            });
        };

        /* Updates the page geometry.
         */
        this.updateGeometry = function ()
        {
            m_page.find("> section").css("padding-top", (!! m_header ? m_header.get().height() : 0) + "px");
            m_page.find("> section").css("padding-bottom", (!! m_footer ? m_footer.get().height() : 0) + "px");
            m_page.find("> section").css("padding-left", (!! m_left ? m_left.get().width() : 0) + "px");
            m_page.find("> section").css("padding-right", (!! m_right ? m_right.get().width() : 0) + "px");
        }
    };

});
