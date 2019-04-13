"use strict";

var ui = { };

ui.showError = function (msg, callback)
{
    var dlg = sh.element(sh.Dialog).title("Error")
    .add(
        sh.element(sh.Label).text(msg)
    )
    .button(
        sh.element(sh.Button).text("Ok")
        .action(function ()
        {
            dlg.close_();
            if (callback)
            {
                callback();
            }
        })
    );
    dlg.show_();
};

ui.showQuestion = function (title, msg, yesCb, noCb)
{
    var dlg = sh.element(sh.Dialog).title(title)
    .add(
        sh.element(sh.Label).text(msg)
    )
    .button(
        sh.element(sh.Button).text("Yes").action(function () { dlg.close_(); yesCb(); }).isDefault(true)
    )
    .button(
        sh.element(sh.Button).text("No").action(function () { dlg.close_(); noCb(); })
    );
    dlg.show_();
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