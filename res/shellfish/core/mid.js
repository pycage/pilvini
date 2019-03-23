"use strict";

sh.Page = function (title, subtitle)
{
    var m_page = $(
        sh.tag("div").class("sh-page")
        .content(
            sh.tag("header").class("sh-dropshadow")
            .style("padding-left", "3em")
            .style("padding-right", "3em")
            .content(
                sh.tag("div")
                .style("line-height", "1.3rem")
                .style("padding-top", "0.2rem")
                .content(
                    sh.tag("h1").content(sh.escapeHtml(title))

                )
                .content(
                    sh.tag("h2").content(sh.escapeHtml(subtitle))
                )                    
            )
        )
        .content(
            sh.tag("section")
            .style("position", "relative")
        )
        .html()
    );

    this.get = function ()
    {
        return m_page;
    };

    /* Pushes this page onto the page stack.
     */
    this.push = function (callback)
    {
        $("#pagestack").append(m_page);
        sh.pagePush(m_page, callback, $(".sh-page").length === 1);
    };

    /* Pops this page off the page stack.
     */
    this.pop = function (callback)
    {
        sh.pagePop(callback);
        m_page.remove();
    };

    /* Sets the page title.
     */
    this.setTitle = function (text)
    {
        m_page.find("> header h1").html(sh.escapeHtml(text));
    };

    /* Sets the page subtitle.
     */
    this.setSubtitle = function (text)
    {
        m_page.find("> header h2").html(sh.escapeHtml(text));
    };

    /* Adds a left header button.
     */
    this.addLeftHeaderButton = function (icon, callback)
    {
        var count = m_page.find("> header .sh-left").length;
        var btn = $(
            sh.tag("span").class("sh-left sh-fw-icon " + icon)
            .style("margin-right", (count * 3) + "rem")
            .style("font-size", "150%")
            .on("click", "")
            .html()
        );
        btn.on("click", callback);
        m_page.find("> header").append(btn);
    
        return btn;
    };

    /* Adds a right header button.
     */
    this.addRightHeaderButton = function (icon, callback)
    {
        var count = m_page.find("> header .sh-right").length;
        var btn = $(
            sh.tag("span").class("sh-right sh-fw-icon " + icon)
            .style("margin-right", (count * 3) + "rem")
            .style("font-size", "150%")
            .on("click", "")
            .html()
        );
        btn.on("click", callback);
        m_page.find("> header").append(btn);
    
        return btn;
    };
};

sh.Menu = function ()
{

};

sh.SubMenu = function (title)
{

};

sh.MenuItem = function (title, callback)
{

};

sh.Dialog = function (title)
{
    var m_dialog = $(
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

    this.get = function ()
    {
        return m_dialog;
    };

    /* Shows this dialog.
     */
    this.show = function ()
    {
        $("body").append(m_dialog);
    };

    /* Adds a button to this dialog.
     */
    this.addButton = function (text, callback, asDefault)
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
            html = sh.tag("input").attr("type", "button")
                   .on("click", "")
                   .attr("value", sh.escapeHtml(text))
                   .html();
        }
        var btn = $(html);
        btn.on("click", function () { m_dialog.remove(); if (callback) callback(); });
        m_dialog.find("footer > span").append(btn);
    };

    /* Adds a widget to this dialog.
     */
    this.add = function (widget)
    {
        m_dialog.find("section").append(widget.get());
    };
};

sh.Label = function (text)
{
    var m_label = $(
        sh.tag("p")
        .content(sh.escapeHtml(text))
        .html()
    );

    this.get = function ()
    {
        return m_label;
    };
};

sh.Labeled = function (text, widget)
{
    var m_row = $(
        sh.tag("p")
        .content(
            sh.tag("label").content(sh.escapeHtml(text))
            .style("display", "inline-block")
            .style("min-width", "6em")
        )
        .html()
    );

    this.get = function ()
    {
        return m_row;
    };

    m_row.append(widget.get());
};

sh.TextInput = function (text, asPassword)
{
    var m_input = $(
        sh.tag("input").attr("type", asPassword ? "password" : "text")
        .attr("value", escapeHtml(text || ""))
        .on("keydown", "event.stopPropagation();")
        .html()
    );

    this.get = function ()
    {
        return m_input;
    };

    this.setValue = function (text)
    {
        m_input.val(escapeHtml(text));
    };

    this.value = function ()
    {
        return m_input.val();
    };
};

sh.Button = function (text, callback)
{

};

sh.Switch = function (checked)
{
    var m_swtch = $(
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
        m_swtch.find("input").prop("checked", true);
    }

    this.get = function ()
    {
        return m_swtch;
    };

    this.setChecked = function (value)
    {
        m_swtch.find("input").prop("checked", value);
    };

    this.checked = function ()
    {
        return m_swtch.find("input").prop("checked");
    };
};
