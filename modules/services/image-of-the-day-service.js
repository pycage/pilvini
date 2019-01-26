"use strict";

var modHttp = require("http"),
    modUrl = require("url");

var Service = function (contentRoot)
{
    var m_currentBackground = null;
    var m_timestamp = 0;

    function sendBackground(response)
    {
        response.setHeader("Content-Length", m_currentBackground.length);
        response.setHeader("Content-Type", "image/jpeg");
        response.writeHeadLogged(200, "OK");
        response.write(m_currentBackground);
        response.end();
    }

    function serve(url, response)
    {
        var req = modHttp.get(modUrl.parse(url), function (res)
        {
            if (res.statusCode === 301)
            {
                serve(res.headers["location"], response);
                return;
            }

            var chunks = [];
            res.setEncoding("binary");
            res.on("data", function (chunk)
            {
                chunks.push(new Buffer(chunk, "binary"));
            });
            res.on("end", function ()
            {
                m_currentBackground = Buffer.concat(chunks);
                sendBackground(response);
            });
            res.on("error", function (error)
            {
                response.writeHeadLogged(500, "Internal Server Error " + error);
                response.end();
            });
        });
        req.end();
    }

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var now = Date.now();
        if (m_currentBackground && now < m_timestamp + 24 * 3600 * 1000)
        {
            sendBackground(response);
            return;
        }
              
        var options = {
            hostname: "bing.com",
            port: 80,
            path: "/HPImageArchive.aspx?format=js&idx=0&n=1",
            method: "GET",
            json: true
        };
        var req = modHttp.request(options, function(res)
        {
            res.setEncoding("utf8");
            res.on("data", function (data)
            {
                try
                {
                    var json = JSON.parse(data);
                    var url = json["images"][0].url;
                    console.log("url " + url);
                    serve("http://bing.com" + url, response);
                    m_timestamp = now;
                }
                catch (err)
                {
                    console.log(err);
                    console.log(data);
                    response.writeHeadLogged(500, "Internal Server Error");
                    response.end();
                }
            });
            res.on("error", function (error)
            {
                response.writeHeadLogged(500, "Internal Server Error");
                response.end();
            });
        });
        req.end();
    };
};
exports.Service = Service;