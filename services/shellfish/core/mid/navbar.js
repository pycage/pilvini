"use strict";

require([__dirname + "/../low.js", __dirname + "/tools.js"], function (low, tools)
{

    exports.NavBar = function ()
    {
        tools.defineProperties(this, {
            height: { set: setHeight, get: height },
            labels: { set: setLabels, get: labels },
            onPressed: { set: setOnPressed, get: onPressed },
            onReleased: { set: setOnReleased, get: onReleased },
            onMoved: { set: setOnMoved, get: onMoved }
        });
    
        var that = this;
        var m_height = 0;
        var m_labels = [];
        var m_onPressed = null;
        var m_onReleased = null;
        var m_onMoved = null;

        var m_navBar = $(
            low.tag("div")
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
            if (m_onPressed)
            {
                var percents = (event.clientY - $(this).offset().top) /
                               ($(window).height() - $(this).offset().top);
                m_onPressed(percents);
            }
        });
    
        m_navBar.on("mouseup", function (event)
        {
            this.pressed = false;
            if (m_onReleased)
            {
                m_onReleased();
            }
        });
    
        m_navBar.on("mouseleave", function (event)
        {
            this.pressed = false;
            if (m_onReleased)
            {
                m_onReleased();
            }
        });
    
        m_navBar.on("mousemove", function (event)
        {
            if (this.pressed)
            {
                if (m_onMoved)
                {
                    var percents = (event.clientY - $(this).offset().top) /
                                   ($(window).height() - $(this).offset().top);
                    m_onMoved(percents);
                }
            }
        });
    
        // quite an effort to work around quirks in certain touch browsers
    
        m_navBar.on("touchstart", function (event)
        {
            /*
            var scrollBegin = $(document).scrollTop();
            m_page.get().addClass("sh-page-transitioning");
            m_page.get().find("> section").scrollTop(scrollBegin);
            this.touchContext = {
                top: $(this).offset().top,
                scrollBegin: scrollBegin,
                scrollTarget: 0
            };
            */

            if (m_onPressed)
            {
                var percents = (event.originalEvent.touches[0].clientY - $(this).offset().top) /
                               ($(window).height() - $(this).offset().top);
                percents = Math.max(0, Math.min(1, percents));
                m_onPressed(percents);
             }
        });
    
        m_navBar.on("touchend", function (event)
        {
            /*
            m_page.get().find("> section").css("margin-top", 0);
            m_page.get().removeClass("sh-page-transitioning");
            if (this.touchContext.scrollTarget > 0)
            {
                $(document).scrollTop(this.touchContext.scrollTarget);
            }    
            m_navBar.css("margin-top", "0");
            */
           if (m_onReleased)
           {
               m_onReleased();
           }
        });
    
        m_navBar.on("touchmove", function (event)
        {
            event.preventDefault();
            
            /*
            var percents = (event.originalEvent.touches[0].clientY - this.touchContext.top) /
                        ($(window).height() - this.touchContext.top);
            percents = Math.max(0, Math.min(1, percents));
    
            var scrollTop = (m_navBar.height() + m_page.header.get().height() - $(window).height()) * percents;
    
            m_page.get().find("> section").css("margin-top", (-scrollTop) + "px");
            m_navBar.css("margin-top", (-scrollTop) + "px");
            this.touchContext.scrollTarget = scrollTop;
            */
           
            if (m_onMoved)
            {
                var percents = (event.originalEvent.touches[0].clientY - $(this).offset().top) /
                               ($(window).height() - $(this).offset().top);
                percents = Math.max(0, Math.min(1, percents));
                m_onMoved(percents);
            }
        });

        function setHeight(h)
        {
            m_height = h;
            that.update();
        }

        function height()
        {
            return m_height;
        }

        function setLabels(l)
        {
            m_labels = l;
            that.update();
        }

        function labels()
        {
            return m_labels;
        }

        function setOnPressed(cb)
        {
            m_onPressed = cb;
        }

        function onPressed()
        {
            return m_onPressed;
        }

        function setOnReleased(cb)
        {
            m_onReleased = cb;
        }

        function onReleased()
        {
            return m_onReleased;
        }

        function setOnMoved(cb)
        {
            m_onMoved = cb;
        }

        function onMoved()
        {
            return m_onMoved;
        }
        
        this.get = function ()
        {
            return m_navBar;
        };
    
        this.update = function ()
        {
            m_navBar.html("");
            m_navBar.height(0);
    
            var currentLetter = "";
            var previousOffset = -1;
    
            m_labels.forEach(function (item)
            {
                var letter = item[0];
                var offset = item[1];

                if (letter !== currentLetter && offset !== previousOffset)
                {
                    m_navBar.append(
                        low.tag("span")
                        .style("position", "absolute")
                        .style("top", offset + "px")
                        .style("left", "0")
                        .style("right", "0")
                        .content(letter)
                        .html()
                    )
                    currentLetter = letter;
                    previousOffset = offset;
                }
            });
    
            m_navBar.height(m_height);
        };
    };

});