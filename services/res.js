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
    var m_resourceRoot = modPath.join(require.main.exports.serverHome(), "res");

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);
        var res = urlObj.pathname.substr(7);
        var targetFile = modPath.join(m_resourceRoot, res);
        modUtils.getFile(response, targetFile);
        callback();
    };
}