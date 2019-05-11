"use strict";

var requireShared = require.main.exports.requireShared;

const modPath = require("path"),
      modUrl = require("url");

const modBrowser = require("./shell/browser.js");

exports.init = function (config)
{
    require.main.exports.registerService("shell", new Service(config));
    require.main.exports.registerResource("shell", modPath.join(__dirname, "shell", "www"));
};

function Service(config)
{
    var m_contentRoot = config.root.server.root;
    var m_extensions = [];

    this.setExtensions = function (ext)
    {
        m_extensions = ext;
    };

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);

        if (request.method === "GET")
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
            
            var uri = urlObj.pathname.substr("/::shell".length);
            if (uri === "")
            {
                uri = "/";
            }
            
            if (urlObj.search && urlObj.search.indexOf("json") !== -1)
            {
                modBrowser.makeJson(uri, m_contentRoot, userContext, shares, cb);
            }
            else
            {
                modBrowser.makeIndex(m_extensions, cb);
            }
        }
        else if (request.method === "POST")
        {
            if (urlObj.pathname === "/::shell/login")
            {
                var user = request.headers["x-pilvini-user"];
                var password = request.headers["x-pilvini-password"];
             
                response.setHeader("X-Pilvini-Access", "42");
                response.writeHeadLogged(200, "OK");
            }
        }
        else
        {
            // unknown method or missing permission
            response.writeHeadLogged(405, "Method Not Allowed");
    	    response.end();
        }
    };

    this.requestLogin = function (response, callback)
    {
        function cb (data)
        {
            response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
            response.writeHead(200, "OK");
            response.write(data);
            response.end();
            callback();
        }

        modBrowser.makeLoginPage(cb);
    };
}
