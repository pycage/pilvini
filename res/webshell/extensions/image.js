"use strict";

(function ()
{
    /* Finds all image files in the current directory.
     */
    function getImageFiles()
    {
        var items = $("#filesbox .filelink");
        var images = [];
    
        for (var i = 0; i < items.length; ++i)
        {
            var item = items[i];
            var mimeType = $(item).data("mimetype");
            var url = $(item).data("url");
            if (mimeType.indexOf("image/") === 0)
            {
                images.push(url);
            }
        }
    
        return images;
    }

    /* Loads the previous image.
     */
    function previousImage()
    {
        var img = popup.find("img");
        var src = img.data("src");
        var images = getImageFiles();
    
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
        var img = popup.find("img");
        var src = img.data("src");
        var images = getImageFiles();
    
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
        popup = ui.showPreviewPopup();

        popup.find("> div").html(
            tag("div")
            .style("position", "relative")
            .style("text-align", "center")
            .content(
                tag("img")
                .style("max-width", "calc(100vw - 80px)")
                .style("max-height", "calc(100vh - 80px)")
            )
            .content(
                tag("span").class("image-busy-indicator sh-fw-icon")
                .style("position", "absolute")
                .style("width", "1em")
                .style("height", "1em")
                .style("top", "calc(50% - 0.5em)")
                .style("left", "calc(50% - 0.5em)")
                .style("font-size", "200%")
                .style("color", "#fff")
            )
            .content(
                tag("footer")
                .style("background-color", "rgba(1, 1, 1, 0.6)")
                .style("color", "#fff")
                .style("font-size", "200%")
                .style("position", "absolute")
                .style("margin", "0")
                .style("left", "0")
                .style("right", "0")
                .style("bottom", "0")
                .style("min-height", "80px")
                .style("line-height", "80px")
                .style("visibility", "visible")
                .on("click", "event.stopPropagation();")
                .content(
                    tag("div").class("image-progress-label")
                    .style("position", "absolute")
                    .style("top", "6px")
                    .style("left", "0")
                    .style("right", "0")
                    .style("text-align", "center")
                    .style("line-height", "1rem")
                    .style("font-size", "1rem")
                )
                .content(
                    tag("span").class("sh-left")
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-media-previous image-previous-button")
                        .style("padding-left", "0.5em")
                        .style("font-size", "80%")
                    )
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-media-play-circle image-play-button")
                        .style("padding-left", "0.25em")
                    )
                    .content(
                        tag("span").class("sh-fw-icon sh-icon-media-next image-next-button")
                        .style("padding-left", "0.25em")
                        .style("font-size", "80%")
                    )
                )
                .content(
                    tag("h1")
                    .style("font-size", "1rem")
                    .style("position", "absolute")
                    .style("margin", "0")
                    .style("padding", "0")
                    .style("padding-top", "1em")
                    .style("margin-left", "8em")
                    .style("margin-right", "8em")
                    .style("white-space", "nowrap")
                    .style("text-overflow", "ellipsis")
                    .style("overflow", "hidden")
                    .style("left", "0.25em")
                    .style("right", "0.25em")
                    .style("color", "#fff")
                )
                .content(
                    tag("span").class("sh-right sh-fw-icon sh-icon-fullscreen image-fullscreen-button")
                )
            )
            .html()
        );

        var img = popup.find("img");

        img.on("load", function ()
        {
            var img = popup.find("img");
            var src = img.data("src");
            var images = getImageFiles();
            var idx = images.indexOf(src);
            popup.find(".image-progress-label").html((idx + 1 ) + " / " + images.length);

            updateSizeConstraints();

            var div = popup.find("> div");
            div.animate({
                width: (img.width() + 2) + "px",
                height: (img.height() + 2) + "px"
            }, 350, function ()
            {
                slideIn(function () { });
            });    
        });

        popup.attr("tabindex", -1).focus();
        popup.on("keydown", function (ev)
        {
            if (! $(this).hasClass("sh-visible"))
            {
                return;
            }
    
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

        popup.find("> div > div").on("click", function (event)
        {
            event.stopPropagation();

            var footer = popup.find("footer");
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

        popup.find("> div > div").on("dblclick", function (event)
        {
            event.stopPropagation();
            toggleFullscreen();
        });

        popup.find(".image-previous-button").on("click", previousImage);
        popup.find(".image-next-button").on("click", nextImage);
        popup.find(".image-play-button").on("click", toggleSlideshow);
        popup.find(".image-fullscreen-button").on("click", toggleFullscreen);

        popup.on("sh-closed", function ()
        {
            popup = null;
            playing = false;
        });
    }

    /* Loads the given image.
     */
    function loadImage(href)
    {
        if (! popup)
        {
            openPopup();
        }

        popup.find(".image-busy-indicator").addClass("sh-busy-indicator");
        var img = popup.find("img");
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
            popup.find(".image-busy-indicator").removeClass("sh-busy-indicator");
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
        popup.find("h1").html(decodeURIComponent(name));
    }

    /* Slides out the image into the given direction.
     */
    function slideOut(direction, callback)
    {
        var img = popup.find("img");
        img.animate({
            marginLeft: direction * img.width() / 2,
            opacity: 0
        }, 350, callback);
    }

    /* Slides the image into view.
     */
    function slideIn(callback)
    {
        var img = popup.find("img");
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
        var playButton = popup.find(".image-play-button");
        if (playing)
        {
            playButton.removeClass("sh-icon-media-play-circle").addClass("sh-icon-media-pause-circle");
        }
        else
        {
            playButton.removeClass("sh-icon-media-pause-circle").addClass("sh-icon-media-play-circle");
        }
    }

    /* Toggle slideshow mode.
     */
    function toggleSlideshow()
    {
        if (! playing)
        {
            startSlideshow();
        }
        else
        {
            stopSlideshow();
        }
    }

    /* Starts the slideshow.
     */
    function startSlideshow()
    {
        playing = true;
        updatePlaybutton();

        function trigger()
        {
            if (popup && playing)
            {
                nextImage();
                setTimeout(trigger, 5000);
            }
        }

        setTimeout(trigger, 5000);
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
        var fullscreenButton = popup.find(".image-fullscreen-button");
        if (sh.isFullscreen())
        {
            sh.exitFullscreen();
            fullscreenButton.removeClass("sh-icon-unfullscreen").addClass("sh-icon-fullscreen");
            popup.find("img")
            .css("max-width", "calc(100vw - 80px)")
            .css("max-height", "calc(100vh - 80px)");
        }
        else
        {
            sh.requestFullscreen(popup.find("> div > div"));
            fullscreenButton.removeClass("sh-icon-fullscreen").addClass("sh-icon-unfullscreen");
            popup.find("img")
            .css("max-width", "100vw")
            .css("max-height", "100vh");
        }
    }

    /* Updates the image size constraints.
     */
    function updateSizeConstraints()
    {
        var img = popup.find("img");
        var w = img.width();
        var h = img.height();
        var ratio = w / h;

        var margin = sh.isFullscreen() ? 0 : 80;
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
        
        if (h2 < viewHeight && sh.isFullscreen())
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

    $(window).resize(function ()
    {
        if (popup)
        {
            updateSizeConstraints();
            var div = popup.find("> div");
            var img = popup.find("img");
            div
            .css("width", img.width() + 2 + "px")
            .css("height", img.height() + 2 + "px");
        }
    })

    mimeRegistry.register("image/gif", loadImage);
    mimeRegistry.register("image/jpeg", loadImage);
    mimeRegistry.register("image/png", loadImage);
    mimeRegistry.register("image/svg+xml", loadImage);
})();
