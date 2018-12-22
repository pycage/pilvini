"use strict";

var Service = function (authenticator)
{
    var m_authenticator = authenticator;

    this.handleRequest = function (request, response, authUsers, authCode)
    {
        if (request.method === "POST")
        {
            var user = request.headers["x-pilvini-user"];
            var password = request.headers["x-pilvini-password"];
         
            if (user === "")
            {
                // empty user name logs out; invalidating the auth code
                m_authenticator.logout(authCode);
                console.debug("Logging out: " + authCode);
                response.writeHeadLogged(200, "OK");
                response.end();
            }
            else
            {
                // generate auth code
                var authCode = m_authenticator.login(user, password, authUsers);

                if (authCode !== "")
                {
                    // login OK
                    response.setHeader("X-Pilvini-Auth", authCode);
                    response.writeHeadLogged(200, "OK");
                    response.end();
                }
                else
                {
                    // invalid login
                    response.writeHeadLogged(403, "Access Denied");
                    response.end();                    
                }
            }
        }
    };
}
exports.Service = Service;
