"use strict";

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

function showBusyIndicator(title)
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
}

function showDialog(title, msg)
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
}

function showError(msg, callback)
{
    var dlg = showDialog("Error", msg);
    dlg.addButton("OK", function () { if (callback) callback(); });
    return dlg;
}

function showQuestion(title, msg, yesCb, noCb)
{
    var dlg = showDialog(title, msg);
    dlg.addButton("Yes", yesCb);
    dlg.addButton("No", noCb);
    return dlg;
}

function showPreviewPopup()
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
}

function showPage(title)
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

    $("body").append(page);
    sh.push(page);

    return page;
}

/* Pushes a status message to the status area and returns its node.
 * Invoke remove() on the node to remove.
 */
function pushStatus(icon, message)
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
}
