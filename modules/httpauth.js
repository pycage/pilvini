"use strict";

const modCrypto = require("crypto");

function md5(data)
{
    return modCrypto.createHash("md5").update(data).digest("hex");
}

function parseDigestParameters(s)
{
    var result = { };

    var parts = s.split(",");
    for (var i = 0; i < parts.length; ++i)
    {
        var part = parts[i];
        var pos = part.indexOf("=");
        if (pos !== -1)
        {
            var key = part.substr(0, pos).trim();
            var value = part.substr(pos + 1).trim();
            if (value.startsWith("\"") && value.endsWith("\""))
            {
                value = value.substr(1, value.length - 2);
            }
            result[key] = value;
        }
    }
    return result;
}

exports.Authenticator = function(authType, realm)
{
    var that = this;
    var m_authType = authType;
    var m_realm = realm;

    /* Authorizes the given request and returns the user name if the
     * authorization was successful. Returns null otherwise.
     */
    that.authorize = function(request, users)
    {
        var authHeader = request.headers["authorization"];
        if (authHeader === undefined)
        {
            return null;
        }
        else if (m_authType === "Basic")
        {
            return basicAuth(authHeader, users);
        }
        else if (m_authType === "Digest")
        {
            return digestAuth(request, authHeader, users);
        }
        else
        {
            return null;
        }
    };

    /* Requests authorization on the given response for the given realm.
     */
    that.requestAuthorization = function(response)
    {
        if (m_authType === "Basic")
        {
            console.log("[" + new Date().toLocaleString() + "] [HttpBasicAuth] " +
                        "AUTH REQUEST");

            response.writeHead(401,
                               {
                                   "WWW-Authenticate": "Basic realm=\"" + m_realm + "\""
                               });
        }
        else if (m_authType === "Digest")
        {
            console.log("[" + new Date().toLocaleString() + "] [HttpDigestAuth] " +
                        "AUTH REQUEST");
            var nonce = Math.random();
            var opaque = md5(m_realm);
            response.writeHead(401,
                               {
                                   "WWW-Authenticate": "Digest realm=\"" + m_realm + "\", " +
                                                       "qop=\"auth\", " +
                                                       "nonce=\"" + nonce + "\", " +
                                                       "opaque=\"" + opaque + "\""
                               });
        }
    };

    var basicAuth = function(authHeader, users)
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
        var passwordHash = md5(userName + ":" + m_realm + ":" + password);

        if (users[userName] !== undefined && (users[userName] === "" || users[userName] === passwordHash))
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

    var digestAuth = function(request, authHeader, users)
    {
        if (authHeader.indexOf("Digest ") != 0)
        {
            return null;
        }

        var params = parseDigestParameters(authHeader.replace(/^Digest /, ""));

        if (! users[params.username])
        {
            // unknown user
            console.log("[" + new Date().toLocaleString() + "] [HttpDigestAuth] " +
                        "DENY user = " + params.username);
            return null;
        }

        var ha1 = users[params.username];
        var ha2 = md5(request.method + ":" + params.uri);
        var expected = md5([ha1, params.nonce, params.nc, params.cnonce, params.qop, ha2].join(":"));

        if (params.response !== expected)
        {
            // invalid client response
            console.log("[" + new Date().toLocaleString() + "] [HttpDigestAuth] " +
                        "DENY user = " + params.username);
            return null;
        }

        // passed
        return params.username;
    };
};
