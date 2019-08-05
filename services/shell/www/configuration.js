"use strict";

exports.__id = "shell/configuration";

require(["shellfish/mid", __dirname + "/storage.js"], function (mid, st)
{
    var storage = st.storage;

    function Configuration()
    {
        mid.defineProperties(this, {
            onLoaded: { set: setOnLoaded, get: onLoaded }
        });

        var m_config = { };
        var m_isLoaded = false;
        var m_onLoaded = null;
    
        function setOnLoaded(cb)
        {
            m_onLoaded = cb;

            if (m_isLoaded && cb)
            {
                cb();
            }
        }

        function onLoaded()
        {
            return m_onLoaded;
        }

        this.get = function (key, defaultValue)
        {
            return m_config[key] || defaultValue;
        };
    
        this.set = function (key, value)
        {
            m_config[key] = value;
            storage.store("configuration", m_config, function () { });
        };
    
        storage.load("configuration", function (data)
        {
            m_config = data || { };

            m_isLoaded = true;
            if (m_onLoaded)
            {
                m_onLoaded();
            }
        });
    };
    exports.configuration = new Configuration();
});
