"use strict";

var ui = { };

ui.showBusyIndicator = function (title)
{
    var indicator = $(
        sh.tag("div").class("sh-popup")
        .content(
            sh.tag("div").class("sh-dropshadow")
            .style("color", "var(--color-primary)")
            .style("text-align", "center")
            .style("padding", "1em")
            .content(
                sh.tag("span").class("sh-busy-indicator")
                .style("font-size", "200%")
            )
            .content(sh.tag("br"))
            .content(sh.tag("br"))
            .content(
                sh.tag("span").content(sh.escapeHtml(title))
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
        sh.tag("form").class("sh-popup")
        .on("click", "event.stopPropagation();")
        .content(
            sh.tag("div").class("sh-dropshadow")
            .style("background-color", "var(--color-primary-background)")
            .style("max-width", "calc(100vw - 2rem)")
            .style("max-height", "calc(100vh - 2rem)")
            .style("overflow", "auto")
            .content(
                sh.tag("header")
                .content(
                    sh.tag("h1").class("sh-left")
                    .content(sh.escapeHtml(title))
                )
            )
            .content(
                sh.tag("section")
                .content(
                    sh.tag("p")
                    .content(sh.escapeHtml(msg))
                )
            )
            .content(
                sh.tag("footer")
                .content(
                    sh.tag("span").class("sh-right")
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
            html = sh.tag("input").attr("type", "submit")
                   .on("click", "")
                   .attr("value", sh.escapeHtml(text))
                   .html();
        }
        else
        {
            html = sh.tag("a")
                   .on("click", "")
                   .content(sh.escapeHtml(text))
                   .html();
        }
        var btn = $(html);
        btn.on("click", function () { dlg.remove(); if (callback) callback() });
        dlg.find("footer > span").append(btn);
    };

    dlg.addLabel = function (text)
    {
        var label = $(
            sh.tag("p")
            .content(sh.escapeHtml(text))
            .html()
        );
        dlg.find("section").append(label);
        return label;
    };

    dlg.addTextEntry = function (text, value)
    {
        var label = $(
            sh.tag("label").content(sh.escapeHtml(text))
            .style("display", "inline-block")
            .style("min-width", "6em")
            .html()
        );
        var entry = $(
            sh.tag("input").attr("type", "text")
            .attr("value", sh.escapeHtml(value || ""))
            .on("keydown", "event.stopPropagation();")
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
            sh.tag("label").content(sh.escapeHtml(text))
            .style("display", "inline-block")
            .style("min-width", "6em")
            .html()
        );
        var entry = $(
            sh.tag("input").attr("type", "password")
            .attr("value", sh.escapeHtml(value || ""))
            .html()
        );

        var p = $("<p>");
        p.append(label).append(entry);
        dlg.find("section").append(p);
        return entry;
    };

    dlg.addSwitch = function (text, checked)
    {
        var label = $(
            sh.tag("label").content(sh.escapeHtml(text))
            .style("display", "inline-block")
            .style("min-width", "6em")
            .html()
        );

        var swtch = $(
            sh.tag("label").class("sh-switch")
            .content(
                sh.tag("input").attr("type", "checkbox")
            )
            .content(
                sh.tag("span")
            )
            .html()
        );

        if (checked)
        {
            swtch.find("input").prop("checked", true);
        }

        var p = $("<p>");
        p.append(swtch).append(label);
        dlg.find("section").append(p);
        return swtch.find("input");
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
        sh.tag("div").class("sh-popup")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .content(
            sh.tag("div").class("sh-dropshadow")
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

ui.StatusItem = function (icon, message)
{
    var m_item;

    this.setText = function (text)
    {
        m_item.find("h1").html(sh.escapeHtml(text));
    };

    this.setProgress = function (p)
    {
        m_item.find("> div").css("width", p + "%");
    };

    this.get = function ()
    {
        return m_item;
    };

    m_item = $(
        sh.tag("div")
        .style("position", "relative")
        .content(
            sh.tag("div")
            .style("position", "absolute")
            .style("background-color", "var(--color-highlight-background)")
            .style("width", "0%")
            .style("height", "100%")
        )
        .content(
            sh.tag("h1")
            .style("position", "relative")
            .content(
                sh.tag("span").class("sh-fw-icon " + icon)
            )
            .content(sh.escapeHtml(message))
        )
        .html()
    );
};