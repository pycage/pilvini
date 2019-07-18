"use strict";

exports.__id = "shell/configuration";

require(__dirname + "/storage.js", function (st)
{
    var storage = st.storage;

    function Configuration()
    {
        var m_config = { };
    
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
        });
    };
    exports.configuration = new Configuration();
    console.log("configuration is available");
});
