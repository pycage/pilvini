"use strict";

exports.__id = "shellfish/mid";

require(__dirname + "/low.js", function (low)
{
    /* Extends from a base object.
     */
    function extend(target, base)
    {
        Object.getOwnPropertyNames(base).forEach(function (prop)
        {
            var descriptor = Object.getOwnPropertyDescriptor(base, prop);
            Object.defineProperty(target, prop, descriptor);
        });
    }
    exports.extend = extend;

    function defineProperties(target, props)
    {
        for (var key in props)
        {
            var description = props[key];
            addProperty(target, key, description.set, description.get);
        }
    }
    exports.defineProperties = defineProperties;

    /* Adds a property with notification callback.
     */
    function addProperty(target, name, setter, getter)
    {
        var callback = null;

        var uname = name[0].toUpperCase() + name.substr(1);
        Object.defineProperty(target, "on" + uname + "Changed", {
            set: function (cb) { callback = cb; },
            get: function () { return callback; },
            enumerable: true
        });

        target[name + "Changed"] = function ()
        {
            if (callback) { callback(); }
        };

        Object.defineProperty(target, name, {
            set: function (v)
            {
                setter(v);
                target[name + "Changed"]();
            },
            get: getter,
            enumerable: true
        });
    }
    exports.addProperty = addProperty;

    /* Wraps an existing callback to invoke an additional one.
     */
    exports.chainCallback = function (callbackProperty, callback)
    {
        if (callbackProperty)
        {
            return function ()
            {
                callbackProperty.apply(this, arguments);
                callback(this, arguments);
            };
        }
        else
        {
            return callback;
        }
    };

    /* Element representing a page on the UI page stack.
     */
    function Page()
    {
        defineProperties(this, {
            header: { set: setHeader, get: header },
            footer: { set: setFooter, get: footer },
            left: { set: setLeft, get: left },
            script: { set: setScript, get: script },
            onSwipeBack: { set: setOnSwipeBack, get: onSwipeBack },
            onClosed: { set: setOnClosed, get: onClosed }
        });

        var that = this;
        var m_header = null;
        var m_footer = null;
        var m_left = null;
        var m_onSwipeBack = null;
        var m_onClosed = null;

        console.log("low " + Object.keys(low));
        var m_page = $(
            low.tag("div").class("sh-page")
            .content(
                low.tag("section")
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
                low.tag("script").attr("src", uri)
                .html()
            ));
        }

        function script()
        {
            return "";
        }

        function setOnSwipeBack(callback)
        {
            low.pageOnSwipe(m_page, callback);
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
            //$("#pagestack").append(m_page);
            $("body").append(m_page);
            that.updateGeometry();
            low.pagePush(m_page, callback, $(".sh-page").length === 1);

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
            low.pagePop(function ()
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
            m_page.find("> section").css("padding-top", (!! m_header ? m_header.get().height() : 0) + "px");
            m_page.find("> section").css("padding-bottom", (!! m_footer ? m_footer.get().height() : 0) + "px");
            m_page.find("> section").css("padding-left", (!! m_left ? m_left.get().width() : 0) + "px");
        }
    }
    exports.Page = Page;

    /* Element representing a page header with title and buttons.
     */
    function PageHeader()
    {
        defineProperties(this, {
            title: { set: setTitle, get: title },
            subtitle: { set: setSubtitle, get: subtitle },
            left: { set: addLeft, get: left },
            right: { set: addRight, get: right },
            onClicked: { set: setOnClicked, get: onClicked }
        });

        var m_title = "";
        var m_subtitle = "";
        var m_left = [];
        var m_right = [];
        var m_onClicked = null;

        var m_header = $(
            low.tag("header").class("sh-dropshadow")
            .style("padding-left", "3em")
            .style("padding-right", "3em")
            .content(
                low.tag("div")
                .style("line-height", "1.3rem")
                .style("padding-top", "0.2rem")
                .content(
                    low.tag("h1").style("overflow", "none").content("")

                )
                .content(
                    low.tag("h2").style("overflow", "none").content("")
                )
            )
            .content(
                low.tag("div").class("sh-left")
            )
            .content(
                low.tag("div").class("sh-right")
            )
            .html()
        );

        function setTitle(title)
        {
            m_header.find("> div > h1").html(low.resolveIcons(low.escapeHtml(title)));
            m_title = title;
        }

        function title()
        {
            return m_title;
        }

        function setSubtitle(subtitle)
        {
            m_header.find("> div > h2").html(low.escapeHtml(subtitle));
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
    }
    exports.PageHeader = PageHeader;

    function Menu()
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
            low.menuOpen(m_menu, parent, function () { });
        };

        this.close = function ()
        {
            m_menu.detach();
        }

        m_menu = $(
            low.tag("div").class("sh-menu")
            .content(
                low.tag("div")
                .content(
                    low.tag("ul")
                    .style("max-height", "75vh")
                    .style("overflow-x", "hidden")
                    .style("overflow-y", "auto")
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
    }
    exports.Menu = Menu;

    function Box()
    {
        defineProperties(this, {
            visible: { set: setVisible, get: visible }
        });

        var m_isVisible = true;

        var m_item = $(
            low.tag("div")
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
    }
    exports.Box = Box;

    function MenuItem()
    {
        defineProperties(this, {
            enabled: { set: setEnabled, get: enabled },
            icon: { set: setIcon, get: icon },
            text: { set: setText, get: text },
            visible: { set: setVisible, get: visible },
            onClicked: { set: setOnClicked, get: onClicked }
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
            m_item.find("span").last().html(low.escapeHtml(text));
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
            low.tag("li")
            .style("position", "relative")
            .on("click", "")
            .content(
                low.tag("span").class("sh-left sh-fw-icon")
            )
            .content(
                low.tag("span")
                .style("padding-left", "1.2em")
                .content("")
            )
            .html()
        );
    }
    exports.MenuItem = MenuItem;

    function SubMenu()
    {
        defineProperties(this, {
            text: { set: setText, get: text },
            visible: { set: setVisible, get: visible }
        });
        
        var m_subMenu;
        var m_text = "";

        function setText(text)
        {
            m_text = text;
            m_subMenu.find("h1").html(low.escapeHtml(text));
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
            low.tag("div")
            .content(
                low.tag("h1").class("sh-submenu")
                .on("click", "")
            )
            .content(
                low.tag("ul")
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
    }
    exports.SubMenu = SubMenu;

    function Separator()
    {
        var m_sep = $(
            low.tag("hr")
            .html()
        );

        this.get = function ()
        {
            return m_sep;
        };
    }
    exports.Separator = Separator;

    function Popup()
    {
        var m_popup = $(
            low.tag("div").class("sh-popup")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .content(
                low.tag("div").class("sh-dropshadow")
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
    }
    exports.Popup = Popup;

    function Dialog()
    {
        defineProperties(this, {
            title: { set: setTitle, get: title },
            button: { set: addButton, get: buttons }
        });

        var m_title = "";
        var m_buttons = [];

        var m_dialog = $(
            low.tag("form").class("sh-popup")
            .on("click", "event.stopPropagation();")
            .on("submit", "return false;")
            .content(
                low.tag("div").class("sh-dropshadow")
                .style("background-color", "var(--color-primary-background)")
                .style("max-width", "calc(100vw - 80px)")
                .content(
                    low.tag("header")
                    .style("border", "none")
                    .style("background-color", "var(--color-highlight-background)")
                    .content(
                        low.tag("h1")
                        .content("")
                    )
                )
                .content(
                    low.tag("section")
                    .style("margin-top", "2rem")
                    .style("margin-bottom", "2.5rem")
                    .style("max-width", "calc(100vw - 2rem)")
                    .style("max-height", "calc(100vh - 4.5rem - 2rem)")
                    .style("overflow", "auto")
                )
                .content(
                    low.tag("footer")
                    .style("border", "none")
                    .style("height", "2.5rem")
                    .style("line-height", "2.5rem")
                    .style("background-color", "var(--color-secondary-background)")
                    .content(
                        low.tag("span").class("sh-right")
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
            m_dialog.find("input").first().attr("tabindex", -1).focus();
        };

        /* Closes this dialog.
         */
        this.close = function ()
        {
            m_dialog.detach();
        }

        function setTitle(title)
        {
            m_dialog.find("header h1").html(low.escapeHtml(title));
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
    }
    exports.Dialog = Dialog;

    function BusyPopup()
    {
        defineProperties(this, {
            text: { set: setText, get: text }
        });

        var m_text = "";
        var m_popup = $(
            low.tag("div").class("sh-popup")
            .content(
                low.tag("div").class("sh-dropshadow")
                .style("color", "var(--color-primary)")
                .style("text-align", "center")
                .style("padding", "1em")
                .content(
                    low.tag("span").class("sh-busy-indicator")
                    .style("font-size", "200%")
                )
                .content(low.tag("br"))
                .content(low.tag("br"))
                .content(
                    low.tag("span").content("")
                )
            )
            .html()
        );

        function setText(text)
        {
            m_popup.find("span").last().html(low.escapeHtml(text));
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
    }
    exports.BusyPopup = BusyPopup;

    function Text()
    {
        defineProperties(this, {
            text: { set: setText, get: text }
        });

        var m_text = "";
        var m_label = $(
            low.tag("span")
            .content("")
            .html()
        );

        function setText(text)
        {
            m_label.html(low.escapeHtml(text));
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
    }
    exports.Text = Text;

    function Label()
    {
        defineProperties(this, {
            text: { set: setText, get: text }
        });

        var m_text = "";
        var m_label = $(
            low.tag("p")
            .content("")
            .html()
        );

        function setText(text)
        {
            m_label.html(low.escapeHtml(text));
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
    }
    exports.Label = Label;

    function Headline()
    {
        defineProperties(this, {
            title: { set: setTitle, get: title },
            subtitle: { set: setSubtitle, get: subtitle }
        });

        var m_title = "";
        var m_subtitle = "";
        var m_label = $(
            low.tag("div")
            .content(
                low.tag("h1")
            )
            .content(
                low.tag("h2")
            )
            .html()
        );

        function setTitle(text)
        {
            m_label.find("h1").html(low.escapeHtml(text));
            m_title = text;
        }

        function title()
        {
            return m_title;
        }

        function setSubtitle(text)
        {
            m_label.find("h2").html(low.escapeHtml(text));
            m_subtitle = text;
        }

        function subtitle()
        {
            return m_subtitle;
        }

        this.get = function ()
        {
            return m_label;
        };
    }
    exports.Headline = Headline;

    function Labeled()
    {
        defineProperties(this, {
            text: { set: setText, get: text }
        });

        var m_text = "";

        var m_row = $(
            low.tag("p")
            .content(
                low.tag("label").content("")
                .style("display", "inline-block")
                .style("min-width", "6em")
            )
            .html()
        );

        function setText(text)
        {
            m_row.find("> label").html(low.escapeHtml(text));
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
    }
    exports.Labeled = Labeled;

    function TextInput()
    {
        defineProperties(this, {
            text: { set: setText, get: text },
            password: { set: setPassword, get: password },
            focus: { set: setFocus, get: focus }
        });

        var m_password = false;
        var m_focus = false;

        var m_input = $(
            low.tag("input").attr("type", "text")
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
    }
    exports.TextInput = TextInput;

    function Toolbar()
    {
        defineProperties(this, {
            visible: { set: setVisible, get: visible },
            left: { set: addLeft, get: left },
            right: { set: addRight, get: right }
        });

        var m_isVisible = true;
        var m_left = [];
        var m_right = [];

        var m_item = $(
            low.tag("div")
            .style("position", "relative")
            .style("height", "3rem")
            .style("line-height", "3rem")
            .style("overflow", "hidden")
            .style("white-space", "nowrap")
            .content(
                low.tag("div").class("sh-left")
            )
            .content(
                low.tag("div").class("sh-right")
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
    }
    exports.Toolbar = Toolbar;

    function Gap()
    {
        var m_item = $(
            low.tag("div")
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
    exports.Gap = Gap;

    function Button()
    {
        defineProperties(this, {
            text: { set: setText, get: text },
            action: { set: setOnClicked, get: onClicked },
            onClicked: { set: setOnClicked, get: onClicked },
            isDefault: { set: setIsDefault, get: isDefault }
        });

        var m_text = "";
        var m_onClicked = null;
        var m_isDefault = false;

        var m_button = $(
            low.tag("input").attr("type", "button")
            .on("click", "")
            .attr("value", "")
            .html()
        );

        function setText(text)
        {
            m_button.prop("value", low.escapeHtml(text));
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
    }
    exports.Button = Button;

    function IconButton()
    {
        defineProperties(this, {
            enabled: { set: setEnabled, get: enabled },
            checked: { set: setChecked, get: checked },
            visible: { set: setVisible, get: visible },
            icon: { set: setIcon, get: icon },
            menu: { set: setMenu, get: menu },
            onClicked: { set: setOnClicked, get: onClicked }
        });

        var that = this;
        var m_enabled = true;
        var m_visible = true;
        var m_checked = false;
        var m_icon = "";
        var m_menu = null;
        var m_onClicked = null;

        var m_button = $(
            low.tag("div")
            .style("display", "inline-block")
            .style("width", "3rem")
            .style("height", "100%")
            .style("text-align", "center")
            .content(
                low.tag("span").class("sh-fw-icon")
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
            if (m_menu)
            {
                m_menu.popup(m_button);
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

        function setMenu(menu)
        {
            m_menu = menu;
        }

        function menu()
        {
            return m_menu;
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
    }
    exports.IconButton = IconButton;

    function Switch()
    {
        defineProperties(this, {
            enabled: { set: setEnabled, get: enabled },
            checked: { set: setChecked, get: checked },
            onToggled: { set: setOnToggled, get: onToggled }
        });

        var m_enabled = true;
        var m_onToggled = null;
        var m_swtch = $(
            low.tag("label").class("sh-switch")
            .content(
                low.tag("input").attr("type", "checkbox")
            )
            .content(
                low.tag("span")
            )
            .html()
        );

        m_swtch.find("input").on("click", function ()
        {
            if (m_onToggled)
            {
                m_onToggled(!! m_swtch.find("input").prop("checked"));
            }
        });

        this.get = function ()
        {
            return m_swtch;
        };

        function setEnabled(value)
        {
            if (value)
            {
                m_swtch.removeClass("sh-disabled");
            }
            else
            {
                m_swtch.addClass("sh-disabled");
            }
            m_enabled = value;
        }

        function enabled()
        {
            return m_enabled;
        }

        function setChecked(value)
        {
            m_swtch.find("input").prop("checked", value);
        }

        function checked()
        {
            return !! m_swtch.find("input").prop("checked");
        }

        function setOnToggled(cb)
        {
            m_onToggled = cb;
        }

        function onToggled()
        {
            return m_onToggled;
        }
    }
    exports.Switch = Switch;

    function ListView()
    {
        defineProperties(this, {
            size: { get: size }
        });

        var that = this;
        var m_items = [];

        var m_listView = $(
            low.tag("ul").class("sh-listview")
            .html()
        );

        function size()
        {
            return m_items.length;
        }

        this.get = function ()
        {
            return m_listView;
        };

        this.add = function (item)
        {
            m_items.push(item);
            m_listView.append(item.get());
            that.sizeChanged();
        };

        this.insert = function (at, item)
        {
            if (at === m_items.length)
            {
                that.add(item);
            }
            else if (at >= 0 && at < m_items.length)
            {
                m_items = m_items.slice(0, at).concat([item]).concat(m_items.slice(at));
                item.get().insertBefore(m_listView.find("> *")[at]);
                that.sizeChanged();
            }
        };

        this.remove = function (at)
        {
            if (at >= 0 && at < m_items.length)
            {
                m_items.splice(at, 1);
                m_listView.find("> *")[at].remove();
                that.sizeChanged();
            }
        };

        this.item = function (n)
        {
            return m_items[n];
        };

        this.clear = function ()
        {
            m_listView.html("");
            m_items = [];
            that.sizeChanged();
        };
    }
    exports.ListView = ListView;

    function ListItem()
    {
        defineProperties(this, {
            action: { set: setAction, get: action },
            fillMode: { set: setFillMode, get: fillMode },
            icon: { set: setIcon, get: icon },
            subtitle: { set: setSubtitle, get: subtitle },
            title: { set: setTitle, get: title },
            selected: { set: setSelected, get: selected },
            onClicked: { set: setOnClicked, get: onClicked }
        });

        var m_action = ["", null];
        var m_icon = "";
        var m_fillMode = "cover";
        var m_title = "";
        var m_subtitle = "";
        var m_isSelected = false;
        var m_onClicked = null;

        var m_listItem = $(
            low.tag("li")
            .style("height", "80px")
            .on("click", "")
            .content(
                low.tag("div").class("sh-left icon")
                .style("display", "none")
                .style("width", "80px")
                .style("background-repeat", "no-repeat")
                .style("background-position", "50% 50%")
            )
            .content(
                low.tag("div")
                .style("position", "absolute")
                .style("top", "1em")
                .style("left", "0")
                .style("right", "0")
                .style("padding-left", "0.5em")
                .content(
                    low.tag("h1").content("")
                )
                .content(
                    low.tag("h2").content("")
                )
            )
            .content(
                low.tag("div").class("sh-right sh-selection-box")
                .style("display", "none")
                .style("width", "42px")
                .style("text-align", "center")
                .style("border-left", "solid 1px var(--color-border)")
                .content(
                    low.tag("span").class("sh-fw-icon")
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
            m_labelBox.find("h1").html(low.escapeHtml(title));
            m_title = title;
        }

        function title()
        {
            return m_title;
        }

        function setSubtitle(subtitle)
        {
            m_labelBox.find("h2").html(low.escapeHtml(subtitle));
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
    }
    exports.ListItem = ListItem;

    function GridView()
    {
        var m_items = [];

        var m_gridView = $(
            low.tag("div")
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
    }
    exports.GridView = GridView;

    function GridItem()
    {
        defineProperties(this, {
            action: { set: setAction, get: action },
            fillMode: { set: setFillMode, get: fillMode },
            icon: { set: setIcon, get: icon },
            title: { set: setTitle, get: title },
            selected: { set: setSelected, get: selected },
            onClicked: { set: setOnClicked, get: onClicked }
        });

        var m_action = ["", null];
        var m_icon = "";
        var m_fillMode = "cover";
        var m_title = "";
        var m_isSelected = false;
        var m_onClicked = null;

        var m_gridItem = $(
            low.tag("div")
            .style("position", "relative")
            .style("width", "160px")
            .style("height", "160px")
            .style("padding", "0").style("margin", "0")
            .style("margin-top", "2px")
            .style("margin-left", "2px")
            .style("background-repeat", "no-repeat")
            .style("background-position", "50% 50%")
            .content(
                low.tag("h1")
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
            m_gridItem.find("h1").html(low.escapeHtml(title));
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
                low.tag("div").class("sh-selection-box")
                .style("position", "absolute")
                .style("top", "0")
                .style("right", "0")
                .style("width", "42px")
                .style("height", "42px")
                .style("text-align", "center")
                .style("border-radius", "3px")
                .content(
                    low.tag("span").class("sh-fw-icon " + icon)
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
    }
    exports.GridItem = GridItem;

    function ListModelView()
    {    
        defineProperties(this, {
            model: { set: setModel, get: model },
            delegate: { set: setDelegate, get: delegate }
        });

        var base = new ListView();
        extend(this, base);


        var m_model = null;
        var m_delegate = null;

        function setModel(m)
        {
            m_model = m;
            m.onReset = function ()
            {
                base.clear();
                for (var i = 0; !! m_delegate && i < m.size; ++i)
                {
                    var item = m_delegate(m.at(i));
                    base.add(item);
                }
            };
            m.onInsert = function (at)
            {
                var item = m_delegate(m.at(at));
                base.insert(at, item);
            };
            m.onRemove = function (at)
            {
                base.remove(at);
            };

            m.onReset();
        }

        function model()
        {
            return m_model;
        }

        function setDelegate(d)
        {
            m_delegate = d;
        }

        function delegate()
        {
            return m_delegate;
        }
    }
    exports.ListModelView = ListModelView;

    function ListModel()
    {
        defineProperties(this, {
            data: { set: setData, get: data },
            onReset: { set: setOnReset, get: onReset },
            onInsert: { set: setOnInsert, get: onInsert },
            onRemove: { set: setOnRemove, get: onRemove },
            size: { get: size }
        });

        var that = this;
        var m_data = [];
        var m_onReset = null;
        var m_onInsert = null;
        var m_onRemove = null;

        function setData(data)
        {
            that.reset(data);
        }

        function data()
        {
            return m_data.slice();
        }

        function setOnReset(cb)
        {
            m_onReset = cb;
        }

        function onReset()
        {
            return m_onReset;
        }

        function setOnInsert(cb)
        {
            m_onInsert = cb;
        }

        function onInsert()
        {
            return m_onInsert;
        }

        function setOnRemove(cb)
        {
            m_onRemove = cb;
        }

        function onRemove()
        {
            return m_onRemove;
        }

        function size()
        {
            return m_data.length;
        }

        this.reset = function (data)
        {
            m_data = data;
            that.sizeChanged();
            if (m_onReset)
            {
                m_onReset();
            }
        };

        this.insert = function (at, data)
        {
            if (at >= 0 && at <= m_data.length)
            {
                m_data = m_data.slice(0, at).concat([data]).concat(m_data.slice(at));
                that.sizeChanged();
                if (m_onInsert)
                {
                    m_onInsert(at);
                }
            }
        };

        this.remove = function (at)
        {
            if (at >= 0 && at < m_data.length)
            {
                m_data.splice(at, 1);
                that.sizeChanged();
                if (m_onRemove)
                {
                    m_onRemove(at);
                }
            }
        };

        this.at = function (n)
        {
            return m_data[n];
        };
    }
    exports.ListModel = ListModel;
});
