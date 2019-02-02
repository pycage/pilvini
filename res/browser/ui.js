"use strict";

var ui = { };

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

function unescapeHtml(text)
{
    return text.replace(/&quot;|&apos;|&amp;|&lt;|&gt;/g, function (a)
    {
        return {
            "&quot;": "\"",
            "&apos;": "'",
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">"
        }[a];
    });
}

ui.showBusyIndicator = function (title)
{
    var indicator = $(
        tag("div").class("sh-popup")
        .content(
            tag("div").class("sh-dropshadow")
            .style("color", "var(--color-primary)")
            .style("text-align", "center")
            .style("padding", "1em")
            .content(
                tag("span").class("sh-busy-indicator")
                .style("font-size", "200%")
            )
            .content(tag("br"))
            .content(tag("br"))
            .content(
                tag("span").content(escapeHtml(title))
            )
        )
        .html()
    );
    $("body").append(indicator);
    sh.popup(indicator);
    return indicator;
};

ui.showDialog = function (title, msg)
{
    var dlg = $(
        tag("form").class("sh-popup")
        .content(
            tag("div").class("sh-dropshadow")
            .style("background-color", "var(--color-primary-background)")
            .content(
                tag("header")
                .content(
                    tag("h1").class("sh-left")
                    .content(escapeHtml(title))
                )
            )
            .content(
                tag("section")
                .content(
                    tag("p")
                    .content(escapeHtml(msg))
                )
            )
            .content(
                tag("footer")
                .content(
                    tag("span").class("sh-right")
                )
            )
        )
        .html()
    );

    dlg.addButton = function (text, callback, asDefault)
    {
        var html;
        if (asDefault)
        {
            html = tag("input").attr("type", "submit")
                   .on("click", "")
                   .attr("value", escapeHtml(text))
                   .html();
        }
        else
        {
            html = tag("a")
                   .on("click", "")
                   .content(escapeHtml(text))
                   .html();
        }
        var btn = $(html);
        btn.on("click", function () { dlg.remove(); if (callback) callback() });
        dlg.find("footer > span").append(btn);
    };

    dlg.addLabel = function (text)
    {
        var label = $(
            tag("p")
            .content(escapeHtml(text))
            .html()
        );
        dlg.find("section").append(label);
        return label;
    };

    dlg.addTextEntry = function (text, value)
    {
        var label = $(
            tag("label").content(escapeHtml(text))
            .style("display", "inline-block")
            .style("min-width", "6em")
            .html()
        );
        var entry = $(
            tag("input").attr("type", "text")
            .attr("value", escapeHtml(value || ""))
            .html()
        );

        var p = $("<p>");
        p.append(label).append(entry);
        dlg.find("section").append(p);
        return entry;
    };

    dlg.addPasswordEntry = function (text, value)
    {
        var label = $(
            tag("label").content(escapeHtml(text))
            .style("display", "inline-block")
            .style("min-width", "6em")
            .html()
        );
        var entry = $(
            tag("input").attr("type", "password")
            .attr("value", escapeHtml(value || ""))
            .html()
        );

        var p = $("<p>");
        p.append(label).append(entry);
        dlg.find("section").append(p);
        return entry;
    };

    $("body").append(dlg);
    sh.popup(dlg);
    return dlg;
};

ui.showError = function (msg, callback)
{
    var dlg = ui.showDialog("Error", msg);
    dlg.addButton("OK", function () { if (callback) callback(); });
    return dlg;
};

ui.showQuestion = function (title, msg, yesCb, noCb)
{
    var dlg = ui.showDialog(title, msg);
    dlg.addButton("Yes", yesCb);
    dlg.addButton("No", noCb);
    return dlg;
};

ui.showPreviewPopup = function ()
{
    var popup = $(
        tag("div").class("sh-popup")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .content(
            tag("div").class("sh-dropshadow")
            .style("position", "relative")
            .style("background-color", "black")
            .style("overflow", "hidden")
        )
        .html()
    );

    popup.on("click", function ()
    {
        popup.trigger("sh-closed");
        popup.remove();
    });

    $("body").append(popup);
    sh.popup(popup);

    return popup;
};

ui.showPage = function (title)
{
    var page = $(
        tag("div").class("sh-page")
        .content(
            tag("header")
            .content(
                tag("span").class("sh-left sh-fw-icon sh-icon-back")
                .on("click", "")
            )
            .content(
                tag("h1").content(escapeHtml(title))
            )
        )
        .content(
            tag("section")
        )
        .html()
    );

    var header = page.find("header");

    header.find("> span").on("click", function ()
    {
        page.pop();
    });

    page.pop = function ()
    {
        sh.pop(function () { page.remove(); });
    };

    page.addIconButton = function (icon, callback)
    {
        var btn = $(
            tag("span").class("sh-right sh-fw-icon " + icon)
            .on("click", "")
            .html()
        );
        btn.on("click", callback);
        header.append(btn);

        return btn;
    };

    page.addListView = function ()
    {
        var ul = $(
            tag("ul").class("sh-listview")
            .html()
        );

        page.find("> section").append(ul);

        return ul;
    };

    $("body").append(page);
    sh.push(page);

    sh.onSwipeBack(page, function () { sh.pop(); });

    return page;
};

/* Pushes a status message to the status area and returns its node.
 * Invoke remove() on the node to remove.
 */
ui.pushStatus = function (icon, message)
{
    var statusEntry = $(
        tag("div")
        .style("position", "relative")
        .content(
            tag("div")
            .style("position", "absolute")
            .style("background-color", "var(--color-highlight-background)")
            .style("width", "0%")
            .style("height", "100%")
        )
        .content(
            tag("h1")
            .style("position", "relative")
            .content(
                tag("span").class("sh-fw-icon " + icon)
            )
            .content(escapeHtml(message))
        )
        .html()
    );

    statusEntry.setProgress = function (p)
    {
        statusEntry.find("> div").css("width", p + "%");
    };

    $("#statusbox").append(statusEntry);

    return statusEntry;
};

ui.listItem = function (title, subtitle, callback)
{
    var li = $(
        tag("li")
        .style("height", "80px")
        .on("click", "")
        .content(
            tag("div").class("sh-left")
            .style("display", "none")
            .style("width", "80px")
            .style("background-repeat", "no-repeat")
            .style("background-position", "50% 50%")
        )
        .content(
            tag("div")
            .style("position", "absolute")
            .style("top", "1em")
            .style("left", "0")
            .style("right", "0")
            .style("padding-left", "0.5em")
            .content(
                tag("h1").content(escapeHtml(title))
            )
            .content(
                tag("h2").content(escapeHtml(subtitle))
            )
        )
        .content(
            tag("div").class("sh-right")
            .style("display", "none")
            .style("width", "42px")
            .style("text-align", "center")
            .style("border-left", "solid 1px var(--color-border)")
            .content(
                tag("span").class("sh-fw-icon")
                .style("line-height", "80px")
            )
        )
        .html()
    );

    var iconBox = li.find("> div").eq(0);
    var labelBox = li.find("> div").eq(1);
    var buttonBox = li.find("> div").eq(2);

    li.on("click", callback);

    li.setIcon = function (url)
    {
        labelBox.css("left", "80px");
        iconBox.css("display", "block");
        iconBox.css("background-image", "url(" + url + ")");
    };

    li.setAction = function (icon, callback)
    {
        labelBox.css("right", "42px");
        buttonBox.css("display", "block");
        buttonBox.find("span").addClass(icon);
        buttonBox.on("click", callback);
    };

    return li;
};
