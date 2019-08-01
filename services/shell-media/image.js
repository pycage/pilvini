"use strict";

const mods = [
    "shellfish/low",
    "shellfish/mid",
    "shellfish/high",
    "shell/files",
    "shell/mime-registry"
];

require(mods, function (low, mid, high, files, mimeReg)
{
    /* Loads the previous image.
     */
    function previousImage()
    {
        var img = popup.get().find("img");
        var src = img.data("src");
        var images = files.filesByMimetype("image/");
    
        var idx = images.indexOf(src);
        if (idx !== -1)
        {
            slideOut(1, function ()
            {
                if (idx > 0)
                {
                    loadImage(images[idx - 1]);
                }
                else
                {
                    loadImage(images[images.length - 1]);
                }
            });
        }
    }

    /* Loads the next image.
     */
    function nextImage()
    {
        var img = popup.get().find("img");
        var src = img.data("src");
        var images = files.filesByMimetype("image/");
    
        console.log("src: " + src);
        console.log(images);
        var idx = images.indexOf(src);
        if (idx !== -1)
        {
            slideOut(-1, function ()
            {
                if (idx < images.length - 1)
                {
                    loadImage(images[idx + 1]);
                }
                else
                {
                    loadImage(images[0]);
                }
            });
        }
    }

    /* Opens the image viewer popúp.
     */
    function openPopup()
    {
        popup = new mid.Popup();

        popup.get().find("> div").html(
            low.tag("div")
            .style("position", "relative")
            .style("text-align", "center")
            .content(
                low.tag("img")
                .style("max-width", "calc(100vw - 80px)")
                .style("max-height", "calc(100vh - 80px)")
            )
            .content(
                low.tag("span").class("image-countdown-indicator")
                .style("position", "absolute")
                .style("top", "0")
                .style("right", "1em")
                .style("color", "#fff")
            )
            .content(
                low.tag("span").class("image-busy-indicator sh-fw-icon")
                .style("position", "absolute")
                .style("width", "1em")
                .style("height", "1em")
                .style("top", "calc(50% - 0.5em)")
                .style("left", "calc(50% - 0.5em)")
                .style("font-size", "200%")
                .style("color", "#fff")
            )
            .content(
                low.tag("header")
                .style("top", "-80px")
                .style("visibility", "hidden")
                .content(
                    low.tag("h1")
                    .style("font-size", "1rem")
                    .style("position", "absolute")
                    .style("margin", "0")
                    .style("padding", "0")
                    .style("white-space", "nowrap")
                    .style("text-overflow", "ellipsis")
                    .style("overflow", "hidden")
                    .style("left", "0.25em")
                    .style("right", "0.25em")
                )
            )
            .content(
                low.tag("footer")
                .style("font-size", "200%")
                .style("margin", "0")
                .style("bottom", "-80px")
                .style("height", "80px")
                .style("min-height", "80px")
                .style("line-height", "80px")
                .style("visibility", "hidden")
                .on("click", "event.stopPropagation();")
                .content(
                    low.tag("div").class("image-progress-label")
                    .style("position", "absolute")
                    .style("top", "6px")
                    .style("left", "0")
                    .style("right", "0")
                    .style("text-align", "center")
                    .style("line-height", "1rem")
                    .style("font-size", "1rem")
                )
                .content(
                    low.tag("span").class("sh-left")
                    .content(
                        low.tag("span").class("sh-fw-icon sh-icon-skip_previous image-previous-button")
                        .style("padding-left", "0.5em")
                        .style("font-size", "80%")
                    )
                    .content(
                        low.tag("span").class("sh-fw-icon sh-icon-play_circle_outline image-play-button")
                        .style("padding-left", "0.25em")
                    )
                    .content(
                        low.tag("span").class("sh-fw-icon sh-icon-skip_next image-next-button")
                        .style("padding-left", "0.25em")
                        .style("font-size", "80%")
                    )
                )
                .content(
                    low.tag("span").class("sh-right sh-fw-icon sh-icon-fullscreen image-fullscreen-button")
                )
            )
            .html()
        );

        var img = popup.get().find("img");

        img.on("load", function ()
        {
            var img = popup.get().find("img");
            var src = img.data("src");
            var images = files.filesByMimetype("image/");
            var idx = images.indexOf(src);
            popup.get().find(".image-progress-label").html((idx + 1 ) + " / " + images.length);

            updateSizeConstraints();

            var div = popup.get().find("> div");
            div.animate({
                width: (img.width() + 2) + "px",
                height: (img.height() + 2) + "px"
            }, 350, function ()
            {
                slideIn(function ()
                {
                    if (playing)
                    {
                        runSlideshow();
                    }
                });
            });
        });

        popup.get().on("keydown", function (ev)
        {  
            console.log("key pressed: " + ev.which);
            switch (ev.which)
            {
            case 37:
                previousImage();
                break;
    
            case 39:
                nextImage();
                break;
            }
            ev.preventDefault();
        });
    
        img.on("touchstart", function (ev)
        {
            this.swipeContext = {
                beginX: ev.originalEvent.touches[0].screenX,
                dx: 0
            };
        });
    
        img.on("touchmove", function (ev)
        {
            var dx = ev.originalEvent.touches[0].screenX - this.swipeContext.beginX;
        
            var value = Math.min(1.0, Math.abs(dx) / ($(window).width() / 3));
    
            $(this).css("margin-left", dx)
                   .css("opacity", 1.0 - value);
    
            this.swipeContext.dx = dx;
    
            ev.preventDefault();
        });
    
        img.on("touchend", function (ev)
        {
            var dx = this.swipeContext.dx;
            if (dx < - $(window).width() / 3)
            {
                nextImage();
            }
            else if (dx > $(window).width() / 3)
            {
                previousImage();
            }
            else
            {
                $(this).css("margin-left", 0)
                       .css("opacity", 1); 
            }
        });

        popup.get().find("> div > div").on("click", function (event)
        {
            event.stopPropagation();

            var header = popup.get().find("> div > div > header");
            if (header.css("visibility") === "visible")
            {
                header.animate({
                    top: "-80px"
                }, 350, function ()
                {
                    header.css("visibility", "hidden");
                });
            }
            else
            {
                header
                .css("visibility", "visible")
                .animate({
                    top: "0px"
                }, 350, function ()
                {
        
                });
            }

            var footer = popup.get().find("> div > div > footer");
            if (footer.css("visibility") === "visible")
            {
                footer.animate({
                    bottom: "-80px"
                }, 350, function ()
                {
                    footer.css("visibility", "hidden");
                });
            }
            else
            {
                footer
                .css("visibility", "visible")
                .animate({
                    bottom: "0px"
                }, 350, function ()
                {
        
                });
            }
        });

        popup.get().find("> div > div").on("dblclick", function (event)
        {
            event.stopPropagation();
            toggleFullscreen();
        });

        popup.get().find(".image-previous-button").on("click", previousImage);
        popup.get().find(".image-next-button").on("click", nextImage);
        popup.get().find(".image-play-button").on("click", toggleSlideshow);
        popup.get().find(".image-fullscreen-button").on("click", toggleFullscreen);

        popup.get().on("sh-closed", function ()
        {
            popup = null;
            playing = false;
        });

        popup.show();
    }

    /* Loads the given image.
     */
    function loadImage(href)
    {
        if (! popup)
        {
            openPopup();
        }

        popup.get().find(".image-busy-indicator").addClass("sh-icon-busy-indicator");
        var img = popup.get().find("img");
        img
        .css("min-width", "0")
        .css("min-height", "0");
        img.data("src", href);

        var settings = {
            beforeSend: function (xhr)
            {
                 xhr.overrideMimeType("text/plain; charset=x-user-defined");
            }
        };
    
        $.ajax(href, settings)
        .done(function (data, status, xhr)
        {
            var contentType = "image/jpeg"; //xhr.getResponseHeader("Content-Type");
            if (href.toLowerCase().endsWith(".svg"))
            {
                contentType = "image/svg+xml";
            }
    
            var buffer = "";
            for (var i = 0; i < data.length; ++i)
            {
                buffer += String.fromCharCode(data.charCodeAt(i) & 0xff);
            }
            var pic = "data:" + contentType + ";base64," + btoa(buffer);
    
            img.attr("src", pic);
        })
        .always(function ()
        {
            popup.get().find(".image-busy-indicator").removeClass("sh-icon-busy-indicator");
        });
    
    
        var idx = href.lastIndexOf("/");
        var name;
        if (idx !== -1)
        {
            name = href.substr(idx + 1);
        }
        else
        {
            name = href;
        }
        popup.get().find("h1").html(decodeURIComponent(name));
    }

    /* Slides out the image into the given direction.
     */
    function slideOut(direction, callback)
    {
        var img = popup.get().find("img");
        img.animate({
            marginLeft: direction * img.width() / 2,
            opacity: 0
        }, 350, callback);
    }

    /* Slides the image into view.
     */
    function slideIn(callback)
    {
        var img = popup.get().find("img");
        var marginLeft = img.css("margin-left").replace(/px/, "");
        if (marginLeft < 0)
        {
            img.css("margin-left", (img.width() / 2) + "px");
        }
        else if (marginLeft > 0)
        {
            img.css("margin-left", (-img.width() / 2) + "px");
        }
        else
        {
            callback();
            return;
        }

        img.animate({
            marginLeft: 0,
            opacity: 1
        }, 350, callback);
    }

    /* Updates the status of the play button.
     */
    function updatePlaybutton()
    {
        var playButton = popup.get().find(".image-play-button");
        if (playing)
        {
            playButton.removeClass("sh-icon-play_circle_outline").addClass("sh-icon-pause_circle_outline");
        }
        else
        {
            playButton.removeClass("sh-icon-pause_circle_outline").addClass("sh-icon-play_circle_outline");
        }
    }

    /* Updates the slideshow countdown.
     */
    function updateCountdown()
    {
        var out = "";
        if (playing)
        {
            for (var i = 0; i < slideshowCountdown; ++i)
            {
                out += ".";
            }
        }
        popup.get().find(".image-countdown-indicator").html(out);
    }

    /* Toggle slideshow mode.
     */
    function toggleSlideshow()
    {
        if (! playing)
        {
            var dlg = high.element(mid.Dialog).title("Slideshow")
            .add(
                high.element(mid.Label).text("Interval between images:")
            )
            .add(
                high.element(mid.Labeled).text("Seconds")
                .add(
                    high.element(mid.TextInput).id("input").text("" + slideshowInterval)
                )
            )
            .button(
                high.element(mid.Button).text("Start").isDefault(true)
                .action(function ()
                {
                    dlg.close_();
                    slideshowInterval = Number.parseInt(dlg.find("input").get().text) || 5;
                    slideshowCountdown = 0;
                    runSlideshow();
                })
            );

            dlg.show_();
        }
        else
        {
            stopSlideshow();
        }
        updateCountdown();
    }

    /* Runs a slideshow iteration.
     */
    function runSlideshow()
    {
        playing = true;
        updatePlaybutton();

        function trigger()
        {            
            if (popup && playing)
            {
                --slideshowCountdown;
                updateCountdown();

                if (slideshowCountdown === 0)
                {
                    nextImage();
                }
                else
                {
                    setTimeout(trigger, 1000);
                }
            }
        }

        if (slideshowCountdown === 0)
        {
            slideshowCountdown = slideshowInterval;
            updateCountdown();
            setTimeout(trigger, 1000);
        }
    }

    /* Stops the slideshow.
     */
    function stopSlideshow()
    {
        playing = false;
        updatePlaybutton();
    }

    /* Toggles fullscreen mode.
     */
    function toggleFullscreen()
    {
        var fullscreenButton = popup.get().find(".image-fullscreen-button");
        if (low.fullscreenStatus())
        {
            low.fullscreenExit();
            fullscreenButton.removeClass("sh-icon-fullscreen_exit").addClass("sh-icon-fullscreen");
            popup.get().find("img")
            .css("max-width", "calc(100vw - 80px)")
            .css("max-height", "calc(100vh - 80px)");
        }
        else
        {
            low.fullscreenEnter(popup.get().find("> div > div"));
            fullscreenButton.removeClass("sh-icon-fullscreen").addClass("sh-icon-fullscreen_exit");
            popup.get().find("img")
            .css("max-width", "100vw")
            .css("max-height", "100vh");
        }
    }

    /* Updates the image size constraints.
     */
    function updateSizeConstraints()
    {
        var img = popup.get().find("img");
        var w = img.width();
        var h = img.height();
        var ratio = w / h;

        var margin = low.fullscreenStatus() ? 0 : 80;
        var viewWidth = $(window).width() - margin;
        var viewHeight = $(window).height() - margin;

        var w2 = viewHeight * ratio;
        var h2 = viewHeight;
        if (w2 > viewWidth)
        {
            w2 = viewWidth;
            h2 = viewWidth / ratio;
        }

        img
        .css("min-width", w2 + "px")
        .css("min-height", h2 + "px");
        
        if (h2 < viewHeight && low.fullscreenStatus())
        {
            img.css("transform", "translateY(" + ((viewHeight - h2) / 2)  + "px)");
        }
        else
        {
            img.css("transform", "initial");
        }
    }

    var popup = null;
    var playing = false;
    var slideshowInterval = 30;
    var slideshowCountdown = 0;

    $(window).resize(function ()
    {
        if (popup)
        {
            updateSizeConstraints();
            var div = popup.get().find("> div");
            var img = popup.get().find("img");
            div
            .css("width", img.width() + 2 + "px")
            .css("height", img.height() + 2 + "px");
        }
    });

    mimeReg.mimeRegistry.register("image/gif", loadImage);
    mimeReg.mimeRegistry.register("image/jpeg", loadImage);
    mimeReg.mimeRegistry.register("image/png", loadImage);
    mimeReg.mimeRegistry.register("image/svg+xml", loadImage);
});
