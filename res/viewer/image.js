function viewImage(href)
{
    function getImageFiles()
    {
        var items = $("#filesbox .filelink");
        var images = [];
    
        for (var i = 0; i < items.length; ++i)
        {
            var item = items[i];
            var mimeType = $(item).data("mimetype");
            var url = $(item).data("url");
            console.log("mimetype: " + mimeType + ", url: " + url);
            if (mimeType.indexOf("image/") === 0)
            {
                images.push(url);
            }
        }
    
        return images;
    }
    
    function previousImage()
    {
        var img = $("#image-popup img");
        var src = img.data("src");
        var images = getImageFiles();
    
        var idx = images.indexOf(src);
        if (idx !== -1)
        {
            if (idx > 0)
            {
                viewImage(images[idx - 1]);
            }
            else
            {
                viewImage(images[images.length - 1]);
            }
        }
    }
    
    function nextImage()
    {
        var img = $("#image-popup img");
        var src = img.data("src");
        var images = getImageFiles();
    
        console.log("src: " + src);
        console.log(images);
        var idx = images.indexOf(src);
        if (idx !== -1)
        {
            if (idx < images.length - 1)
            {
                viewImage(images[idx + 1]);
            }
            else
            {
                viewImage(images[0]);
            }
        }
    }
    

    var popup = $("#image-popup");
    var img = popup.find("img");

    var w = popup.width() - 32;
    var h = popup.height() - 32;

    img.css("maxWidth", w + "px");
    img.css("maxHeight", h + "px");

    img.off("load").one("load", function ()
    {       
        if (popup.is(".sh-visible"))
        {
            img.parent().animate({
                width: (img.width() + 2) + "px",
                height: (img.height() + 2) + "px"
            }, 350, function ()
            {
                img.css("visibility", "inherit");
            });
        }
        else
        {
            img.parent().width(img.width());
            img.parent().height(img.height());
            img.css("visibility", "inherit");
            sh.popup("image-popup");
            $("#image-popup").attr("tabindex", -1).focus();
        }
    });


    /*
    $("#image-popup-previous").off("click").one("click", previousImage);
    $("#image-popup-next").off("click").one("click", nextImage);
    */
    $("#image-popup").off("keydown").on("keydown", function (ev)
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

    img.off("touchstart").on("touchstart", function (ev)
    {
        this.swipeContext = {
            beginX: ev.originalEvent.touches[0].screenX,
            dx: 0
        };

        $("#image-popup h1").css("display", "none");
    });

    img.off("touchmove").on("touchmove", function (ev)
    {
        var dx = ev.originalEvent.touches[0].screenX - this.swipeContext.beginX;
    
        var value = Math.min(1.0, Math.abs(dx) / ($(window).width() / 3));

        $(this).css("margin-left", dx)
               .css("opacity", 1.0 - value);

        this.swipeContext.dx = dx;

        ev.preventDefault();
    });

    img.off("touchend").on("touchend", function (ev)
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
        $("#image-popup h1").css("display", "block");
    });


    $("#image-popup").off("sh-closed").on("sh-closed", function ()
    {
        $(this).off("keydown");
    });

    sh.popup("busy-popup");
    img.css("visibility", "hidden");
    img.data("src", href);


    var settings = {
        beforeSend: function (xhr)
        {
             xhr.overrideMimeType("text/plain; charset=x-user-defined");
             xhr.setRequestHeader("x-pilvini-width", w);
             xhr.setRequestHeader("x-pilvini-height", h);
        }
    };

    $.ajax("/::thumbnail" + href, settings)
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
        sh.popup_close("busy-popup");
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
