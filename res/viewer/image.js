function viewImage(href)
{
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
}
