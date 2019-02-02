"use strict";

const modCrypto = require("crypto"),
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
            if (uri === "/users")
            {
                var obj = { };
                obj.users = m_config.root.users.map(function (item)
                {
                    return {
                        "name": item.name,
                        "home": item.home
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
            if (uri === "/create-user")
            {
                var user = request.headers["x-pilvini-user"] || "";
                var password = request.headers["x-pilvini-password"] || "";
                var home = request.headers["x-pilvini-home"] || "";

                var hash = modCrypto.createHash("md5");
                hash.update(user + ":pilvini:" + password);
                var passwordHash = hash.digest("hex");

                m_config.root.users.push({
                    "name": user,
                    "password_hash": passwordHash,
                    "home": userContext.home() + home
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
