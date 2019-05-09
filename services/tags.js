"use strict";

var requireShared = require.main.exports.requireShared;

const modUrl = require("url");

const modId3Tags = requireShared("id3tags"),
      modUtils = requireShared("utils");

exports.init = function (config)
{
    require.main.exports.registerService("tags", new Service(config));
};

function Service(config)
{
    var m_contentRoot = config.root.server.root;

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);
        var uri = urlObj.pathname.substr(7);
        console.log("URI: " + uri);
        var targetFile = modUtils.uriToPath(uri, m_contentRoot + userContext.home());
        var tagParser = new modId3Tags.Tags(targetFile);

        tagParser.read(function (err)
        {
            if (err)
            {
                response.writeHeadLogged(404, "Not found");
                response.end();
                callback();
            }
            else
            {
                var json = { };
                var keys = tagParser.keys();
                for (var i = 0; i < keys.length; ++i)
                {
                    var key = keys[i];
                    console.debug("Key: " + key);
                    json[key] = tagParser.get(key);
                }

                var data = Buffer.from(JSON.stringify(json));
                response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
                response.setHeader("Content-Type", "text/json");
                response.writeHeadLogged(200, "OK");
                response.write(data);
                response.end();
                callback();
            }
        });
    };
}
