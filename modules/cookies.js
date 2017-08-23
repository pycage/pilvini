"use strict";

exports.getCookie = function(request, name)
{
    // TODO: proper parsing
    var cookieString = request.headers.cookie;
    var cookie = new Cookie();
    if (cookieString)
    {
        var parts = cookieString.split("=");
        //console.log("Parsing cookie: " + parts[0] + " = " + parts[1]);
        cookie.setName(parts[0]);
        cookie.setValue(parts[1]);
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
