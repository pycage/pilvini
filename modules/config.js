"use strict";

const modFs = require("fs");

exports.Config = function (configFile)
{
    const INITIAL_CONFIG = {
        "server": {
            "listen": "0.0.0.0",
            "port": 8000,
            "use_ssl": false,
            "ssl_certificate": "cert/server.cert",
            "ssl_key": "cert/server.key",
            "root": "/"
        },
    
        "authentication": {
            "method": "basic",
            "realm": "pilvini"
        },
    
        "users": [
            {
                "name": "admin",
                "password_hash": "03f07bc2191ffa8f6e3cad73446015f3",
                "home": "",
                "permissions": ["ADMIN"]
            }
        ],
    
        "global": {
            "debug": false
        }
    };
    

    var that = this;
    var m_configFile = configFile;

    function load()
    {
        try
        {
            return JSON.parse(modFs.readFileSync(m_configFile, "utf8"));
        }
        catch (err)
        {
            console.log("No configuration found. Using initial configuration.");
            console.log("");
            return INITIAL_CONFIG;
        }
    }

    this.write = function (callback)
    {
        modFs.writeFile(m_configFile, JSON.stringify(that.root, null, 4), "utf8", function (err)
        {
            if (err)
            {
                console.error("Failed to write configuration: " + err);
            }
            if (callback)
            {
                callback(err);
            }
        });
    };

    this.root = load();
};
