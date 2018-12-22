"use strict";

const modCrypto = require("crypto");

const modCookies = require("./cookies.js");

function md5(data)
{
    return modCrypto.createHash("md5").update(data).digest("hex");
}

exports.Authenticator = function(realm)
{
    var m_realm = realm;

    // mapping of auth code -> user name
    var m_authorizations = { };

    /* Generates and returns a new auth code.
     */
    function generateAuthCode()
    {
        var authCode = "";
        do
        {
            authCode = Math.floor(Math.random() * 16777216).toString(16) + "-" +
                       Math.floor(Math.random() * 16777216).toString(16) + "-" +
                       Math.floor(Math.random() * 16777216).toString(16);
        }
        while (m_authorizations[authCode] !== undefined);

        return authCode;
    }

    /* Logs in the user and returns an auth code.
     * Returns an empty string if login failed.
     */
    this.login = function (userName, password, users)
    {
        var passwordHash = md5(userName + ":" + m_realm + ":" + password);
        if (users[userName] !== undefined && (users[userName] === "" || users[userName] === passwordHash))
        {
            var authCode = generateAuthCode();
            m_authorizations[authCode] = userName;
            return authCode;
        }
        else
        {
            return "";
        }
    };

    /* Invalidates the given auth code.
     */
    this.logout = function (authCode)
    {
        delete m_authorizations[authCode];
    };

    this.authorize = function (request, users)
    {
        var authCookie = modCookies.getCookie(request, "AuthCode");
        var authCode = authCookie.value();

        var userName = m_authorizations[authCode];
        if (userName !== undefined && users[userName] !== undefined)
        {
            return userName;
        }
        else
        {
            return null;
        }
    };
};