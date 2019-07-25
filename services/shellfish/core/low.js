"use strict";

exports.__id = "shellfish/low";

require("/::res/shellfish/jquery-2.1.4.min.js", function (jq)
{
    var mql = window.matchMedia("(prefers-color-scheme: dark)");
    if (mql.matches)
    {
        $("body").removeClass("sh-theme-default").addClass("sh-theme-dark");
    }
    mql.addListener(function (ev)
    {
        if (ev.matches)
        {
            $("body").removeClass("sh-theme-default").addClass("sh-theme-dark");
        }
        else
        {
            $("body").removeClass("sh-theme-dark").addClass("sh-theme-default");
        }
    });
});

/* Escapes the given text for HTML output.
 */
function escapeHtml(text)
{
    return text.replace(/[\"'&<>]/g, function (a)
    {
        return {
            '"': '&quot;',
            '\'': '&apos;',
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[a];
    });
}
exports.escapeHtml = escapeHtml;

/* Resolves icons in the given text.
 * Icons are encoded by [icon:<name>].
 */
function resolveIcons(text)
{
    var out = "";
    var lastPos = 0;
    var pos = text.indexOf("[icon:");
    while (pos !== -1)
    {
        // copy everything up to the icon
        out += text.substring(lastPos, pos);

        // find icon name
        var endPos = text.indexOf("]", pos);
        var iconName = text.substring(pos + 6, endPos);

        // make icon
        out += tag("span").class("sh-fw-icon sh-icon-" + iconName).html();

        // advance
        lastPos = endPos + 1;
        pos = text.indexOf("[icon:", lastPos);
    }

    // copy what's left
    out += text.substring(lastPos);

    return out;
}
exports.resolveIcons = resolveIcons;

var tag;
(function ()
{
    var Tag = function (t)
    {
        const NON_CLOSE_TAGS = [
            "link",
            "meta",
            "br",
            "hr",
            "img",
            "input"
        ];
    
        var that = this;
        var m_tag = t;
        var m_attrs = [];
        var m_style = [];
        var m_content = [];
    
        this.attr = function (key, value)
        {
            m_attrs.push([key, value]);
            return that;
        };
        
        this.style = function (key, value)
        {
            m_style.push([key, value]);
            return that;
        };
    
        this.id = function (s)
        {
            m_attrs.push(["id", s]);
            return that;
        };
        
        this.class = function (c)
        {
            m_attrs.push(["class", c]);
            return that;
        };
    
        this.data = function (d, v)
        {
            m_attrs.push(["data-" + d, v]);
            return that;
        }
    
        this.on = function (ev, handler)
        {
            m_attrs.push(["on" + ev, handler]);
            return that;
        };
    
        this.content = function (c)
        {
            if (typeof c === "string")
            {
                m_content.push(new Data(c));
            }
            else
            {
                m_content.push(c);
            }
            return that;
        };
    
        this.child = function (n)
        {
            if (n >= 0)
            {
                return m_content[n];
            }
            else
            {
                return m_content[m_content.length + n];
            }
        };
    
        this.html = function ()
        {
            var out = "";
            if (m_tag !== "")
            {
                out += "<" + m_tag;
                m_attrs.forEach(function (a)
                {
                    out += " " + a[0] + "=\"" + escapeHtml(a[1]) + "\"";
                });
                if (m_style.length > 0)
                {
                    out += " style = \"";
                    m_style.forEach(function (s)
                    {
                        out += s[0] + ": " + s[1] + "; ";
                    });
                    out += "\"";
                }
                out += ">";
            }
            m_content.forEach(function (c)
            {
                out += c.html();
            });
            if (m_tag !== "")
            {
                if (NON_CLOSE_TAGS.indexOf(m_tag) === -1)
                {
                    out += "</" + m_tag + ">\n";
                }
            }
            return out;
        };
    };
    
    var Data = function (d)
    {
        var m_data = d;
    
        this.html = function ()
        {
            return m_data;
        }
    }
    
    tag = function (t)
    {
        return new Tag(t);
    }
    exports.tag = tag;
})();




/* Resolves and returns the item given by its element ID or its DOM node.
 */
function item(which)
{
    switch ($.type(which))
    {
    case "string":
        return $("#" + which);
    default:
        return $(which);
    }
}
exports.item = item;

/* Freezes the given page at the given scroll position.
 */
function pageFreeze(page, where)
{
    var scrollTop = where;
    page.prop("rememberedScrollTop",  scrollTop);
    page.addClass("sh-page-transitioning");
    page.find("> section, > div").css("margin-top", (-scrollTop) + "px");
}
exports.pageFreeze = pageFreeze;

/* Unfreezes the given page, restoring the frozen scroll position.
 */
function pageUnfreeze(page)
{
    page.removeClass("sh-page-transitioning");
    page.find("> section, > div").css("margin-top", "0");
    $(document).scrollTop(page.prop("rememberedScrollTop") || 0);
}
exports.pageUnfreeze = pageUnfreeze;

/* Pushes the given page onto the page stack. Invokes callback afterwards.
 */
function pagePush(page, callback, immediate)
{
    pageFreeze(page, 0);

    var prevPage = $(".sh-page:not(.sh-hidden)").last();
    if (prevPage.length)
    {
        if (prevPage[0] === page[0])
        {
            prevPage = [];
            page.prop("rememberedScrollTop",  0);
        }
        else
        {
            pageFreeze(prevPage, $(document).scrollTop());
        }
    }

    if (! immediate)
    {
        // position page to the right
        var width = $(window).width();
        page.css("left", width + "px")
            .css("right", -width + "px");
        page.find("> header, > footer")
            .css("left", width + "px")
            .css("right", -width + "px");
    }

    page.removeClass("sh-hidden");

    if (! immediate)
    {
        // slide into view
        page.animate({
            left: 0,
            right: 0
        }, 350, function ()
        {
            if (prevPage.length)
            {
                prevPage.addClass("sh-hidden");
                prevPage.trigger("hidden");
            }
            pageUnfreeze(page);
            if (callback)
            {
                callback();
            }
        });
    
        page.find("> header, > footer").animate({
            left: 0,
            right: 0
        }, 350);
    }
    else
    {
        if (prevPage.length)
        {
            prevPage.addClass("sh-hidden");
            prevPage.trigger("hidden");
        }
        pageUnfreeze(page);
        if (callback)
        {
            callback();
        }
    }
}
exports.pagePush = pagePush;

/* Pops the topmost page off the page stack. Invokes callback afterwards.
 */
function pagePop(callback, reverse, immediate)
{
    var pages = $(".sh-page");

    if (pages.length > 1)
    {
        var page = $(pages[pages.length - 1]);
        var prevPage = $(pages[pages.length - 2]);

        prevPage.removeClass("sh-hidden");
        
        if (! immediate)
        {
            // slide out
            pageFreeze(page, $(document).scrollTop());

            var width = $(window).width();
            page.animate({
                left: (reverse ? -width : width) + "px",
                right: (reverse ? width : -width) + "px"
            }, 350, function ()
            {
                page.addClass("sh-hidden");
                pageUnfreeze(page);
                pageUnfreeze(prevPage);
                prevPage.trigger("visible");

                page.css("left", "0").css("right", "0");
                page.trigger("sh-closed");
    
                if (callback)
                {
                    callback();
                }
            });
    
            page.find("> header, > footer").animate({
                left: (reverse ? -width : width) + "px",
                right: (reverse ? width : -width) + "px"
            }, 350, function ()
            {
                page.find("> header, > footer").css("left", "0").css("right", "0");
            });
        }
        else
        {
            page.addClass("sh-hidden");
            pageUnfreeze(page);
            pageUnfreeze(prevPage);
            prevPage.trigger("visible");

            page.css("left", "0").css("right", "0");
            page.find("> header, > footer").css("left", "0").css("right", "0");
            page.trigger("sh-closed");

            if (callback)
            {
                callback();
            }
        }
    }
}
exports.pagePop = pagePop;

/* Sets up a swipe-back touch gesture on the given page.
 * Invokes the given callback on swiping back.
 * Provide an empty callback to disable swipe-back.
 */
function pageOnSwipe(page, callback)
{
    // TODO: should be mid-layer

    page
    .off("touchstart")
    .off("touchmove")
    .off("touchend");

    page.on("touchstart", function (ev)
    {
        var backIndicator = $(
            tag("div")
            .style("position", "fixed")
            .style("top", "0")
            .style("bottom", "0")
            .style("left", "8px")
            .style("font-size", "10vh")
            .content(
                tag("span").class("sh-fw-icon sh-icon-arrow_back")
                .style("line-height", "100vh")
                .style("padding", "0.10em")
                .style("background-color", "var(--color-primary)")
                .style("color", "var(--color-primary-background)")
            )
            .html()
        );

        this.swipeContext = {
            beginX: ev.originalEvent.touches[0].screenX,
            beginY: ev.originalEvent.touches[0].screenY,
            status: 0,
            scrollTop: 0,
            backIndicator: backIndicator
        };
    });

    page.on("touchmove", function (ev)
    {
        var dx = ev.originalEvent.touches[0].screenX - this.swipeContext.beginX;
        var dy = ev.originalEvent.touches[0].screenY - this.swipeContext.beginY;
        var pos = dx - 16;
        
        var fullWidth = $(this).width();
        var swipeThreshold = fullWidth * 0.20;
    
        switch (this.swipeContext.status)
        {
        case 0: // initiated
            if (pos > 0)
            {
                var angle = Math.atan(dy / dx);
                if (Math.abs(angle) > Math.PI / 4)
                {
                    this.swipeContext.status = 3;
                }
                else
                {
                    var scrollTop = $(document).scrollTop();
                    pageFreeze(page, scrollTop);

                    var pages = $(".sh-page");
                    if (pages.length > 1)
                    {
                        var prevPage = $(pages[pages.length - 2]);
                        prevPage.removeClass("sh-hidden");
                    }

                    this.swipeContext.scrollTop = scrollTop;
                    this.swipeContext.status = 1;
                }
            }
            break;
    
        case 1: // swiping
            page.css("left", Math.max(0, Math.min(fullWidth, pos)) + "px")
                .css("right", -Math.max(0, Math.min(fullWidth, pos)) + "px");
            page.find("> header").css("left", Math.max(0, Math.min(fullWidth, pos)) + "px")
                                 .css("right", -Math.max(0, Math.min(fullWidth, pos)) + "px");
           
            if (dx > swipeThreshold)
            {
                $("body").append(this.swipeContext.backIndicator);
                this.swipeContext.status = 2;
            }
            break;
    
        case 2: // activated
            page.css("left", Math.max(0, Math.min(fullWidth, pos)) + "px")
                .css("right", -Math.max(0, Math.min(fullWidth, pos)) + "px");
            page.find("> header").css("left", Math.max(0, Math.min(fullWidth, pos)) + "px")
                                 .css("right", -Math.max(0, Math.min(fullWidth, pos)) + "px");
    
            if (dx < swipeThreshold)
            {
                this.swipeContext.backIndicator.remove();
                this.swipeContext.status = 1;
            }
            break;
    
        case 3: // aborted
            break;
        }
    });

    page.on("touchend", function (ev)
    {
        function resetPage()
        {
            pageUnfreeze(page);
            page.css("left", "0").css("right", "0")
        }

        function resetHeader()
        {
            page.find("> header").css("left", "0").css("right", "0")
        }

        function finish()
        {
            if (swipeContext.status === 2)
            {
                callback();
            }

            var left = page.css("left");
            setTimeout(function ()
            {
                if (page.css("left") === left)
                {
                    resetPage();
                    resetHeader();
                }
            }, 500);
        }

        var swipeContext = this.swipeContext;
        var fullWidth = $(this).width();
        this.swipeContext.backIndicator.remove();
        
        if (swipeContext.status === 1)
        {
            page.animate({
                left: "0",
                right: "0"
            }, 300, resetPage);
            page.find("> header").animate({
                left: "0",
                right: "0"
            }, 300, resetHeader);
        }
        else if (swipeContext.status === 2)
        {
            page.animate({
                left: fullWidth + "px",
                right: -fullWidth + "px"
            }, 300, finish);
            page.find("> header").animate({
                left: fullWidth + "px",
                right: -fullWidth + "px"
            }, 300);
        }
    });
}
exports.pageOnSwipe = pageOnSwipe;

/* Opens the given menu attached to a parent element.
 * Invokes callback afterwards.
 */
function menuOpen(menu, parent, callback)
{
    menu.css("visibility", "hidden").removeClass("sh-hidden");

    var content = menu.find(">:first-child");
    var p = $(parent);

    if (menu.length && p.length && content.length)
    {
        var w = Number(p.css("width").replace("px", ""));
        var h = Number(p.css("height").replace("px", ""));
        
        var l = p.offset().left + (w - content.width()) / 2;

        if (l < 0)
        {
            l = 0;
        }
        else if (l + content.width() >= $(window).width())
        {
            l = $(window).width() - content.width() - 5;
        }

        content.css("left", l + "px");
        content.css("top", p.offset().top - $(document).scrollTop() + (h * 0.96) + "px");

        menu.css("visibility", "visible");

        if (callback)
        {
            callback();
        }
    }
}
exports.menuOpen = menuOpen;

/* Returns if fullscreen mode is currently active.
 */
function fullscreenStatus()
{
    var state = document.webkitIsFullScreen || 
                document.mozFullScreen ||
                document.fullScreen;

    return (state === true);
}
exports.fullscreenStatus = fullscreenStatus;

/* Displays the given target in fullscreen mode.
 */
function fullscreenEnter(target)
{
    var e = $(target).get(0);
    if (e.webkitRequestFullscreen)
    {
        e.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    else if (e.mozRequestFullScreen)
    {
        e.mozRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    else if (e.msRequestFullscreen)
    {
        e.msRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    else if (e.requestFullscreen)
    {
        e.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
}
exports.fullscreenEnter = fullscreenEnter;

/* Leaves fullscreen mode.
 */
function fullscreenExit()
{
    if (document.webkitExitFullscreen)
    {
        document.webkitExitFullscreen();
    }
    else if (document.mozCancelFullScreen)
    {
        document.mozCancelFullScreen();
    }
    else if (document.msExitFullscreen)
    {
        document.msExitFullscreen();
    }
    else if (document.exitFullscreen)
    {
        document.exitFullscreen();
    }
}
exports.fullscreenExit = fullscreenExit;
