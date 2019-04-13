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

    this.add = function (item)
    {
        var ul = m_menu.find("> div > ul").last();
        ul.append(item.get());
    };

    this.popup = function (parent)
    {
        $("body").append(m_menu);
        sh.menuOpen(m_menu, parent, function () { });
    };

    this.close = function ()
    {
        m_menu.detach();
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
        m_menu.detach();
    });
};

sh.MenuItem = function ()
{
    Object.defineProperties(this, {
        callback: { set: setCallback, get: callback, enumerable: true },
        enabled: { set: setEnabled, get: enabled, enumerable: true },
        icon: { set: setIcon, get: icon, enumerable: true },
        text: { set: setText, get: text, enumerable: true },
        visible: { set: setVisible, get: visible, enumerable: true }
    });

    var m_item;
    var m_icon = "";
    var m_text = "";
    var m_enabled = true;
    var m_visible = true;
    var m_callback = null;

    function setIcon(icon)
    {
        m_item.find("span").first().removeClass(m_icon).addClass(icon);
        m_icon = icon;
    }

    function icon()
    {
        return m_icon;
    }

    function setText(text)
    {
        m_text = text;
        m_item.find("span").last().html(sh.escapeHtml(text));
    }

    function text()
    {
        return m_text;
    }

    function setCallback(callback)
    {
        m_callback = callback;
        m_item.off("click").on("click", callback);
    }

    function callback()
    {
        return m_callback;
    }

    function setEnabled(value)
    {
        if (value)
        {
            m_item.removeClass("sh-disabled");
        }
        else
        {
            m_item.addClass("sh-disabled");
        }
        m_enabled = value;
    }

    function enabled()
    {
        return m_enabled;
    }

    function setVisible(value)
    {
        if (value)
        {
            m_item.removeClass("sh-hidden");
        }
        else
        {
            m_item.addClass("sh-hidden");
        }
        m_visible = value;
    }

    function visible()
    {
        return m_visible;
    }

    this.get = function ()
    {
        return m_item;
    };

    m_item = $(
        sh.tag("li")
        .style("position", "relative")
        .on("click", "")
        .content(
            sh.tag("span").class("sh-left sh-fw-icon")
        )
        .content(
            sh.tag("span")
            .style("padding-left", "1.2em")
            .content("")
        )
        .html()
    );
};

sh.SubMenu = function ()
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true },
        visible: { set: setVisible, get: visible, enumerable: true }
    });
    
    var m_subMenu;
    var m_text = "";

    function setText(text)
    {
        m_text = text;
        m_subMenu.find("h1").html(sh.escapeHtml(text));
    }

    function text()
    {
        return m_text;
    }

    this.add = function (item)
    {
        var ul = m_subMenu.find("ul").last();
        ul.append(item.get());
    };

    function setVisible(value)
    {
        if (value)
        {
            m_subMenu.removeClass("sh-hidden");
        }
        else
        {
            m_subMenu.addClass("sh-hidden");
        }
    }

    function visible()
    {
        return true;
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

sh.Separator = function ()
{
    var m_sep = $(
        sh.tag("hr")
        .html()
    );

    this.get = function ()
    {
        return m_sep;
    };
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

    this.get = function ()
    {
        return m_popup;
    };

    this.add = function (item)
    {
        m_popup.find("> div").append(item.get());
    };

    this.show = function ()
    {
        $("body").append(m_popup);
        m_popup.attr("tabindex", -1).focus();
    };
};

sh.Dialog = function ()
{
    Object.defineProperties(this, {
        title: { set: setTitle, get: title, enumerable: true },
        button: { set: addButton, get: buttons, enumerable: true }
    });

    var m_title = "";
    var m_buttons = [];

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
                    .content("")
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

    /* Closes this dialog.
     */
    this.close = function ()
    {
        m_dialog.detach();
    }

    function setTitle(title)
    {
        m_dialog.find("header h1").html(sh.escapeHtml(title));
        m_title = title;
    }

    function title()
    {
        return m_title;
    }

    function addButton(button)
    {
        m_buttons.push(button);
        m_dialog.find("footer > span").append(button.get().get());
    }

    function buttons()
    {
        return m_buttons;
    }

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

sh.Label = function (t)
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true }
    });

    var m_text = "";
    var m_label = $(
        sh.tag("p")
        .content(sh.escapeHtml(t || ""))
        .html()
    );

    function setText(text)
    {
        m_label.html(sh.escapeHtml(text));
        m_text = text;
    }

    function text()
    {
        return m_text;
    }

    this.get = function ()
    {
        return m_label;
    };
};

sh.Labeled = function (t, widget)
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true }
    });

    var m_text = "";

    var m_row = $(
        sh.tag("p")
        .content(
            sh.tag("label").content(sh.escapeHtml(t || ""))
            .style("display", "inline-block")
            .style("min-width", "6em")
        )
        .html()
    );

    function setText(text)
    {
        m_row.find("> label").html(sh.escapeHtml(text));
        m_text = text;
    }

    function text()
    {
        return m_text;
    }

    this.add = function (widget)
    {
        m_row.append(widget.get());
    }

    this.get = function ()
    {
        return m_row;
    };

    // ---

    if (widget)
    {
        m_row.append(widget.get());
    }
};

sh.TextInput = function (t, asPassword)
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true },
        password: { set: setPassword, get: password, enumerable: true }
    });

    var m_password = false;

    var m_input = $(
        sh.tag("input").attr("type", asPassword ? "password" : "text")
        .attr("value", sh.escapeHtml(t || ""))
        .on("keydown", "event.stopPropagation();")
        .html()
    );

    this.get = function ()
    {
        return m_input;
    };

    function setText(text)
    {
        m_input.val(sh.escapeHtml(text));
    }

    function text()
    {
        return m_input.val();
    }

    function setPassword(value)
    {
        m_input.prop("type", value ? "password" : "text");
        m_password = value;
    }

    function password()
    {
        return m_password;
    }

    // ---

    this.setValue = function (text)
    {
        m_input.val(sh.escapeHtml(text));
    };

    this.value = function ()
    {
        return m_input.val();
    };
};

sh.Button = function ()
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true },
        action: { set: setAction, get: action, enumerable: true },
        isDefault: { set: setIsDefault, get: isDefault, enumerable: true }
    });

    var m_text = "";
    var m_action = null;
    var m_isDefault = false;

    var m_button = $(
        sh.tag("input").attr("type", "button")
        .on("click", "")
        .attr("value", "")
        .html()
    );

    function setText(text)
    {
        m_button.prop("value", sh.escapeHtml(text));
        m_text = text;
    }

    function text()
    {
        return m_text;
    }

    function setAction(callback)
    {
        m_button.off("click").on("click", callback);
        m_action = callback;
    }

    function action()
    {
        return m_action;
    }

    function setIsDefault(value)
    {
        m_button.prop("type", value ? "submit" : "button");
        m_isDefault = value;
    }

    function isDefault()
    {
        return m_isDefault;
    }

    this.get = function ()
    {
        return m_button;
    }
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

    this.setEnabled = function (value)
    {
        if (value)
        {
            m_button.removeClass("sh-disabled");
        }
        else
        {
            m_button.addClass("sh-disabled");
        }
    };

    this.setIcon = function (icon)
    {
        m_button.find("span").removeClass(m_icon).addClass(icon);
        m_icon = icon;
    };
};

sh.Switch = function (checked)
{
    Object.defineProperties(this, {
        checked: { set: setChecked, get: checked, enumerable: true }
    });

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

    this.get = function ()
    {
        return m_swtch;
    };

    function setChecked(value)
    {
        m_swtch.find("input").prop("checked", value);
    }

    function checked()
    {
        return !! m_swtch.find("input").prop("checked");
    }
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

sh.ListItem = function ()
{
    Object.defineProperties(this, {
        action: { set: setAction, get: action, enumerable: true },
        callback: { set: setCallback, get: callback, enumerable: true },
        fillMode: { set: setFillMode, get: fillMode, enumerable: true },
        icon: { set: setIcon, get: icon, enumerable: true },
        subtitle: { set: setSubtitle, get: subtitle, enumerable: true },
        title: { set: setTitle, get: title, enumerable: true }
    });

    var m_action = ["", null];
    var m_callback = null;
    var m_icon = "";
    var m_fillMode = "cover";
    var m_title = "";
    var m_subtitle = "";

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
                sh.tag("h1").content("")
            )
            .content(
                sh.tag("h2").content("")
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

    this.get = function ()
    {
        return m_listItem;
    };

    function setIcon(url)
    {
        m_labelBox.css("left", "80px");
        m_iconBox.css("display", "block");
        m_iconBox.css("background-image", "url(" + url + ")");
        m_icon = url;
    }
    
    function icon()
    {
        return m_icon;
    }
    
    function setFillMode(fillMode)
    {
        m_iconBox.css("background-size", fillMode || "auto");
        m_fillMode = fillMode;
    }

    function fillMode()
    {
        return m_fillMode;
    }

    function setTitle(title)
    {
        m_labelBox.find("h1").html(sh.escapeHtml(title));
        m_title = title;
    }

    function title()
    {
        return m_title;
    }

    function setSubtitle(subtitle)
    {
        m_labelBox.find("h2").html(sh.escapeHtml(subtitle));
        m_subtitle = subtitle;
    }

    function subtitle()
    {
        return m_subtitle;
    }

    function setAction(action)
    {
        var icon = action[0];
        var callback = action[1];
        m_labelBox.css("right", "42px");
        m_buttonBox.css("display", "block");
        m_buttonBox.find("span").addClass(icon);
        m_buttonBox.on("click", function (event)
        {
            event.stopPropagation();
            callback();
        });
        m_action = action;
    }

    function action()
    {
        return m_action;
    }

    function setCallback(callback)
    {
        m_listItem.off("click").on("click", callback);
        m_callback = callback;
    }

    function callback()
    {
        return callback;
    }
};
