"use strict";

require([__dirname + "/../low.js", __dirname + "/document.js", __dirname + "/tools.js"], function (low, doc, tools)
{
    /* Sets up a swipe-back touch gesture on the given page.
     * Invokes the given callback on swiping back.
     * Provide a null callback to disable swipe-back.
     */
    function setOnSwipe(page, callback)
    {
        page
        .off("touchstart")
        .off("touchmove")
        .off("touchend");

        if (! callback)
        {
            return;
        }

        page.on("touchstart", function (ev)
        {
            var backIndicator = $(
                low.tag("div")
                .style("position", "fixed")
                .style("top", "0")
                .style("bottom", "0")
                .style("left", "8px")
                .style("font-size", "10vh")
                .content(
                    low.tag("span").class("sh-fw-icon sh-icon-arrow_back")
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
                        low.pageFreeze(page, scrollTop);

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
                page.css("left", "0").css("right", "0")
            }

            function resetHeader()
            {
                page.find("> header").css("left", "0").css("right", "0")
            }

            function finish()
            {
                low.pageUnfreeze(page);
                
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
   
    /* Element representing a page on the UI page stack.
     */
    exports.Page = function Page()
    {
        tools.defineProperties(this, {
            header: { set: setHeader, get: header },
            footer: { set: setFooter, get: footer },
            left: { set: setLeft, get: left },
            right: { set: setRight, get: right },
            script: { set: setScript, get: script },
            onSwipeBack: { set: setOnSwipeBack, get: onSwipeBack },
            onClosed: { set: setOnClosed, get: onClosed },
            width: { get: width },
            height: { get: height },
            active: { get: active }
        });

        var that = this;
        var m_header = null;
        var m_footer = null;
        var m_left = null;
        var m_right = null;
        var m_onSwipeBack = null;
        var m_onClosed = null;
        var m_width = 0;
        var m_height = 0;
        var m_isActive = false;

        var m_document = new doc.Document();
        m_document.onWindowWidthChanged = function ()
        {
            that.updateGeometry();
        };
        m_document.onWindowHeightChanged = function ()
        {
            that.updateGeometry();
        };

        var m_page = $(
            low.tag("div").class("sh-page sh-hidden")
            .content(
                low.tag("section")
                .style("position", "relative")
            )
            .html()
        );

        m_page
        .on("visible", function ()
        {
            console.log("page became active");
            m_isActive = true;
            that.activeChanged();
            that.updateGeometry();
        })
        .on("hidden", function ()
        {
            m_isActive = false;
            that.activeChanged();
        });

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

        function setRight(right)
        {
            if (m_right)
            {
                m_right.get().detach();
            }
            m_page.append(right.get());
            m_right = right;
            that.updateGeometry();
        }

        function right()
        {
            return m_right;
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
            setOnSwipe(m_page, callback);
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

        function width()
        {
            return m_width;
        }

        function height()
        {
            return m_height;
        }

        function active()
        {
            return m_isActive;
        }

        this.discard = function ()
        {
            m_document.discard();
        };

        this.get = function ()
        {
            return m_page;
        };

        this.add = function (child)
        {
            m_page.find("> section").append(child.get());
            that.updateGeometry();
        };

        this.clear = function ()
        {
            m_page.find("> section").html("");
            that.updateGeometry();
        }

        /* Pushes this page onto the page stack.
         */
        this.push = function (callback)
        {
            function cb()
            {
                that.updateGeometry();
                if (callback)
                {
                    callback();
                }
            }

            $("body").append(m_page);
            that.updateGeometry();
            low.pagePush(m_page, cb, $(".sh-page").length === 1);

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
            if (! m_isActive)
            {
                return;
            }

            var headerHeight = m_header ? m_header.get().height() : 0;
            m_page.find("> section").css("padding-top", headerHeight + "px");
            m_page.find("> section").css("padding-bottom", (!! m_footer ? m_footer.get().height() : 0) + "px");
            m_page.find("> section").css("padding-left", (!! m_left ? m_left.get().width() : 0) + "px");
            m_page.find("> section").css("padding-right", (!! m_right ? m_right.get().width() : 0) + "px");
            
            if (m_left)
            {
                m_left.get().css("margin-top", headerHeight + "px");
            }
            if (m_right)
            {
                //m_right.get().css("margin-top", headerHeight + "px");
            }

            var newWidth = m_page.find("> section").width();
            var newHeight = Math.max(m_page.find("> section").height(),
                                     m_document.windowHeight - headerHeight);
            
            if (newWidth !== m_width)
            {
                m_width = newWidth;
                that.widthChanged();
            }
            
            if (newHeight !== m_height)
            {
                m_height = newHeight;
                that.heightChanged();
            }
        }
    };

});
