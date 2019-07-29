"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.ListView = function ()
    {
        tools.defineProperties(this, {
            size: { get: size }
        });

        var that = this;
        var m_items = [];

        var m_listView = $(
            low.tag("ul").class("sh-listview")
            .html()
        );

        function size()
        {
            return m_items.length;
        }

        this.get = function ()
        {
            return m_listView;
        };

        this.add = function (item)
        {
            m_items.push(item);
            m_listView.append(item.get());
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
                item.get().insertBefore(m_listView.find("> *")[at]);
                that.sizeChanged();
            }
        };

        this.remove = function (at)
        {
            if (at >= 0 && at < m_items.length)
            {
                m_items.splice(at, 1);
                m_listView.find("> *")[at].remove();
                that.sizeChanged();
            }
        };

        this.item = function (n)
        {
            return m_items[n];
        };

        this.clear = function ()
        {
            m_listView.html("");
            m_items = [];
            that.sizeChanged();
        };
    };

});
