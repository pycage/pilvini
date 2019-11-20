"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.GridView = function GridView()
    {
        tools.defineProperties(this, {
            size: { get: size }
        });

        var that = this;
        var m_items = [];

        var m_gridView = $(
            low.tag("div")
            .style("display", "flex")
            .style("flex-direction", "row")
            .style("flex-wrap", "wrap")
            .style("justify-content", "flex-start")
            .html()
        );

        function size()
        {
            return m_items.length;
        }

        this.get = function ()
        {
            return m_gridView;
        };

        this.add = function (item)
        {
            m_items.push(item);
            m_gridView.append(item.get());
            that.sizeChanged();
        };

        this.insert = function (at, item)
        {
            if (at === m_items.length)
            {
                that.add(item);
            }
            else if (at >= 0 && at < m_items.length)
            {
                m_items = m_items.slice(0, at).concat([item]).concat(m_items.slice(at));
                item.get().insertBefore(m_gridView.find("> *")[at]);
                that.sizeChanged();
            }
        };

        this.remove = function (at)
        {
            if (at >= 0 && at < m_items.length)
            {
                m_items.splice(at, 1);
                m_gridView.find("> *")[at].remove();
                that.sizeChanged();
            }
        };

        this.indexOf = function (item)
        {
            for (var i = 0; i < m_items.length; ++i)
            {
                if (m_items[i] === item)
                {
                    return i;
                }
            }
            return -1;
        };

        this.item = function (n)
        {
            return m_items[n];
        };

        this.scrollTo = function (item)
        {
            for (var i = 0; i < m_items.length; ++i)
            {
                if (m_items[i] === item)
                {
                    $(document).scrollTop(item.get().offset().top - $(window).height() / 2);
                }
            }
        };

        this.clear = function ()
        {
            m_gridView.html("");
            m_items = [];
            that.sizeChanged();
        };

        tools.initAs(this, tools.VISUAL);
    };

});