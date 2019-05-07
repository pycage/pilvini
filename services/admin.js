"use strict";

const modCrypto = require("crypto"),
      modProcess = require("process"),
      modUrl = require("url");

exports.Service = function (config)
{
    var m_config = config;

    function send(response, data, callback)
    {
        response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
        response.writeHeadLogged(200, "OK");
        response.write(data);
        response.end();
    }

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        if (! userContext.mayAdmin())
        {
            response.writeHeadLogged(403, "Forbidden");
            response.end();
            callback();
            return;
        }

        var urlObj = modUrl.parse(request.url, true);
        var uri = urlObj.pathname.substr("/::admin".length);

        if (request.method === "GET")
        {
            if (uri === "/server")
            {
                var obj = m_config.root.server;
                send(response, JSON.stringify(obj), callback);
            }
            else if (uri === "/users")
            {
                var obj = { };
                obj.users = m_config.root.users.map(function (item)
                {
                    return {
                        "name": item.name,
                        "home": item.home,
                        "permissions": item.permissions || []
                    };
                });
                send(response, JSON.stringify(obj), callback);
            }
            else
            {
                response.writeHeadLogged(403, "Forbidden");
                response.end();
                callback();    
            }
        }
        else if (request.method === "POST")
        {
            if (uri === "/configure-server")
            {
                var json = "";
                request.on("data", function (chunk) { json += chunk; });
                request.on("end", function ()
                {
                    var config = JSON.parse(json);
                    console.log(json);
                    if (config.listen) m_config.root.server.listen = config.listen;
                    if (config.port) m_config.root.server.port = config.port;
                    if (config.use_ssl) m_config.root.server.use_ssl = config.use_ssl;
                    if (config.root) m_config.root.server.root = config.root;
                    m_config.write(function (err)
                    {
                        if (err)
                        {
                            response.writeHeadLogged(500, "Internal Server Error");
                            response.end();
                            callback();
                        }
                        else
                        {
                            response.writeHeadLogged(201, "Created");
                            response.end();
                            callback();
                            modProcess.exit(0);
                        }
                    });
                });
            }
            else if (uri === "/create-user")
            {
                var user = request.headers["x-pilvini-user"] || "";
                var password = request.headers["x-pilvini-password"] || "";
                var home = request.headers["x-pilvini-home"] || "";
                var permissions = request.headers["x-pilvini-permissions"] || "";

                var hash = modCrypto.createHash("md5");
                hash.update(user + ":pilvini:" + password);
                var passwordHash = hash.digest("hex");

                m_config.root.users.push({
                    "name": user,
                    "password_hash": passwordHash,
                    "home": userContext.home() + home,
                    "permissions": permissions.split(" ")
                });
                m_config.write();
                response.writeHeadLogged(201, "Created");
                response.end();
                callback();
            }
            else if (uri === "/delete-user")
            {
                var user = request.headers["x-pilvini-user"] || "";

                for (var i = 0; i < m_config.root.users.length; ++i)
                {
                    if (m_config.root.users[i].name === user)
                    {
                        m_config.root.users.splice(i, 1);
                        m_config.write();
                        break;
                    }
                }

                response.writeHeadLogged(204, "Deleted");
                response.end();
                callback();
            }
            else
            {
                response.writeHeadLogged(403, "Forbidden");
                response.end();
                callback();    
            }
        }
    };
};
