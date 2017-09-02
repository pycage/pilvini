var VC_PROPERTIES = ["SOURCE",
                     "KIND",
                     "FN",
                     "N",
                     "NICKNAME",
                     "PHOTO",
                     "BDAY",
                     "ANNIVERSARY",
                     "GENDER",
                     "ADR",
                     "TEL",
                     "EMAIL",
                     "IMPP",
                     "LANG",
                     "TZ",
                     "GEO",
                     "TITLE",
                     "ROLE",
                     "LOGO",
                     "ORG",
                     "MEMBER",
                     "RELATED",
                     "CATEGORIES",
                     "NOTE",
                     "PRODID",
                     "REV",
                     "SOUND",
                     "UID",
                     "CLIENTPIDMAP",
                     "URL",
                     "KEY",
                     "FBURL",
                     "CALADRURI",
                     "CALURI",
                     "XML"];

function loadVCard(href)
{
    var page = $("#viewer-page");
    $.mobile.loading("show");

    var settings = {
        beforeSend: function (xhr) { xhr.overrideMimeType("text/vcard"); }
    };

    $.ajax(href, settings)
    .done(function (data, status, xhr)
    {
        var listView = page.find(".ui-content ul");

        var coll = new VCardCollection(data);
        var cards = coll.cards();
        for (var i = 0; i < cards.length; ++i)
        {
            var card = cards[i];

            var fn = card.prefOf("FN");
            var org = card.prefOf("ORG");
            var tel = card.prefOf("TEL");
            var mail = card.prefOf("EMAIL");
            var photo = card.prefOf("PHOTO");

            var html = "";
            html += "<li data-icon='false'>";
            html += "<a href=''>";
            html += "<img style='width: 80px; background-repeat: no-repeat; background-position: 50% 50%;' src='/::res/file-icons/empty.png'/>";
            html += fn.value();
            if (org)
            {
                html += " (" + org.value().replace(";", " ") + ")";
            }
            html += "<p>";
            if (tel)
            {
                html += "<b>Phone</b> " + tel.value()+ " ";
            }
            if (mail)
            {
                html += "<b>e-Mail</b> " + mail.value() + " ";
            }
            html += "</p>";
            html += "</a>";
            html += "</li>";

            var li = $(html);

            var img = li.find("img");
            if (photo)
            {
                var pic = "data:image/jpeg;base64," + photo.value();
                img.css("background-image", "url(" + pic + ")");
                img.css("background-size", "cover");
            }
            else
            {
                img.css("background-image", "url(/::res/icons/face.png)");
                img.css("background-size", "48px");

            }

            listView.append(li);
        }
    })
    .complete(function ()
    {
        var listView = page.find(".ui-content ul");
        listView.listview().listview("refresh");
        $.mobile.loading("hide");
    });
}

function viewVCard(href)
{
    var page = $("#viewer-page");
    page.find(".ui-content").html("<ul data-role='listview'></ul>");

    loadVCard(href);

    $.mobile.navigate("#viewer-page");
}

function VCProperty(group, name, parameters, value)
{
    var that = this;
    var m_group = group;
    var m_name = name;
    var m_parameters = parameters;
    var m_value = value;

    that.group = function ()
    {
        return m_group;
    }

    that.name = function ()
    {
        return m_name;
    }

    that.value = function ()
    {
        return m_value;
    }
}

function VCard()
{
    var that = this;
    var m_properties = [];

    that.add = function (group, name, parameters, values)
    {
        name = name.toUpperCase();

        for (var i = 0; i < values.length; ++i)
        {
            m_properties.push(new VCProperty(group, name, parameters, values[i]));
        }

        console.log("Add: " + name);
        for (i = 0; i < parameters.length; ++i)
        {
            console.log(" - parameter: " + parameters[i]);
        }
        for (i = 0; i < values.length; ++i)
        {
            console.log(" - value: " + values[i]);
        }
    };

    that.properties = function ()
    {
        m_properties.sort(function (a, b)
        {
            if (a.group() !== "" && b.group() === "")
            {
                return -1;
            }
            else if (a.group() === "" && b.group() !== "")
            {
                return 1;
            }
            else if (a.group() === b.group())
            {
                return VC_PROPERTIES.indexOf(a.name()) - VC_PROPERTIES.indexOf(b.name());
            }
            else
            {
                return a.group() < b.group() ? -1 : 1;
            }
        });

        return m_properties;
    };

    that.allOf = function (name)
    {
        var result = [];
        var props = that.properties();
        for (var i = 0; i < props.length; ++i)
        {
            if (props[i].name() === name)
            {
                result.push(props[i]);
            }
        }
        return result;
    };

    that.prefOf = function (name)
    {
        return that.allOf(name)[0];
    };
}

function VCardCollection(data)
{
    var that = this;
    var m_vcards = [];

    that.cards = function ()
    {
        return m_vcards;
    }

    function skipWhitespace(data, pos)
    {
        while (pos.value < data.length &&
               '\t\n\r\v '.indexOf(data[pos.value]) !== -1)
        {
            ++pos.value;
        }
    }

    function next(data, pos, what)
    {
        return data.substr(pos.value, what.length) === what;
    }

    function expect(data, pos, what)
    {
        if (data.substr(pos.value, what.length) === what)
        {
            pos.value += what.length;
        }
        else
        {
            throw "Parse error @" + pos.value + ": '" + what + "' expected.";
        }
    }

    function readUntil(data, pos, chars)
    {
        var s = "";
        while (pos.value < data.length && chars.indexOf(data[pos.value]) === -1)
        {
            s += data[pos.value];
            ++pos.value;
        }
        return s;
    }

    function readUntilNewline(data, pos)
    {
        var s = readUntil(data, pos, "\r\n");
        if (pos.value < data.length && data[pos.value] === "\r")
        {
            expect(data, pos, "\r");
            expect(data, pos, "\n");
        }
        else if (pos.value < data.length && data[pos.value] === "\n")
        {
            expect(data, pos, "\n");
        }
        return s;
    }

    function readString(data, pos)
    {
        if (pos.value >= data.length)
        {
            return "";
        }

        var delimiter = "";
        if (data[pos.value] === "'")
        {
            delimiter = "'";
            ++pos.value;
        }
        else if (data[pos.value] === "\"")
        {
            delimiter = "\"";
            ++pos.value;
        }

        var result = "";
        while (pos.value < data.length)
        {
            if (delimiter !== "" && data[pos.value] === delimiter)
            {
                ++pos.value;
                break;
            }
            else if (delimiter === "" && '\t\n\r\v '.indexOf(data[pos.value]) !== -1)
            {
                break;
            }
            else if (data[pos.value] === "\\")
            {

            }
            else
            {
                result += data[pos.value];
            }
            ++pos.value;
        }

        return result;
    }

    function parseVCards(data)
    {
        var pos = { "value": 0 };

        skipWhitespace(data, pos);
        while (pos.value < data.length)
        {
            parseVCard(data, pos);
            skipWhitespace(data, pos);
        }
    }

    function parseVCard(data, pos)
    {
        var vcard = new VCard();

        expect(data, pos, "BEGIN:VCARD");
        skipWhitespace(data, pos);
        expect(data, pos, "VERSION:");
        var version = readString(data, pos);
        console.log("VCard Version: " + version);

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos);
            if (next(data, pos, "END:VCARD"))
            {
                break;
            }
            else
            {
                parseEntry(data, pos, vcard);
            }
        }

        expect(data, pos, "END:VCARD");

        m_vcards.push(vcard);
    }

    function parseEntry(data, pos, vcard)
    {
        var prop = parseProperty(data, pos);
        expect(data, pos, ":");
        var values = parseValues(data, pos);
        expect(data, pos, "\r\n");

        vcard.add(prop.group, prop.name, prop.parameters, values);
    }

    function parseProperty(data, pos)
    {
        var group = "";
        var parts = [];

        while (pos.value < data.length)
        {
            var s  = readUntil(data, pos, ".;:");
            if (next(data, pos, "."))
            {
                group = s;
                s = "";
                expect(data, pos, ".");
            }
            else if (next(data, pos, ";"))
            {
                parts.push(s);
                s = "";
                expect(data, pos, ";");
            }
            else if (next(data, pos, ":"))
            {
                parts.push(s);
                break;
            }
        }

        var name = parts[0];
        var parameters = [];
        for (var i = 1; i < parts.length; ++i)
        {
            parameters.push(parts[i]);
        }

        return { "group": group, "name": name, "parameters": parameters };
    }

    function parseValues(data, pos)
    {
        var values = [];
        var s = "";
        while (pos.value < data.length)
        {
            s += readUntil(data, pos, "\\,\r");
            if (next(data, pos, "\\"))
            {
                expect(data, pos, "\\");
                if (next(data, pos, "n"))
                {
                    expect(data, pos, "n");
                    s += "\n";
                }
                else if (next(data, pos, "N"))
                {
                    expect(data, pos, "N");
                    s += "\n";
                }
            }
            else if (next(data, pos, ","))
            {
                expect(data, pos, ",");
                values.push(s);
                s = "";
            }

            else if (next(data, pos, "\r"))
            {
                values.push(s);
                break;
            }
        }

        return values;
    }

    console.log("Parsing VCards");
    try
    {
        parseVCards(data.replace(/\r\n /g, "").replace(/\r\n\t/g, ""));
    }
    catch (err)
    {
        console.error(err);
    }
}
