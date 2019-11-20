"use strict";

exports.__id = "shell/ui";

var mods = [
    "shellfish/low",
    "shellfish/mid",
    "shellfish/high"
];
require(mods, function (low, mid, high)
{
    function showInfo(title, msg, callback)
    {
        var dlg = high.element(mid.Dialog);
        dlg
        .onClosed(dlg.discard)
        .title(title)
        .add(
            high.element(mid.Label).text(msg)
        )
        .button(
            high.element(mid.Button).text("Ok")
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
    }
    exports.showInfo = showInfo;
    
    function showError(msg, callback)
    {
        var dlg = high.element(mid.Dialog);
        dlg
        .onClosed(dlg.discard)
        .title("Error")
        .add(
            high.element(mid.Label).text(msg)
        )
        .button(
            high.element(mid.Button).text("Ok")
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
    }
    exports.showError = showError;
    
    function showQuestion(title, msg, yesCb, noCb)
    {
        var dlg = high.element(mid.Dialog);
        dlg
        .onClosed(dlg.discard)
        .title(title)
        .add(
            high.element(mid.Label).text(msg)
        )
        .button(
            high.element(mid.Button).text("Yes").action(function () { dlg.close_(); yesCb(); }).isDefault(true)
        )
        .button(
            high.element(mid.Button).text("No").action(function () { dlg.close_(); noCb(); })
        );
        dlg.show_();
    }
    exports.showQuestion = showQuestion;
        
    function StatusBox()
    {
        var that = this;
        var m_box = $(
            low.tag("footer").class("sh-dropshadow")
            /*
            .style("position", "fixed")
            .style("bottom", "0")
            .style("left", "0")
            .style("right", "0")
            */
            .style("height", "auto")
            .style("text-align", "left")
            //.style("border", "solid 1px var(--color-border)")
            //.style("background-color", "var(--color-primary-background)")
            .html()
        );
    
        this.get = function ()
        {
            return m_box;
        };
    
        this.push = function (item)
        {
            m_box.append(item.get());
        };
    }
    exports.StatusBox = StatusBox;
    
    function StatusItem()
    {
        Object.defineProperties(this, {
            left: { set: addLeft, get: left, enumerable: true },
            right: { set: addRight, get: right, enumerable: true },
            icon: { set: setIcon, get: icon, enumerable: true },
            text: { set: setText, get: text, enumerable: true },
            progress: { set: setProgress, get: progress, enumerable: true },
            onClicked: { set: setOnClicked, get: onClicked, enumerable: true }
        });
    
        var m_left = [];
        var m_right = [];
        var m_icon = "";
        var m_text = "";
        var m_progress = 0;
        var m_onClicked = null;
    
        var m_item = $(
            low.tag("div")
            .style("position", "relative")
            .style("border-top", "solid 1px var(--color-border)")
            .content(
                // box
                low.tag("div")
                .style("position", "relative")
                .style("display", "flex")
                .style("align-items", "center")
                .style("width", "100%")
                .content(
                    // progress bar
                    low.tag("div")
                    .style("position", "absolute")
                    .style("background-color", "var(--color-highlight-background)")
                    .style("top", "0")
                    .style("left", "0")
                    .style("width", "0%")
                    .style("height", "100%")
                )
                .content(
                    // left content area
                    low.tag("div")
                    .style("position", "relative")
                )
                .content(
                    // text
                    low.tag("h1")
                    .style("position", "relative")
                    .style("flex-grow", "1")
                    .style("line-height", "100%")
                    .content(
                        low.tag("span").class("sh-fw-icon")
                    )
                    .content(
                        low.tag("span")
                    )
                )
                .content(
                    // right content area
                    low.tag("div")
                    .style("position", "relative")
                )
            )
            .content(
                // custom content area
                low.tag("div")
            )
            .html()
        );
    
        m_item.on("click", function ()
        {
            if (m_onClicked)
            {
                m_onClicked();
            }
        })
    
        function addLeft(child)
        {
            m_item.find("> div:nth-child(1) > div:nth-child(2)").append(child.get());
            m_left.push(child);
        }
    
        function left()
        {
            return m_left;
        }
    
        function addRight(child)
        {
            m_item.find("> div:nth-child(1) > div:nth-child(4)").append(child.get());
            m_right.push(child);
        }
    
        function right()
        {
            return m_right;
        }
    
        function setIcon(icon)
        {
            m_item.find("h1 > span").first().removeClass(m_icon).addClass(icon);
            m_icon = icon;
        }
    
        function icon()
        {
            return m_icon;
        }
    
        function setText(text)
        {
            m_item.find("h1 > span").last().html(low.escapeHtml(text));
            m_text = text;
        }
    
        function text()
        {
            return m_text;
        }
    
        function setProgress(progress)
        {
            m_item.find("> div:nth-child(1) > div:nth-child(1)").css("width", progress + "%");
            m_progress = progress;
        }
    
        function progress()
        {
            return m_progress;
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
            return m_item;
        };
    
        this.add = function (child)
        {
            m_item.find("> div:nth-child(2)").append(child.get());
        };
    }
    exports.StatusItem = StatusItem;    
});
