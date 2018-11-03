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
        var src = img.attr("src");
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
        var src = img.attr("src");
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
        sh.popup_close("busy-popup");
        
        console.log("has class: " + popup.is(".sh-visible"));
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
    $("#image-popup").on("sh-closed", function ()
    {
        $(this).off("keydown");
    });

    sh.popup("busy-popup");
    img.css("visibility", "hidden");
    img.attr("src", href);

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
