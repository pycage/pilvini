"use strict";

require([__dirname + "/tools.js"], function (tools)
{

    function InternalDocument()
    {
        tools.defineProperties(this,
        {
            windowWidth: { get: windowWidth },
            windowHeight: { get: windowHeight }
        });

        var that = this;
        var m_windowWidth = $(window).width();
        var m_windowHeight = $(window).height();

        $(window).resize(function ()
        {
            var w = $(window).width();
            var h = $(window).height();

            if (w !== m_windowWidth)
            {
                m_windowWidth = w;
                that.windowWidthChanged();
            }

            if (h !== m_windowHeight)
            {
                m_windowHeight = h;
                that.windowHeightChanged();
            }
        });

        function windowWidth()
        {
            return m_windowWidth;
        }

        function windowHeight()
        {
            return m_windowHeight;
        }
    }

    var doc = new InternalDocument();


    exports.Document = function ()
    {
        tools.defineProperties(this,
        {
            windowWidth: { get: windowWidth },
            windowHeight: { get: windowHeight }
        });

        var that = this;
        var m_isAlive = true;

        function isAlive()
        {
            return m_isAlive;
        }

        doc.windowWidthChanged = tools.chainCallback(doc.windowWidthChanged, isAlive, function ()
        {
            that.windowWidthChanged();
        });

        doc.windowHeightChanged = tools.chainCallback(doc.windowHeightChanged, isAlive, function ()
        {
            that.windowHeightChanged();
        });

        function windowWidth()
        {
            return doc.windowWidth;
        }

        function windowHeight()
        {
            return doc.windowHeight;
        }

        this.discard = function ()
        {
            m_isAlive = false;
        };
    };

});