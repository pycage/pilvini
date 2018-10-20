function viewImage(href)
{
    function getImageFiles()
    {
        var items = $("a.filelink");
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
        var src = decodeURIComponent(img.attr("src"));
        var images = getImageFiles();
    
        console.log("src: " + src);
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
        var src = decodeURIComponent(img.attr("src"));
        var images = getImageFiles();
    
        console.log("src: " + src);
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

    img.off("load").one("load", function ()
    {
        $.mobile.loading("hide");
        popup.popup("open", { positionTo: "window" });
        $("#image-popup").popup("reposition", {positionTo: 'window'});
        $("#image-popup").attr("tabindex", -1).focus();
    });
    $("#image-popup-previous").off("click").one("click", previousImage);
    $("#image-popup-next").off("click").one("click", nextImage);
    $("#image-popup").off("keydown").on("keydown", function (ev)
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

    $.mobile.loading("show", { text: "Loading", textVisible: true });
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
    popup.find("h1").html(name);


    /*
    var page = $("#viewer-page");
    page.find(".ui-content").html("<img style='width: 100%'/>");
    page.find(".ui-content img").attr("src", href);

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
    page.find("h1").html(name);

    $.mobile.navigate("#viewer-page");
    */
}
