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
            if (idx > 0)
            {
                loadImage(images[idx - 1]);
            }
            else
            {
                loadImage(images[images.length - 1]);
            }
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
            if (idx < images.length - 1)
            {
                loadImage(images[idx + 1]);
            }
            else
            {
                loadImage(images[0]);
            }
        }
    }

    /* Opens the image viewer popúp.
     */
    function openPopup()
    {
        popup = ui.showPreviewPopup();
        var w = popup.width() - 32;
        var h = popup.height() - 32;

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
                tag("footer")
                .style("background-color", "rgba(1, 1, 1, 0.6)")
                .style("color", "#fff")
                .style("font-size", "200%")
                .style("position", "absolute")
                .style("margin", "0")
                .style("left", "0")
                .style("right", "0")
                .style("bottom", "-80px")
                .style("min-height", "80px")
                .style("line-height", "80px")
                .style("visibility", "hidden")
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

        /*
        popup.find("> div")
        .css("max-width", "calc(100vw - 80px)")
        .css("max-height", "calc(100vh - 80px)");
        */

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
                img.css("visibility", "inherit");
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
    
            popup.find("h1").css("display", "none");
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
    
            $(this).css("margin-left", 0)
                   .css("opacity", 1);
            popup.find("h1").css("display", "block");
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

        var busyIndicator = ui.showBusyIndicator("Loading");
        var img = popup.find("img");
        img
        .css("visibility", "hidden")
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
            busyIndicator.remove();
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
            popup.find("> div")
            .css("width", "auto")
            .css("height", "auto");
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

        console.log("ratio: " + ratio);

        var viewWidth = $(window).width() - 80;
        var viewHeight = $(window).height() - 80;

        var w2 = Math.min(ratio * viewHeight, viewWidth);
        var h2 = Math.min(viewHeight / ratio, viewHeight);        

        console.log("w2 " + w2 + ", h2 " + h2);
    }

    var popup = null;
    var playing = false;

    $(window).resize(function ()
    {
        if (popup)
        {
            updateSizeConstraints();
        }
    })

    mimeRegistry.register("image/gif", loadImage);
    mimeRegistry.register("image/jpeg", loadImage);
    mimeRegistry.register("image/png", loadImage);
    mimeRegistry.register("image/svg+xml", loadImage);
})();
