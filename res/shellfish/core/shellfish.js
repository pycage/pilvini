var sh = { };

sh.pageFreeze = function(which, where)
{
    var page = sh.item(which);

    var scrollTop = where;
    page.prop("rememberedScrollTop",  scrollTop);
    page.addClass("sh-page-transitioning");
    page.find("> section").css("margin-top", (-scrollTop) + "px");
}

sh.pageUnfreeze = function(which)
{
    var page = sh.item(which);

    page.removeClass("sh-page-transitioning");
    page.find("> section").css("margin-top", "0");
    $(document).scrollTop(page.prop("rememberedScrollTop") || 0);
}

/* Pushes the given page onto the page stack. Invokes callback afterwards.
 */
sh.push = function (which, callback, immediate)
{
    var page = sh.item(which);
    if (! page.length)
    {
        return;
    }

    sh.pageFreeze(page, 0);
    
    var prevPage = $(".sh-page.sh-visible").last();
    if (prevPage.length)
    {
        console.log("Prev page: " + prevPage);
        if (prevPage[0] === page[0])
        {
            prevPage = [];
            page.prop("rememberedScrollTop",  0);
        }
        else
        {
            sh.pageFreeze(prevPage, $(document).scrollTop());
        }
    }

    if (! immediate)
    {
        // position page to the right
        var width = $(window).width();
        page.css("left", width + "px")
            .css("right", -width + "px");
        page.find("> header").css("left", width + "px")
                             .css("right", -width + "px");
    }

    // adjust header label width
    var header = page.find("> header");
    if (header.length) {
        var spanLeftWidth = 16;
        var spanRightWidth = 16;
        var spans = header.find("> span:first-child, > span:last-child");
        for (var i = 0; i < spans.length; ++i) {
            var item = spans[i];
            if (i === 0) {
                spanLeftWidth += $(item).width();
            }
            else {
                spanRightWidth += $(item).width();
            }
        }
        header.css("padding-left", spanLeftWidth + "px")
              .css("padding-right", spanRightWidth + "px");
    }

    page.addClass("sh-visible");
    $(".sh-page.sh-visible").each(function (i)
    {
        $(this).css("zIndex", i);
    });


    /*
    // provide synchronized scrolling for a better experience on Fire TV Silk Browser
    $("html").height(p.prop("scrollHeight"));
    p.css("overflow", "hidden");
    $(document).off("scroll").on("scroll").scroll(function ()
    {
        p.scrollTop($(document).scrollTop());
    });
    */
    

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
                prevPage.css("display", "none");
            }
            sh.pageUnfreeze(page);
            if (callback)
            {
                callback();
            }
        });
    
        page.find("> header").animate({
            left: 0,
            right: 0
        }, 350);
    }
    else
    {
        if (prevPage.length)
        {
            prevPage.css("display", "none");
        }
        sh.pageUnfreeze(page);
        if (callback)
        {
            callback();
        }
    }
}

/* Pops the topmost page off the page stack. Invokes callback afterwards.
 */
sh.pop = function (callback, reverse, immediate)
{
    var pages = $(".sh-page.sh-visible");

    if (pages.length > 1)
    {
        var page = $(pages[pages.length - 1]);
        var prevPage = $(pages[pages.length - 2]);

        
        prevPage.css("display", "block");
        
        if (! immediate)
        {
            // slide out
            sh.pageFreeze(page, $(document).scrollTop());

            var width = $(window).width();
            page.animate({
                left: (reverse ? -width : width) + "px",
                right: (reverse ? width : -width) + "px"
            }, 350, function ()
            {
                page.removeClass("sh-visible");
                sh.pageUnfreeze(page);
                sh.pageUnfreeze(prevPage);

                page.css("left", "0").css("right", "0");
                page.trigger("sh-closed");
    
                if (callback)
                {
                    callback();
                }
            });
    
            page.find("> header").animate({
                left: (reverse ? -width : width) + "px",
                right: (reverse ? width : -width) + "px"
            }, 350, function ()
            {
                page.find("> header").css("left", "0").css("right", "0");
            });
        }
        else
        {
            page.removeClass("sh-visible");
            sh.pageUnfreeze(page);
            sh.pageUnfreeze(prevPage);

            page.css("left", "0").css("right", "0");
            page.find("> header").css("left", "0").css("right", "0");
            page.trigger("sh-closed");

            if (callback)
            {
                callback();
            }
        }
    }
}

/* Sets up swipe-back touch gesture for the given page.
 * Invokes the given callback on swiping back.
 */
sh.onSwipeBack = function (which, callback)
{
    var page = sh.item(which);

    if (! page.length)
    {
        return;
    }

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
                tag("span").class("sh-fw-icon sh-icon-back")
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
                    sh.pageFreeze(page, scrollTop);

                    var pages = $(".sh-page.sh-visible");
                    if (pages.length > 1)
                    {
                        var prevPage = $(pages[pages.length - 2]);
                        prevPage.css("display", "block");
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
            sh.pageUnfreeze(page);
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
            }, 100);
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

/* Pops the topmost page off the page stack. Invokes callback afterwards.
 * The page slides in a way that signalizes acceptance.
 */
sh.accept = function (callback)
{
    sh.pop(callback, true);
}

/* Pushes the given page onto the page stack as a dialog with buttons
 * and a callback for each button.
 */
sh.dialog = function (which, callbacks)
{
    var dlg = sh.item(which);
    if (dlg.length)
    {
        $(".sh-page").css("z-index", 0);
        $(dlg).css("z-index", 1000);
        var buttons = dlg.find("> header > span > a");
        for (var i = 0; i < buttons.length; ++i)
        {
            var f = function (i, callback)
            {
                return function ()
                {
                    if (i === 0)
                    {
                        sh.pop(callback);
                    }
                    else
                    {
                        sh.accept(callback);
                    }
                };
            } (i, callbacks[i] || function () { });
            $(buttons[i]).off("click").on("click", f);
        }
    }
    sh.push(dlg);
}

/* Opens the given menu attached to a parent element.
 * Invokes callback afterwards.
 */
sh.menu = function (parent, which, callback)
{
    var menu = sh.item(which);
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

        /*
        if (l + content.width() > $(window).width())
        {
            l = l + w - content.width() - 1;
        }
        */

        content.css("left", l + "px");
        content.css("top", p.offset().top - $(document).scrollTop() + h + "px");

        menu.css("zIndex", $(".sh-page").length);
        menu.addClass("sh-visible");
    }
}


/* Closes the currently opened menu. Invokes callback afterwards.
 */
sh.menu_close = function (callback)
{
    var menu = $(".sh-menu.sh-visible").last();
    if (menu.length)
    {
        menu.removeClass("sh-visible");
        menu.trigger("sh-closed");
        if (callback)
        {
            callback();
        }
    }
}


/* Toggles the given submenu.
 */
sh.toggle_submenu = function (item)
{
    $(item).parent().find(".sh-submenu").each(function (i)
    {
        if (this !== item)
        {
            $(this).removeClass("sh-submenu-visible");
        }
    });
    $(item).toggleClass("sh-submenu-visible");
}


sh.popup = function (which, callback)
{
    var p = sh.item(which);
    if (p.length)
    {
        p.addClass("sh-visible");
        p.css("zIndex", $(".sh-page.sh-visible").length + $(".sh-popup.sh-visible").length);

        if (callback)
        {
            callback();
        }
    }
}

sh.popup_close = function (which, callback)
{
    var popup = sh.item(which);
    if (popup.length)
    {
        popup.removeClass("sh-visible");
        popup.trigger("sh-closed");
        if (callback)
        {
            callback();
        }
    }
}

sh.set_footer = function (whichPage, size)
{
    var page = sh.item(whichPage);
    if (page.length)
    {
        if (size === 0)
        {
            page.find("> footer").css("visibility", "hidden");
            page.css("padding-bottom", "0");
        }
        else
        {
            page.find("> footer").css("visibility", "visible")
                                 .height(size);
            page.css("padding-bottom", size + "px");
        }
    }
}

sh.item = function (which)
{
    switch ($.type(which))
    {
    case "string":
        return $("#" + which);
    default:
        return $(which);
    }
}

sh.zSort = function (data)
{
    data.sort(function (a, b)
    {
        var aZ = Number($(a).css("zIndex")) || 0;
        var bZ = Number($(b).css("zIndex")) || 0;
        return aZ - bZ;
    });
    return data;
}

sh.topmost = function (filter)
{
    var items = sh.zSort($(filter));
    if (items.length)
    {
        return items[items.length - 1];
    }
    else
    {
        return undefined;
    }
}

sh.isFullscreen = function ()
{
    var state = document.fullScreen ||
                document.mozFullScreen ||
                document.webkitIsFullScreen;

    return (state === true);
}

sh.requestFullscreen = function (target)
{
    var e = $(target).get(0);
    if (e.requestFullscreen)
    {
        e.requestFullscreen();
    }
    else if (e.msRequestFullscreen)
    {
        e.msRequestFullscreen();
    }
    else if (e.mozRequestFullScreen)
    {
        e.mozRequestFullScreen();
    }
    else if (e.webkitRequestFullscreen)
    {
        e.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
}

sh.exitFullscreen = function ()
{
    if (document.exitFullscreen)
    {
        document.exitFullscreen();
    }
    else if (document.webkitExitFullscreen)
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
}

/*
$(function ()
{
    sh.push("main-page");
});
*/
