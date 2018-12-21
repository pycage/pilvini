"use strict";

var Service = function (contentRoot)
{
    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        if (request.method === "POST")
        {
            var user = request.headers["x-pilvini-user"];
            var password = request.headers["x-pilvini-password"];
         
            // generate auth code
            response.setHeader("X-Pilvini-Auth", "42");
            response.writeHeadLogged(200, "OK");
            response.end();
        }
    };
}
exports.Service = Service;
