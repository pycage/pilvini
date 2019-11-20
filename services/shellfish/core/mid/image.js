"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.Image = function Image()
    {
        tools.defineProperties(this, {
            uri: { set: setUri, get: uri }
        });

        var m_uri = "";
        
        var m_item = $(
            low.tag("img")
            .html()
        );

        function setUri(uri)
        {
            m_uri = uri;
            m_item.prop("src", uri);
        }

        function uri()
        {
            return m_uri;
        }

        this.get = function ()
        {
            return m_item;
        };

        tools.initAs(this, tools.VISUAL);
    };

});