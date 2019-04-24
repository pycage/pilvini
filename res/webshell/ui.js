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

ui.NavBar = function ()
{
    Object.defineProperties(this, {
        page: { set: setPage, get: page, enumerable: true }
    });

    var m_page = null;
    var m_navBar = $(
        sh.tag("div")
        .style("position", "absolute")
        .style("top", "0")
        .style("left", "0")
        .style("width", "32px")
        .style("height", "100%")
        .style("background-color", "var(--color-primary)")
        .style("color", "var(--color-primary-background)")
        .style("text-align", "center")
        .style("font-weight", "bold")
        .html()
    );

    m_navBar.on("mousedown", function (event)
    {
        this.pressed = true;

        var percents = (event.clientY - $(this).offset().top) /
                       ($(window).height() - $(this).offset().top);
        $(document).scrollTop(($(document).height() - $(window).height()) * percents);
    });

    m_navBar.on("mouseup", function (event)
    {
        this.pressed = false;
    });

    m_navBar.on("mouseleave", function (event)
    {
        this.pressed = false;
    });

    m_navBar.on("mousemove", function (event)
    {
        if (this.pressed)
        {
            var percents = (event.clientY - $(this).offset().top) /
                           ($(window).height() - $(this).offset().top);
            $(document).scrollTop(($(document).height() - $(window).height()) * percents);
        }
    });

    // quite an effort to work around quirks in certain touch browsers

    m_navBar.on("touchstart", function (event)
    {
        var scrollBegin = $(document).scrollTop();
        m_page.get().addClass("sh-page-transitioning");
        m_page.get().find("> section").scrollTop(scrollBegin);
        this.touchContext = {
            top: $(this).offset().top,
            scrollBegin: scrollBegin,
            scrollTarget: 0
        };
    });

    m_navBar.on("touchend", function (event)
    {
        m_page.get().find("> section").css("margin-top", 0);
        m_page.get().removeClass("sh-page-transitioning");
        if (this.touchContext.scrollTarget > 0)
        {
            $(document).scrollTop(this.touchContext.scrollTarget);
        }    
    });

    m_navBar.on("touchmove", function (event)
    {
        event.preventDefault();
        
        var percents = (event.originalEvent.touches[0].clientY - this.touchContext.top) /
                    ($(window).height() - this.touchContext.top);
        percents = Math.max(0, Math.min(1, percents));

        var scrollTop = (m_navBar.height() + m_page.header.get().height() - $(window).height()) * percents;

        m_page.get().find("> section").css("margin-top", (-scrollTop) + "px");
        this.touchContext.scrollTarget = scrollTop;        
    });

    function setPage(page)
    {
        m_page = page;
    }

    function page()
    {
        return m_page;
    }

    this.get = function ()
    {
        return m_navBar;
    };

    this.update = function ()
    {
        m_navBar.html("");
        m_navBar.height(0);

        var items = m_page.get().find(".fileitem");
        var currentLetter = "";
        var previousOffset = -1;

        for (var i = 0; i < items.length; ++i)
        {
            var item = $(items[i]);
            var letter = item.find("h1").html()[0].toUpperCase();
            var offset = item.offset().top;
    
            if (letter !== currentLetter && offset !== previousOffset)
            {
                m_navBar.append(
                    sh.tag("span")
                    .style("position", "absolute")
                    .style("top", (item.offset().top - m_page.header.get().height()) + "px")
                    .style("left", "0")
                    .style("right", "0")
                    .content(letter)
                    .html()
                )
                currentLetter = letter;
                previousOffset = offset;
            }
        }

        var windowHeight = $(window).height() - m_page.header.get().height() - 1;
        var contentHeight = m_page.get().find("> section").height();
        var minHeight = Math.max(windowHeight, contentHeight);
        m_navBar.height(Math.max(windowHeight, contentHeight));

        m_navBar.css("top", m_page.header.get().height() + "px");
    };
};

ui.StatusBox = function ()
{
    var that = this;
    var m_box = $(
        sh.tag("footer").class("sh-dropshadow")
        /*
        .style("position", "fixed")
        .style("bottom", "0")
        .style("left", "0")
        .style("right", "0")
        */
        .style("height", "auto")
        .style("text-align", "left")
        //.style("border", "solid 1px var(--color-border)")
        .style("background-color", "var(--color-primary-background)")
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
};

ui.StatusItem = function ()
{
    Object.defineProperties(this, {
        icon: { set: setIcon, get: icon, enumerable: true },
        text: { set: setText, get: text, enumerable: true },
        progress: { set: setProgress, get: progress, enumerable: true }
    });

    var m_icon = "";
    var m_text = "";
    var m_progress = 0;

    var m_item = $(
        sh.tag("div")
        .style("position", "relative")
        .style("border-top", "solid 1px var(--color-border)")
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
                sh.tag("span").class("sh-fw-icon")
            )
            .content(
                sh.tag("span")
            )
        )
        .html()
    );

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
        m_item.find("h1 > span").last().html(sh.escapeHtml(text));
        m_text = text;
    }

    function text()
    {
        return m_text;
    }

    function setProgress(progress)
    {
        m_item.find("> div").css("width", progress + "%");
        m_progress = progress;
    }

    function progress()
    {
        return m_progress;
    }

    this.get = function ()
    {
        return m_item;
    };
};