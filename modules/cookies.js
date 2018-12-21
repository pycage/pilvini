"use strict";

exports.getCookie = function(request, name)
{
    var cookieString = request.headers.cookie;
    console.log(cookieString);
    var cookie = new Cookie();
    if (cookieString)
    {
        var parts = cookieString.split(";");
        for (var i = 0; i < parts.length; ++i)
        {
            var cookieData = parts[i];
            var cookieParts = cookieData.split("=");

            if (cookieParts[0].replace(/^ /g, "") === name)
            {
                cookie.setName(name);
                cookie.setValue(cookieParts[1]);
                break;
            }
        }
    }
    return cookie;
};

exports.setCookie = function(response, cookie)
{
    // TODO: proper encoding
    var cookieString = cookie.name() + "=" + cookie.value();
    response.setHeader("Set-Cookie", cookieString);
};

var Cookie = function(name, value)
{
    var that = this;
    var m_name = name;
    var m_value = value;

    // TODO: attributes

    that.setName = function(name) { m_name = name; };
    that.name = function() { return m_name; };

    that.setValue = function(value) { m_value = value; };
    that.value = function() { return m_value; };
};
exports.Cookie = Cookie;
