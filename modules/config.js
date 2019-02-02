"use strict";

const modFs = require("fs");

exports.Config = function (configFile)
{
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
            console.error("Failed to read configuration: " + err);
            return { };
        }
    }

    this.write = function ()
    {
        modFs.writeFile(m_configFile, JSON.stringify(that.root, null, 4), "utf8", function (err)
        {
            if (err)
            {
                console.error("Failed to write configuration: " + err);
            }
        });
    };

    this.root = load();
};
