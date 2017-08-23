"use strict";

/* Creates a XML SAX parser using the given handler for invoking callbacks.
 */
exports.Parser = function(handler)
{
    var that = this;

    var m_handler = handler;

    function throwError(pos, description)
    {
        throw { "pos": pos, "description": description };
    }

    /* Parses the given string.
     */
    that.parseString = function(data)
    {
        try
        {
            parseDocument(data, 0);
        }
        catch (err)
        {
            m_handler.error(err.pos, err.description);
        }
    };

    function eatWhitespace(data, pos)
    {
        while (pos < data.length && " \n\r\t".indexOf(data[pos]) !== -1)
        {
            ++pos;
        }
        return pos;
    }

    function accept(data, pos, s)
    {
        if (pos >= data.length || data.substring(pos, pos + s.length) !== s)
        {
            throwError(pos, s + " expected: " + data.substring(pos, pos + 16));
        }
        return pos + s.length;
    }

    function parseDocument(data, pos)
    {
        pos = eatWhitespace(data, pos);

        if (pos < data.length && data.substring(pos, pos + 2) === "<?")
        {
            pos = parseHeader(data, pos);
        }

        pos = eatWhitespace(data, pos);

        while (pos < data.length)
        {
            if (data.substring(pos, pos + 4) === "<!--")
            {
                pos = parseComment(data, pos);
            }
            else if (data.substring(pos, pos + 8) === "<![CDATA[")
            {
                pos = parseCData(data, pos);
            }
            else if (data[pos] === "<")
            {
                pos = parseTag(data, pos);
            }
            else
            {
                pos = parsePCData(data, pos);
            }
            pos = eatWhitespace(data, pos);
        }

        m_handler.end();
    }

    function parseHeader(data, pos)
    {
        pos = accept(data, pos, "<?");
        pos = eatWhitespace(data, pos);

        var res = parseName(data, pos);
        var name = res.name;
        pos = res.pos;
        //console.log("header name: " + name);

        pos = eatWhitespace(data, pos);

        while (pos < data.length && data.substring(pos, pos + 2) !== "?>")
        {
            res = parseAttribute(data, pos);
            var attrName = res.name;
            var attrValue = res.value;
            pos = res.pos;
            pos = eatWhitespace(data, pos);
        }

        pos = accept(data, pos, "?>");
        return pos;
    }

    function parseTag(data, pos)
    {
        var isOpening = true;
        var isClosing = false;

        pos = accept(data, pos, "<");
        if (pos < data.length && data[pos] === "/")
        {
            pos = accept(data, pos, "/");
            isOpening = false;
            isClosing = true;
        }
        pos = eatWhitespace(data, pos);
        var res = parseName(data, pos);
        var name = res.name;
        pos = res.pos;

        pos = eatWhitespace(data, pos);

        var attrs = { };

        while (pos < data.length && data[pos] !== "/" && data[pos] !== ">")
        {
            res = parseAttribute(data, pos);
            var attrName = res.name;
            var attrValue = res.value;
            attrs[attrName] = attrValue;
            pos = res.pos;
            pos = eatWhitespace(data, pos);
        }

        if (data[pos] === "/")
        {
            pos = accept(data, pos, "/");
            isClosing = true;
        }

        pos = eatWhitespace(data, pos);
        pos = accept(data, pos, ">");

        m_handler.tag(name, attrs, isOpening, isClosing);

        return pos;
    }

    function parseComment(data, pos)
    {
        pos = accept(data, pos, "<!--");

        var comment = "";
        while (pos < data.length && data.substring(pos, pos + 3) !== "-->")
        {
            comment += data[pos];
            ++pos;
        }

        pos = accept(data, pos, "-->");

        m_handler.comment(comment);

        return pos;
    }

    function parseCData(data, pos)
    {
        pos = accept(data, pos, "<![CDATA[");
        var cdata = "";
        while (pos < data.length && data.substring(pos, pos + 3) !== "]]>")
        {
            cdata += data[pos];
            ++pos;
        }

        pos = accept(data, pos, "]]>");

        m_handler.cdata(cdata);

        return pos;
    }

    function parsePCData(data, pos)
    {
        var pcdata = "";
        while (pos < data.length && data[pos] !== "<")
        {
            pcdata += data[pos];
            ++pos;
        }

        m_handler.pcdata(pcdata);

        return pos;
    }

    function parseName(data, pos)
    {
        var name = "";
        while (pos < data.length && data[pos].match(/[a-zA-Z0-9:]/))
        {
            name += data[pos];
            ++pos;
        }

        if (name === "")
        {
            throwError(pos, "unexpected character");
        }

        return { "name": name, "pos": pos };
    }

    function parseAttribute(data, pos)
    {
        var res = parseName(data, pos);
        var name = res.name;
        var value = null;
        pos = res.pos;
        pos = eatWhitespace(data, pos);
        if (pos < data.length && data[pos] === "=")
        {
            pos = accept(data, pos, "=");
            pos = eatWhitespace(data, pos);
            res = parseValue(data, pos);
            value = res.value;
            pos = res.pos;
        }

        return { "name": name, "value": value, "pos": pos };
    }

    function parseValue(data, pos)
    {
        var value = "";

        if (data[pos] === "'")
        {
            pos = accept(data, pos, "'");
            while (pos < data.length && data[pos] !== "'")
            {
                value += data[pos];
                ++pos;
            }
            pos = accept(data, pos, "'");
        }
        else if (data[pos] === "\"")
        {
            pos = accept(data, pos, "\"");
            while (pos < data.length && data[pos] !== "\"")
            {
                value += data[pos];
                ++pos;
            }
            pos = accept(data, pos, "\"");
        }
        else
        {
            while (pos < data.length && data[pos].match(/^[ \r\n\t/>]/))
            {
                value += data[pos];
                ++pos;
            }
        }

        return { "value": value, "pos": pos };
    }
};



exports.Handler = function()
{
    var that = this;

    var m_document = null;
    var m_stack = [];

    function resolveNamespace(name, attrs)
    {
        var ns = "";
        if (name.indexOf(":") !== -1)
        {
            var parts = name.split(":");
            ns = parts[0];
            name = parts[1];
        }

        if (ns === "" && attrs["xmlns"])
        {
            return attrs["xmlns"] + ":" + name;
        }
        else if (attrs["xmlns:" + ns])
        {
            return attrs["xmlns:" + ns] + ":" + name;
        }

        for (var i = m_stack.length - 1; i >= 0; --i)
        {
            if (ns === "" && m_stack[i].attributes["xmlns"])
            {
                return m_stack[i].attributes["xmlns"] + ":" + name;
            }
            else if (m_stack[i].attributes["xmlns:" + ns])
            {
                return m_stack[i].attributes["xmlns:" + ns] + ":" + name;
            }
        }
        return name;
    }

    that.tag = function(name, attrs, isOpening, isClosing)
    {
        var resolvedAttrs = {};
        for (var key in attrs)
        {
            if (attrs.hasOwnProperty(key))
            {
                if (key.indexOf("xmlns") === 0)
                {
                    resolvedAttrs[key] = attrs[key];
                }
                else
                {
                    resolvedAttrs[resolveNamespace(key, attrs)] = attrs[key];
                }
            }
        }

        var tagObj = {
            "type": "tag",
            "name": resolveNamespace(name, attrs),
            "attributes": resolvedAttrs,
            "children": []
        };

        if (m_document === null)
        {
            m_document = tagObj;
            m_stack.push(tagObj);
        }
        else
        {
            if (isOpening)
            {
                var parent = m_stack[m_stack.length - 1];
                parent.children.push(tagObj);
                m_stack.push(tagObj);
            }
            if (isClosing)
            {
                var current = m_stack[m_stack.length - 1];
                if (tagObj.name === current.name)
                {
                    m_stack.pop();
                }
                else
                {
                    console.log("nesting error: " + tagObj.name);
                }
            }
        }
    };

    that.pcdata = function(pcdata)
    {
        var obj = {
            "type": "pcdata",
            "data": pcdata
        };
        var parent = m_stack[m_stack.length - 1];
        parent.children.push(obj);
    };

    that.cdata = function(cdata)
    {
        var obj = {
            "type": "cdata",
            "data": cdata
        };
        var parent = m_stack[m_stack.length - 1];
        parent.children.push(obj);
    };

    that.comment = function(comment)
    {
        console.log("Comment: " + comment);
    };

    that.end = function()
    {
        //console.log("Finished: " + JSON.stringify(m_document));
    };

    that.error = function(pos, description)
    {
        console.log("Parse error at position " + pos + ": " + description);
        m_document = null;
    };

    that.document = function() { return m_document; }
};
