"use strict";

var requireShared = require.main.exports.requireShared;

const modFs = require("fs"),
      modPath = require("path"),
      modUrl = require("url"),
      modZlib = require("zlib");

const modUtils = requireShared("utils");

exports.init = function (config)
{
    require.main.exports.registerService("jsbundle", new Service(config));
};


function Service(config)
{
    var m_bundle = "{ }";
    var m_compressedBundle = null;

    function updateJsBundle(resourceMap)
    {
        function findJs(prefix, location, path)
        {
            modFs.readdirSync(modPath.join(location, path)).forEach(function (name)
            {
                var filePath = modPath.join(path, name);
                var fullPath = modPath.join(location, filePath);
                var stats = modFs.statSync(fullPath);
                if (stats.isDirectory() && name !== "pdfjs" /* Hack: do not bundle pdfjs; it's not a module */)
                {
                    findJs(prefix, location, filePath);
                }
                else if (name.endsWith(".js"))
                {
                    var js = modFs.readFileSync(fullPath).toString("binary" /* as is */);
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

        return JSON.stringify(jsBundle);
    }

    this.setResourceMap = function (map)
    {
        m_bundle = updateJsBundle(map);

        var buffer = Buffer.from(m_bundle, "binary");
        modZlib.gzip(buffer, function(err, outBuffer)
        {
            m_compressedBundle = outBuffer;
        });
    };

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Content-Encoding", "gzip");
        
        if (m_compressedBundle && request.headers["accept-encoding"].indexOf("gzip") !== -1)
        {
            response.setHeader("Content-Length", m_compressedBundle.length);
            response.writeHeadLogged(200, "OK");
            response.write(m_compressedBundle);
            response.end();
            callback();
        }
        else
        {
            response.setHeader("Content-Length", m_bundle.length);
            response.writeHeadLogged(200, "OK");
            response.write(Buffer.from(m_bundle, "binary" /* as is */));
            response.end();
            callback();
        }
    };
}
