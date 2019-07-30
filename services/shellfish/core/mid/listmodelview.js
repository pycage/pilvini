"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js", __dirname + "/listview.js"], function (low, tools, listview)
{

    exports.ListModelView = function ()
    {    
        tools.defineProperties(this, {
            model: { set: setModel, get: model },
            delegate: { set: setDelegate, get: delegate }
        });

        var base = new listview.ListView();
        tools.extend(this, base);


        var m_model = null;
        var m_delegate = null;

        function setModel(m)
        {
            m_model = m;
            m.onReset = function ()
            {
                base.clear();
                for (var i = 0; !! m_delegate && i < m.size; ++i)
                {
                    var item = m_delegate(m.at(i));
                    base.add(item);
                }
            };
            m.onInsert = function (at)
            {
                var item = m_delegate(m.at(at));
                base.insert(at, item);
            };
            m.onRemove = function (at)
            {
                base.remove(at);
            };

            m.onReset();
        }

        function model()
        {
            return m_model;
        }

        function setDelegate(d)
        {
            m_delegate = d;
        }

        function delegate()
        {
            return m_delegate;
        }

        tools.initAs(this, tools.VISUAL);
    };

});
