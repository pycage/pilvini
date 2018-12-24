"use strict";

const NON_CLOSE_TAGS = [
    "link",
    "meta",
    "br",
    "hr",
    "img",
    "input"
];

function escapeHtml(text)
{
    return text.replace(/[\"'&<>]/g, function (a)
    {
        return {
            '"': '&quot;',
            '\'': '&apos;',
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[a];
    });
}

function Tag(t)
{
    var that = this;
    var m_tag = t;
    var m_attrs = [];
    var m_style = [];
    var m_data = [];
    var m_content = [];

    this.attr = function (key, value)
    {
        m_attrs.push([key, value]);
        return that;
    };
    
    this.style = function (key, value)
    {
        m_style.push([key, value]);
        return that;
    };

    this.id = function (s)
    {
        m_attrs.push(["id", s]);
        return that;
    };
    
    this.class = function (c)
    {
        m_attrs.push(["class", c]);
        return that;
    };

    this.data = function (d, v)
    {
        m_attrs.push(["data-" + d, v]);
        return that;
    }

    this.on = function (ev, handler)
    {
        m_attrs.push(["on" + ev, handler]);
        return that;
    };

    this.content = function (c)
    {
        if (typeof c === "string")
        {
            m_content.push(new Data(c));
        }
        else
        {
            m_content.push(c);
        }
        return that;
    };

    this.child = function (n)
    {
        if (n >= 0)
        {
            return m_content[n];
        }
        else
        {
            return m_content[m_content.length + n];
        }
    };

    this.html = function ()
    {
        var out = "";
        if (m_tag !== "")
        {
            out += "<" + m_tag;
            m_attrs.forEach(function (a)
            {
                out += " " + a[0] + "=\"" + escapeHtml(a[1]) + "\"";
            });
            if (m_style.length > 0)
            {
                out += " style = \"";
                m_style.forEach(function (s)
                {
                    out += s[0] + ": " + s[1] + "; ";
                });
                out += "\"";
            }
            out += ">";
        }
        m_content.forEach(function (c)
        {
            out += c.html();
        });
        if (m_tag !== "")
        {
            if (NON_CLOSE_TAGS.indexOf(m_tag) === -1)
            {
                out += "</" + m_tag + ">\n";
            }
        }
        return out;
    };
}

function Data(d)
{
    var m_data = d;

    this.html = function ()
    {
        return m_data;
    }
}

function tag(t)
{
    return new Tag(t);
}

function data(d)
{
    return new Data(d);
}
