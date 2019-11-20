"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.ListModel = function ListModel()
    {
        tools.defineProperties(this, {
            data: { set: setData, get: data },
            onReset: { set: setOnReset, get: onReset },
            onInsert: { set: setOnInsert, get: onInsert },
            onRemove: { set: setOnRemove, get: onRemove },
            size: { get: size }
        });

        var that = this;
        var m_data = [];
        var m_onReset = null;
        var m_onInsert = null;
        var m_onRemove = null;

        function setData(data)
        {
            that.reset(data);
        }

        function data()
        {
            return m_data.slice();
        }

        function setOnReset(cb)
        {
            m_onReset = cb;
        }

        function onReset()
        {
            return m_onReset;
        }

        function setOnInsert(cb)
        {
            m_onInsert = cb;
        }

        function onInsert()
        {
            return m_onInsert;
        }

        function setOnRemove(cb)
        {
            m_onRemove = cb;
        }

        function onRemove()
        {
            return m_onRemove;
        }

        function size()
        {
            return m_data.length;
        }

        this.reset = function (data)
        {
            m_data = data;
            that.sizeChanged();
            if (m_onReset)
            {
                m_onReset();
            }
        };

        this.insert = function (at, data)
        {
            if (at >= 0 && at <= m_data.length)
            {
                m_data = m_data.slice(0, at).concat([data]).concat(m_data.slice(at));
                that.sizeChanged();
                if (m_onInsert)
                {
                    m_onInsert(at);
                }
            }
        };

        this.remove = function (at)
        {
            if (at >= 0 && at < m_data.length)
            {
                m_data.splice(at, 1);
                that.sizeChanged();
                if (m_onRemove)
                {
                    m_onRemove(at);
                }
            }
        };

        this.at = function (n)
        {
            return m_data[n];
        };
    };

});