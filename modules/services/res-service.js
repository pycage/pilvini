"use strict";

const modPath = require("path"),
      modUrl = require("url");

const modUtils = require("../utils.js");

var Service = function (contentRoot, resourceRoot)
{
    var m_contentRoot = contentRoot;
    var m_resourceRoot = resourceRoot;

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);
        var res = urlObj.pathname.substr(7);
        var targetFile = modPath.join(m_resourceRoot, res);
        modUtils.getFile(response, targetFile);
        callback();
    };
};
exports.Service = Service;