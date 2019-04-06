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
            .content(
                sh.tag("div").class("sh-left")
            )
            .content(
                sh.tag("div").class("sh-right")
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
        sh.pagePop(function ()
        {
            m_page.remove();
            if (callback)
            {
                callback();
            }
        });
    };

    /* Sets a swipe-back action.
     */
    this.setSwipeBack = function (callback)
    {
        sh.pageOnSwipe(m_page, callback);
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

    /* Adds an item to the left side of the header.
     */
    this.addToHeaderLeft = function (item)
    {
        m_page.find("> header .sh-left").append(item.get());
    };

    /* Adds an item to the right side of the header.
     */
    this.addToHeaderRight = function (item)
    {
        m_page.find("> header .sh-right").append(item.get());
    };

    /* Adds an item to the page.
     */
    this.add = function (item)
    {
        m_page.find("> section").append(item.get());
    };
};

sh.Menu = function ()
{
    var m_menu;

    this.clear = function()
    {
        m_menu.find("> div").html("");
        m_menu.find("> div").append("<ul>");
    };

    this.addItem = function (item)
    {
        var ul = m_menu.find("> div > ul").last();
        ul.append(item.get());
    };

    this.addSeparator = function ()
    {
        var ul = m_menu.find("> div > ul").last();
        ul.append($(
            sh.tag("hr")
            .html()
        ));
    }

    this.addSubMenu = function (subMenu)
    {
        var div = m_menu.find("> div");
        div.append(subMenu.get());
        div.append("<ul>");
    };

    this.popup = function (parent)
    {
        $("body").append(m_menu);
        sh.menuOpen(m_menu, parent, function () { });
    };

    this.close = function ()
    {
        m_menu.remove();
    }

    m_menu = $(
        sh.tag("div").class("sh-menu")
        .content(
            sh.tag("div")
            .content(
                sh.tag("ul")
            )
        )
        .html()
    );

    m_menu.on("click", function (event)
    {
        event.stopPropagation();
        m_menu.remove();
    });
};

sh.MenuItem = function (icon, text, callback)
{
    var m_item;

    this.setEnabled = function (value)
    {
        if (value)
        {
            m_item.removeClass("sh-disabled");
        }
        else
        {
            m_item.addClass("sh-disabled");
        }
    };

    this.get = function ()
    {
        return m_item;
    };

    m_item = $(
        sh.tag("li")
        .style("position", "relative")
        .on("click", "")
        .content(
            sh.tag("span").class("sh-left sh-fw-icon " + icon)
        )
        .content(
            sh.tag("span")
            .style("padding-left", "1.2em")
            .content(sh.escapeHtml(text))
        )
        .html()
    );

    m_item.on("click", callback);
};

sh.SubMenu = function (text)
{
    var m_subMenu;

    this.addItem = function (item)
    {
        var ul = m_subMenu.find("ul").last();
        ul.append(item.get());
    };

    this.addSeparator = function ()
    {
        var ul = m_subMenu.find("ul").last();
        ul.append($(
            sh.tag("hr")
            .html()
        ));
    }

    this.get = function ()
    {
        return m_subMenu;
    };

    m_subMenu = $(
        sh.tag("div")
        .content(
            sh.tag("h1").class("sh-submenu")
            .on("click", "")
            .content(sh.escapeHtml(text))
        )
        .content(
            sh.tag("ul")
        )
        .html()
    );

    m_subMenu.find("> h1").on("click", function (event)
    {
        event.stopPropagation();
        var item = this;
        m_subMenu.parent().find(".sh-submenu").each(function (i)
        {
            if (this !== item)
            {
                $(this).removeClass("sh-submenu-visible");
            }
        });
        $(item).toggleClass("sh-submenu-visible");
    });
};

sh.Popup = function ()
{
    var m_popup = $(
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

    m_popup.on("click", function ()
    {
        m_popup.trigger("sh-closed");
        m_popup.remove();
    });

    this.add = function (item)
    {
        m_popup.find("> div").append(item.get());
    };

    this.show = function ()
    {
        $("body").append(m_popup);
    };
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

sh.BusyPopup = function (title)
{
    var m_popup = $(
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

    this.show = function ()
    {
        $("body").append(m_popup);
    };

    this.hide = function ()
    {
        m_popup.remove();
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
        .attr("value", sh.escapeHtml(text || ""))
        .on("keydown", "event.stopPropagation();")
        .html()
    );

    this.get = function ()
    {
        return m_input;
    };

    this.setValue = function (text)
    {
        m_input.val(sh.escapeHtml(text));
    };

    this.value = function ()
    {
        return m_input.val();
    };
};

sh.Button = function (text, callback)
{

};

sh.IconButton = function (icon, callback)
{
    var that = this;
    var m_icon = icon;
    var m_button = $(
        sh.tag("div")
        .style("display", "inline-block")
        .style("width", "3rem")
        .style("height", "100%")
        .content(
            sh.tag("span").class("sh-fw-icon " + icon)
            .style("font-size", "150%")
        )
        .on("click", "")
        .html()
    );
    m_button.on("click", function (event) { event.stopPropagation(); callback(that); });

    this.get = function ()
    {
        return m_button;
    };

    this.setIcon = function (icon)
    {
        m_button.find("span").removeClass(m_icon).addClass(icon);
        m_icon = icon;
    };
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

sh.ListView = function ()
{
    var m_listView = $(
        sh.tag("ul").class("sh-listview")
        .html()
    );

    this.get = function ()
    {
        return m_listView;
    };

    this.add = function (item)
    {
        m_listView.append(item.get());
    };
};

sh.ListItem = function (title, subtitle, callback)
{
    var m_listItem = $(
        sh.tag("li")
        .style("height", "80px")
        .on("click", "")
        .content(
            sh.tag("div").class("sh-left icon")
            .style("display", "none")
            .style("width", "80px")
            .style("background-repeat", "no-repeat")
            .style("background-position", "50% 50%")
        )
        .content(
            sh.tag("div")
            .style("position", "absolute")
            .style("top", "1em")
            .style("left", "0")
            .style("right", "0")
            .style("padding-left", "0.5em")
            .content(
                sh.tag("h1").content(sh.escapeHtml(title))
            )
            .content(
                sh.tag("h2").content(sh.escapeHtml(subtitle))
            )
        )
        .content(
            sh.tag("div").class("sh-right selector")
            .style("display", "none")
            .style("width", "42px")
            .style("text-align", "center")
            .style("border-left", "solid 1px var(--color-border)")
            .content(
                sh.tag("span").class("sh-fw-icon")
                .style("line-height", "80px")
            )
        )
        .html()
    );

    var m_iconBox = m_listItem.find("> div").eq(0);
    var m_labelBox = m_listItem.find("> div").eq(1);
    var m_buttonBox = m_listItem.find("> div").eq(2);

    m_listItem.on("click", callback);

    this.get = function ()
    {
        return m_listItem;
    };

    this.setIcon = function (url, fillMode)
    {
        m_labelBox.css("left", "80px");
        m_iconBox.css("display", "block");
        m_iconBox.css("background-size", fillMode || "auto");
        m_iconBox.css("background-image", "url(" + url + ")");
    };

    this.setAction = function (icon, callback)
    {
        m_labelBox.css("right", "42px");
        m_buttonBox.css("display", "block");
        m_buttonBox.find("span").addClass(icon);
        m_buttonBox.on("click", function (event)
        {
            event.stopPropagation();
            callback();
        });
    };

};
