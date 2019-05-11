"use strict";

var requireShared = require.main.exports.requireShared;

const modPath = require("path"),
      modUrl = require("url");

const modUtils = requireShared("utils");

exports.init = function (config)
{
    require.main.exports.registerService("res", new Service(config));
};

function Service(config)
{
    //var m_resourceRoot = modPath.join(require.main.exports.serverHome(), "res");
    var m_resourceMap = { };

    this.setResourceMap = function (map)
    {
        m_resourceMap = map;
    };

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);
        var res = urlObj.pathname.substr(7);

        for (var prefix in m_resourceMap)
        {
            if (res.startsWith(prefix + "/"))
            {
                var targetFile = modPath.normalize(m_resourceMap[prefix] + res.substr(res.indexOf("/")));
                if (targetFile.startsWith(m_resourceMap[prefix]))
                {
                    modUtils.getFile(response, targetFile);
                }
                else
                {
                    response.writeHeadLogged(403, "Forbidden");
                    response.end();
                }
                callback();
                return;
            }
        }

        response.writeHeadLogged(404, "Not found");
        response.end();
        callback();
    };
}
