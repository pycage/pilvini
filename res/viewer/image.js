function viewImage(href)
{
    var popup = $("#image-popup");
    var img = popup.find("img");

    img.one("load", function ()
    {
        $.mobile.loading("hide");
        popup.popup("open", { positionTo: "window" });
    });

    $.mobile.loading("show", { text: "Loading", textVisible: true });
    img.attr("src", href);




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
