"use strict";

var requireShared = require.main.exports.requireShared;

const modFs = require("fs"),
      modPath = require("path"),
      modUrl = require("url");

const modUtils = requireShared("utils");

exports.init = function (config)
{
    require.main.exports.registerService("jsbundle", new Service(config));
};


function Service(config)
{
    var m_bundle = "{ }";

    function updateJsBundle(resourceMap)
    {
        function findJs(prefix, location, path)
        {
            modFs.readdirSync(modPath.join(location, path)).forEach(function (name)
            {
                var filePath = modPath.join(path, name);
                var fullPath = modPath.join(location, filePath);
                var stats = modFs.statSync(fullPath);
                if (stats.isDirectory())
                {
                    findJs(prefix, location, filePath);
                }
                else if (name.endsWith(".js"))
                {
                    var js = modFs.readFileSync(fullPath).toString("utf-8");
                    jsBundle["/::res/" + modPath.join(prefix, filePath)] = js;
                }
            });
        }

        var jsBundle = { };

        for (var prefix in resourceMap)
        {
            var location = resourceMap[prefix];
            findJs(prefix, location, "/");
        }

        return JSON.stringify(jsBundle, null, "  ");
    }

    this.setResourceMap = function (map)
    {
        m_bundle = updateJsBundle(map);
    };

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        response.setHeader("Content-Length", m_bundle.length + 3);
        response.setHeader("Content-Type", "application/json");
        response.writeHeadLogged(200, "OK");
        response.write(m_bundle);
        response.end();

        callback();
    };
}
