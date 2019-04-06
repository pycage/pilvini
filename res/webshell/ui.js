"use strict";

var ui = { };

ui.showError = function (msg, callback)
{
    var dlg = new sh.Dialog("Error");
    dlg.add(new sh.Label(msg));
    dlg.addButton("OK", function () { if (callback) callback(); });
    dlg.show();
};

ui.showQuestion = function (title, msg, yesCb, noCb)
{
    var dlg = new sh.Dialog(title);
    dlg.add(new sh.Label(msg));
    dlg.addButton("Yes", yesCb);
    dlg.addButton("No", noCb);
    dlg.show();
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