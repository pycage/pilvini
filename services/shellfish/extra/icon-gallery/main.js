"use strict";

const mods = [
    "../../preload.js",
    "shellfish/low",
    "shellfish/mid",
    "shellfish/high"
];

require(mods, function (pre, low, mid, high)
{
    function IconItem()
    {
        mid.defineProperties(this, {
            name: { set: setName, get: name },
            code: { set: setCode, get: code }
        });

        var m_name = "";
        var m_code = "";

        var m_item = $(
            low.tag("div")
            .style("position", "relative")
            .style("width", "180px")
            .style("height", "120px")
            .style("padding", "0").style("margin", "0")
            .style("margin-top", "2px")
            .style("margin-left", "2px")
            .style("text-align", "center")
            .style("overflow", "hidden")
            .content(
                low.tag("span")
                .style("display", "inline-block")
                .style("line-height", "120px")
                .style("font-size", "64px")
            )
            .content(
                low.tag("h1")
                .style("position", "absolute")
                .style("background-color", "var(--color-primary-background-translucent)")
                .style("padding", "0")
                .style("left", "0")
                .style("right", "0")
                .style("bottom", "0")
                .style("font-size", "64%")
                .style("text-align", "center")
                .content("")
            )
            .html()
        );

        function update()
        {
            m_item.find("h1").html(low.escapeHtml(m_name + " [" + m_code + "]"));
        }

        function setName(name)
        {
            m_name = name;
            m_item.find("span").html(low.resolveIcons("[icon:" + name + "]"));
            update();
        }

        function name()
        {
            return m_name;
        }

        function setCode(code)
        {
            m_code = code;
            update();
        }

        function code()
        {
            return m_code;
        }

        this.get = function ()
        {
            return m_item;
        }
    }

    function loadIconMap(callback)
    {
        $.ajax({
            type: "GET",
            url: "../../style/icon-map.css",
            beforeSend: function (xhr)
            {
                xhr.overrideMimeType("text/plain");
            }
        })
        .done(function (data, status, xhr)
        {
            var map = parseIconMap(data);
            callback(map);
        });
    }

    function parseIconMap(data)
    {
        function expect(data, pos, s)
        {
            if (data.substr(pos[0], s.length) === s)
            {
                pos[0] += s.length;
            }
            else
            {
                throw "Parse Error at " + pos[0] + ", " + s + " expected: " + data.substr(pos[0], 16);
            }
        }

        function skipWhiteSpace(data, pos)
        {
            while (pos[0] < data.length && (data[pos[0]] === " " || data[pos[0]] === "\r" || data[pos[0]] === "\n"))
            {
                ++pos[0];
            }
        }

        function readName(data, pos)
        {
            var idx = data.slice(pos[0]).search(/[^a-z0-9_\-]/i);
            if (idx !== -1)
            {
                var name = data.substr(pos[0], idx);
                pos[0] += name.length;
                return name;
            }
            else
            {
                throw "Parse Error at " + pos[0];
            }
        }

        function readEntry(data, pos)
        {
            skipWhiteSpace(data, pos);
            expect(data, pos, ".sh-icon-");
            var name = readName(data, pos);
            expect(data, pos, ":before");
            skipWhiteSpace(data, pos);
            expect(data, pos, "{");
            skipWhiteSpace(data, pos);
            expect(data, pos, "content:");
            skipWhiteSpace(data, pos);
            expect(data, pos, "\"\\");
            var code = readName(data, pos);
            expect(data, pos, "\";");
            skipWhiteSpace(data, pos);
            expect(data, pos, "}");
            skipWhiteSpace(data, pos);

            return {
                name: name,
                code: code
            };
        }

        var map = { };
        var pos = [0];
        while (pos[0] < data.length)
        {
            var entry = readEntry(data, pos);
            map[entry.name] = entry.code;
        }
        return map;
    }

    var page = high.element(mid.Page);
    page
    .onClosed(page.discard)
    .header(
        high.element(mid.PageHeader).id("header").title("Shellfish Icon Gallery")
    )
    .add(
        high.element(mid.GridView).id("gridview")
    );
    page.get().push();

    var busyPopup = high.element(mid.BusyPopup).text("Loading Icons");
    busyPopup.get().show();

    loadIconMap(function (map)
    {
        busyPopup.get().hide();

        var names = Object.keys(map);
        names.sort(function (a, b) { return map[a].code - map[b].code; });

        var gridView = page.find("gridview");
        names.forEach(function (name)
        {
            gridView.add(
                high.element(IconItem).name(name).code(map[name])
            );
        });

        page.find("header").subtitle(names.length + " icons");
    });
});
