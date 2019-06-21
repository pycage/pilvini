"use strict";

sh.extend = function (target, base)
{
    var descriptors = Object.getOwnPropertyDescriptors(base);

    Object.keys(descriptors).forEach(function (key)
    {
        Object.defineProperty(target, key, descriptors[key]);
    });
};

sh.NSPage = function ()
{
    Object.defineProperties(this,{
        header: { set: setHeader, get: header, enumerable: true },
        footer: { set: setFooter, get: footer, enumerable: true },
        left: { set: setLeft, get: left, enumerable: true },
        script: { set: setScript, get: script, enumerable: true },
        onSwipeBack: { set: setOnSwipeBack, get: onSwipeBack, enumerable: true },
        onClosed: { set: setOnClosed, get: onClosed, enumerable: true }
    });

    var that = this;
    var m_header = null;
    var m_footer = null;
    var m_left = null;
    var m_onSwipeBack = null;
    var m_onClosed = null;

    var m_page = $(
        sh.tag("div").class("sh-page")
        .content(
            sh.tag("section")
            .style("position", "relative")
        )
        .html()
    );

    function setHeader(header)
    {
        if (m_header)
        {
            m_header.get().detach();
        }
        m_page.append(header.get());
        m_header = header;
        that.updateGeometry();
    }

    function header()
    {
        return m_header;
    }

    function setFooter(footer)
    {
        if (m_footer)
        {
            m_footer.get().detach();
        }
        m_page.append(footer.get());
        m_footer = footer;
        that.updateGeometry();
    }

    function footer()
    {
        return m_footer;
    }

    function setLeft(left)
    {
        if (m_left)
        {
            m_left.get().detach();
        }
        m_page.append(left.get());
        m_left = left;
        that.updateGeometry();
    }

    function left()
    {
        return m_left;
    }

    function setScript(uri)
    {
        m_page.append($(
            sh.tag("script").attr("src", uri)
            .html()
        ));
    }

    function script()
    {
        return "";
    }

    function setOnSwipeBack(callback)
    {
        sh.pageOnSwipe(m_page, callback);
        m_onSwipeBack = callback;
    }

    function onSwipeBack()
    {
        return m_onSwipeBack;
    }

    function setOnClosed(callback)
    {
        m_onClosed = callback;
    }

    function onClosed()
    {
        return m_onClosed;
    }

    this.get = function ()
    {
        return m_page;
    };

    this.add = function (child)
    {
        m_page.find("> section").append(child.get());
    };

    /* Pushes this page onto the page stack.
     */
    this.push = function (callback)
    {
        $("#pagestack").append(m_page);
        that.updateGeometry();
        sh.pagePush(m_page, callback, $(".sh-page").length === 1);

        m_page.one("sh-closed", function ()
        {
            if (m_onClosed)
            {
                m_onClosed();
            }
        });
    };

    /* Pops this page off the page stack.
     */
    this.pop = function (callback)
    {
        sh.pagePop(function ()
        {
            m_page.detach();
            if (callback)
            {
                callback();
            }
        });
    };

    /* Updates the page geometry.
     */
    this.updateGeometry = function ()
    {
        if (!! m_header)
            console.log("header: " + m_header.get().height());
        m_page.find("> section").css("padding-top", (!! m_header ? m_header.get().height() : 0) + "px");
        m_page.find("> section").css("padding-bottom", (!! m_footer ? m_footer.get().height() : 0) + "px");
        m_page.find("> section").css("padding-left", (!! m_left ? m_left.get().width() : 0) + "px");
    }
};

sh.PageHeader = function ()
{
    Object.defineProperties(this, {
        title: { set: setTitle, get: title, enumerable: true },
        subtitle: { set: setSubtitle, get: subtitle, enumerable: true },
        left: { set: addLeft, get: left, enumerable: true },
        right: { set: addRight, get: right, enumerable: true },
        onClicked: { set: setOnClicked, get: onClicked, enumerable: true }
    });

    var m_title = "";
    var m_subtitle = "";
    var m_left = [];
    var m_right = [];
    var m_onClicked = null;

    var m_header = $(
        sh.tag("header").class("sh-dropshadow")
        .style("padding-left", "3em")
        .style("padding-right", "3em")
        .content(
            sh.tag("div")
            .style("line-height", "1.3rem")
            .style("padding-top", "0.2rem")
            .content(
                sh.tag("h1").style("overflow", "none").content("")

            )
            .content(
                sh.tag("h2").style("overflow", "none").content("")
            )
        )
        .content(
            sh.tag("div").class("sh-left")
        )
        .content(
            sh.tag("div").class("sh-right")
        )
        .html()
    );

    function setTitle(title)
    {
        m_header.find("> div > h1").html(sh.resolveIcons(sh.escapeHtml(title)));
        m_title = title;
    }

    function title()
    {
        return m_title;
    }

    function setSubtitle(subtitle)
    {
        m_header.find("> div > h2").html(sh.escapeHtml(subtitle));
        m_subtitle = subtitle;
    }

    function subtitle()
    {
        return m_subtitle;
    }

    function addLeft(child)
    {
        m_header.find("> div.sh-left").append(child.get());
        m_left.push(child);
    }

    function left()
    {
        return m_left;
    }

    function addRight(child)
    {
        m_header.find("> div.sh-right").append(child.get());
        m_right.push(child);
    }

    function right()
    {
        return m_right;
    }

    function setOnClicked(callback)
    {
        m_header.find("> div").first().off("click").on("click", callback);
        m_onClicked = callback;
    }

    function onClicked()
    {
        return m_onClicked;
    }

    this.get = function ()
    {
        return m_header;
    };
};

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
                .style("max-height", "75vh")
                .style("overflow", "hidden auto")
                .style("white-space", "nowrap")
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

sh.Box = function ()
{
    Object.defineProperties(this, {
        visible: { set: setVisible, get: visible, enumerable: true }
    });

    var m_isVisible = true;

    var m_item = $(
        sh.tag("div")
        .html()
    );

    function setVisible(v)
    {
        m_isVisible = v;
        m_item.css("display", v ? "block" : "none");
    }

    function visible()
    {
        return m_isVisible;
    }

    this.get = function ()
    {
        return m_item;
    };

    this.add = function (child)
    {
        m_item.append(child.get());
    };
};

sh.MenuItem = function ()
{
    Object.defineProperties(this, {
        enabled: { set: setEnabled, get: enabled, enumerable: true },
        icon: { set: setIcon, get: icon, enumerable: true },
        text: { set: setText, get: text, enumerable: true },
        visible: { set: setVisible, get: visible, enumerable: true },
        onClicked: { set: setOnClicked, get: onClicked, enumerable: true }
    });

    var m_item;
    var m_icon = "";
    var m_text = "";
    var m_enabled = true;
    var m_visible = true;
    var m_onClicked = null;

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

    function setOnClicked(callback)
    {
        m_onClicked = callback;
        m_item.off("click").on("click", callback);
    }

    function onClicked()
    {
        return m_onClicked;
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
        .on("submit", "return false;")
        .content(
            sh.tag("div").class("sh-dropshadow")
            .style("background-color", "var(--color-primary-background)")
            .content(
                sh.tag("header")
                .style("border", "none")
                .style("background-color", "var(--color-highlight-background)")
                .content(
                    sh.tag("h1")
                    .content("")
                )
            )
            .content(
                sh.tag("section")
                .style("margin-top", "2rem")
                .style("margin-bottom", "2.5rem")
                .style("max-width", "calc(100vw - 2rem)")
                .style("max-height", "calc(100vh - 4.5rem - 2rem)")
                .style("overflow", "auto")
            )
            .content(
                sh.tag("footer")
                .style("border", "none")
                .style("height", "2.5rem")
                .style("line-height", "2.5rem")
                .style("background-color", "var(--color-secondary-background)")
                .content(
                    sh.tag("span").class("sh-right")
                    .style("margin-right", "0.25rem")
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
        if (document.fullscreenElement)
        {
            $(document.fullscreenElement).append(m_dialog);
        }
        else
        {
            $("body").append(m_dialog);
        }
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

sh.BusyPopup = function ()
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true }
    });

    var m_text = "";
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
                sh.tag("span").content("")
            )
        )
        .html()
    );

    function setText(text)
    {
        m_popup.find("span").last().html(sh.escapeHtml(text));
        m_text = text;
    }

    function text()
    {
        return m_text;
    }

    this.show = function ()
    {
        $("body").append(m_popup);
    };

    this.hide = function ()
    {
        m_popup.remove();
    };
};

sh.Label = function ()
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true }
    });

    var m_text = "";
    var m_label = $(
        sh.tag("p")
        .content("")
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

sh.Labeled = function ()
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true }
    });

    var m_text = "";

    var m_row = $(
        sh.tag("p")
        .content(
            sh.tag("label").content("")
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
};

sh.TextInput = function ()
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true },
        password: { set: setPassword, get: password, enumerable: true },
        focus: { set: setFocus, get: focus, enumerable: true }
    });

    var m_password = false;
    var m_focus = false;

    var m_input = $(
        sh.tag("input").attr("type", "text")
        .attr("value", "")
        .on("keydown", "event.stopPropagation();")
        .html()
    );

    this.get = function ()
    {
        return m_input;
    };

    function setText(text)
    {
        m_input.val(text);
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

    function setFocus(value)
    {
        m_input.prop("autofocus", value);
        m_focus = value;
    }

    function focus()
    {
        return m_focus;
    }
};

sh.Toolbar = function ()
{
    Object.defineProperties(this, {
        visible: { set: setVisible, get: visible, enumerable: true },
        left: { set: addLeft, get: left, enumerable: true },
        right: { set: addRight, get: right, enumerable: true }
    });

    var m_isVisible = true;
    var m_left = [];
    var m_right = [];

    var m_item = $(
        sh.tag("div")
        .style("position", "relative")
        .style("height", "3rem")
        .style("line-height", "3rem")
        .style("overflow", "hidden")
        .style("white-space", "nowrap")
        .content(
            sh.tag("div").class("sh-left")
        )
        .content(
            sh.tag("div").class("sh-right")
        )
        .html()
    );

    function setVisible(v)
    {
        m_isVisible = v;
        if (v)
        {
            m_item.css("display", "block");
        }
        else
        {
            m_item.css("display", "none");
        }
    }

    function visible()
    {
        return m_isVisible;
    }

    function addLeft(child)
    {
        m_left.push(child);
        m_item.find("> div:nth-child(1)").append(child.get());
    }

    function left()
    {
        return m_left;
    }

    function addRight(child)
    {
        m_right.push(child);
        m_item.find("> div:nth-child(2)").append(child.get());
    }

    function right()
    {
        return m_right;
    }

    this.get = function ()
    {
        return m_item;
    };

    this.add = function (child)
    {
        addLeft(child);
    };
};

sh.Gap = function ()
{
    var m_item = $(
        sh.tag("div")
        .style("display", "inline-block")
        .style("width", "3rem")
        .style("height", "1px")
        .html()
    );

    this.get = function ()
    {
        return m_item;
    };
}

sh.Button = function ()
{
    Object.defineProperties(this, {
        text: { set: setText, get: text, enumerable: true },
        action: { set: setOnClicked, get: onClicked, enumerable: true },
        onClicked: { set: setOnClicked, get: onClicked, enumerable: true },
        isDefault: { set: setIsDefault, get: isDefault, enumerable: true }
    });

    var m_text = "";
    var m_onClicked = null;
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

    function setOnClicked(callback)
    {
        m_button.off("click").on("click", callback);
        m_onClicked = callback;
    }

    function onClicked()
    {
        return m_onClicked;
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

sh.IconButton = function ()
{
    Object.defineProperties(this, {
        enabled: { set: setEnabled, get: enabled, enumerable: true },
        checked: { set: setChecked, get: checked, enumerable: true },
        visible: { set: setVisible, get: visible, enumerable: true },
        icon: { set: setIcon, get: icon, enumerable: true },
        onClicked: { set: setOnClicked, get: onClicked, enumerable: true }
    });

    var that = this;
    var m_enabled = true;
    var m_visible = true;
    var m_checked = false;
    var m_icon = "";
    var m_onClicked = null;

    var m_button = $(
        sh.tag("div")
        .style("display", "inline-block")
        .style("width", "3rem")
        .style("height", "100%")
        .style("text-align", "center")
        .content(
            sh.tag("span").class("sh-fw-icon")
            .style("font-size", "2rem")
        )
        .on("click", "")
        .html()
    );

    m_button.on("click", function (event)
    {
        event.stopPropagation();
        if (m_onClicked)
        {
            m_onClicked(that);
        }
    });

    function setEnabled(value)
    {
        if (value)
        {
            m_button.removeClass("sh-disabled");
        }
        else
        {
            m_button.addClass("sh-disabled");
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
            m_button.css("display", "inline-block");
        }
        else
        {
            m_button.css("display", "none");
        }
        m_visible = value;
    }

    function visible()
    {
        return m_visible;
    }

    function setChecked(value)
    {
        if (value)
        {
            m_button.css("background-color", "var(--color-highlight-background)")
        }
        else
        {
            m_button.css("background-color", "")
        }
        m_checked = value;
    }

    function checked()
    {
        return m_checked;
    }

    function setIcon(icon)
    {
        m_button.find("span").removeClass(m_icon).addClass(icon);
        m_icon = icon;
    }

    function icon()
    {
        return m_icon;
    }

    function setOnClicked(callback)
    {
        m_onClicked = callback;
    }

    function onClicked()
    {
        return m_onClicked;
    }

    this.get = function ()
    {
        return m_button;
    };

    // ---

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

sh.Switch = function ()
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
    var m_items = [];

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
        m_items.push(item);
        m_listView.append(item.get());
    };

    this.item = function (n)
    {
        return m_items[n];
    };
};

sh.ListItem = function ()
{
    Object.defineProperties(this, {
        action: { set: setAction, get: action, enumerable: true },
        fillMode: { set: setFillMode, get: fillMode, enumerable: true },
        icon: { set: setIcon, get: icon, enumerable: true },
        subtitle: { set: setSubtitle, get: subtitle, enumerable: true },
        title: { set: setTitle, get: title, enumerable: true },
        selected: { set: setSelected, get: selected, enumerable: true },
        onClicked: { set: setOnClicked, get: onClicked, enumerable: true }
    });

    var m_action = ["", null];
    var m_icon = "";
    var m_fillMode = "cover";
    var m_title = "";
    var m_subtitle = "";
    var m_isSelected = false;
    var m_onClicked = null;

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
            sh.tag("div").class("sh-right sh-selection-box")
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

    function setSelected(value)
    {
        if (value)
        {
            m_listItem.addClass("sh-selected");
        }
        else
        {
            m_listItem.removeClass("sh-selected");
        }
        m_isSelected = value;
    }

    function selected()
    {
        return m_isSelected;
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

    function setOnClicked(callback)
    {
        m_listItem.off("click").on("click", callback);
        m_onClicked = callback;
    }

    function onClicked()
    {
        return m_onClicked;
    }
};

sh.GridView = function ()
{
    var m_items = [];

    var m_gridView = $(
        sh.tag("div")
        .style("display", "flex")
        .style("flex-direction", "row")
        .style("flex-wrap", "wrap")
        .style("justify-content", "flex-start")
        .html()
    );

    this.get = function ()
    {
        return m_gridView;
    };

    this.add = function (item)
    {
        m_items.push(item);
        m_gridView.append(item.get());
    };

    this.item = function (n)
    {
        return m_items[n];
    };
};

sh.GridItem = function ()
{
    Object.defineProperties(this, {
        action: { set: setAction, get: action, enumerable: true },
        fillMode: { set: setFillMode, get: fillMode, enumerable: true },
        icon: { set: setIcon, get: icon, enumerable: true },
        title: { set: setTitle, get: title, enumerable: true },
        selected: { set: setSelected, get: selected, enumerable: true },
        onClicked: { set: setOnClicked, get: onClicked, enumerable: true }
    });

    var m_action = ["", null];
    var m_icon = "";
    var m_fillMode = "cover";
    var m_title = "";
    var m_isSelected = false;
    var m_onClicked = null;

    var m_gridItem = $(
        sh.tag("div")
        .style("position", "relative")
        .style("width", "160px")
        .style("height", "160px")
        .style("padding", "0").style("margin", "0")
        .style("margin-top", "2px")
        .style("margin-left", "2px")
        .style("background-repeat", "no-repeat")
        .style("background-position", "50% 50%")
        .content(
            sh.tag("h1")
            .style("position", "absolute")
            .style("background-color", "var(--color-primary-background-translucent)")
            .style("padding", "0")
            .style("left", "0")
            .style("right", "0")
            .style("bottom", "0")
            .style("font-size", "80%")
            .style("text-align", "center")
            .content("")
        )
        .html()
    );

    var m_iconBox = m_gridItem;
    var m_buttonBox = m_gridItem.find("> div").eq(2);

    this.get = function ()
    {
        return m_gridItem;
    };

    function setIcon(url)
    {
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
        m_gridItem.find("h1").html(sh.escapeHtml(title));
        m_title = title;
    }

    function title()
    {
        return m_title;
    }

    function setSelected(value)
    {
        if (value)
        {
            m_gridItem.addClass("sh-selected");
        }
        else
        {
            m_gridItem.removeClass("sh-selected");
        }
        m_isSelected = value;
    }

    function selected()
    {
        return m_isSelected;
    }

    function setAction(action)
    {
        var icon = action[0];
        var callback = action[1];

        var box = $(
            sh.tag("div").class("sh-selection-box")
            .style("position", "absolute")
            .style("top", "0")
            .style("right", "0")
            .style("width", "42px")
            .style("height", "42px")
            .style("text-align", "center")
            .style("border-radius", "3px")
            .content(
                sh.tag("span").class("sh-fw-icon " + icon)
                .style("line-height", "42px")
            )
            .html()
        );
        box.on("click", function (event)
        {
            event.stopPropagation();
            callback();
        });

        m_gridItem.append(box);
        m_action = action;
    }

    function action()
    {
        return m_action;
    }

    function setOnClicked(callback)
    {
        m_gridItem.off("click").on("click", callback);
        m_onClicked = callback;
    }

    function onClicked()
    {
        return m_onClicked;
    }
};
