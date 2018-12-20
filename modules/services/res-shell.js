"use strict";

const modUrl = require("url");

const modBrowser = require("../browser.js");

var Service = function (contentRoot)
{
    var m_contentRoot = contentRoot;

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        function cb (ok, data)
        {
            if (! ok)
            {
                response.writeHeadLogged(404, "Not found");
                response.end();
                callback();
            }
            else
            {
                response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
                response.writeHeadLogged(200, "OK");
                response.write(data);
                response.end();
                callback();
            }
        }
        
        var urlObj = modUrl.parse(request.url, true);
        if (urlObj.search.indexOf("ajax") !== -1)
        {
            var uri = urlObj.pathname.substr(8);
            modBrowser.createMainPage("/::shell", uri, m_contentRoot, userContext, shares, cb);
        }
        else
        {
            modBrowser.makeIndex("/::shell", "/", m_contentRoot, userContext, shares, cb);
        }
    };
};
exports.Service = Service;