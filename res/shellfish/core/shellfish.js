var sh = { };

/* Pushes the given page onto the page stack. Invokes callback afterwards.
 */
sh.push = function (which, callback, immediate)
{
    var page = sh.item(which);
    if (! page.length)
    {
        return;
    }

    var prevPage = $(".sh-page.sh-visible").last();
    if (prevPage.length)
    {
        prevPage.prop("rememberedScrollTop",  $(document).scrollTop());
    }

    page.addClass("sh-page-transitioning");

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
            $(document).scrollTop(0);
            if (prevPage.length)
            {
                prevPage.css("display", "none");
            }
            page.removeClass("sh-page-transitioning");
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
        $(document).scrollTop(0);
        if (prevPage.length)
        {
            prevPage.css("display", "none");
        }
        page.removeClass("sh-page-transitioning");
        if (callback)
        {
            callback();
        }
    }
}

/* Pops the topmost page off the page stack. Invokes callback afterwards.
 */
sh.pop = function (callback, reverse)
{
    var pages = $(".sh-page.sh-visible");

    if (pages.length > 1)
    {
        var page = $(pages[pages.length - 1]);
        var prevPage = $(pages[pages.length - 2]);

        page.addClass("sh-page-transitioning");

        prevPage.css("display", "block");
        $(document).scrollTop(prevPage.prop("rememberedScrollTop") || 0);
        
        // slide out
        var width = $(window).width();
        page.animate({
            left: (reverse ? -width : width) + "px",
            right: (reverse ? width : -width) + "px"
        }, 350, function ()
        {
            page.removeClass("sh-visible");
            page.removeClass("sh-page-transitioning");
            page.css("left", 0)
                .css("right", 0);
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
            page.find("> header").css("left", 0)
                                 .css("right", 0);
        });
    }
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
    var dlg = sh.which(which);
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
        console.log(aZ + " vs " + bZ);
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


/*
$(function ()
{
    sh.push("main-page");
});
*/
