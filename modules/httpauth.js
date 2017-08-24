"use strict";

const modCrypto = require("crypto");

exports.Authenticator = function(authType, users)
{
    var that = this;
    var m_authType = authType;
    var m_users = users;

    /* Authorizes the given request and returns whether the authorization was
     * successful.
     */
    that.authorize = function(request)
    {
        var authHeader = request.headers["authorization"];
        if (authHeader === undefined)
        {
            return null;
        }
        else if (m_authType === "Basic")
        {
            return basicAuth(authHeader);
        }
        else if (m_authType === "Digest")
        {
            return digestAuth(authHeader);
        }
        else
        {
            return null;
        }
    };

    /* Requests authorization on the given response for the given realm.
     */
    that.requestAuthorization = function(response, realm)
    {
        if (m_authType === "Basic")
        {
            response.writeHead(401,
                               {
                                   "WWW-Authenticate": "Basic realm=\"" + realm + "\""
                               });
        }
    };

    var basicAuth = function(authHeader)
    {
        if (authHeader.indexOf("Basic ") !== 0)
        {
            return null;
        }

        var parts = authHeader.split(" ");
        var token = new Buffer(parts[1], "base64").toString("utf8");
        var tokenParts = token.split(":");
        if (tokenParts.length !== 2)
        {
            return null;
        }

        var userName = tokenParts[0];
        var password = tokenParts[1];

        var hash = modCrypto.createHash("md5");
        hash.update(password);
        var passwordHash = hash.digest("hex");

        if (m_users[userName] && (m_users[userName] === "" || m_users[userName] === passwordHash))
        {
            return userName;
        }
        else
        {
            console.log("[" + new Date().toLocaleString() + "] [HttpBasicAuth] " +
                        "DENY user = " + userName);
            return null;
        }
    };

    var digestAuth = function(authHeader)
    {
        // TODO: implement
        return null;
    };
};
