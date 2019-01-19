function viewMarkdown(href)
{
    function setMarkdown(md)
    {
        var converter = new Showdown.converter();
        viewBox.html(converter.makeHtml(md));
    }

    function toggleMode()
    {
        if (editBox.css("display") === "none")
        {
            toggleButton.removeClass("sh-icon-edit").addClass("sh-icon-checked");
            viewBox.css("display", "none");
            editBox.css("display", "block");
            edited = true;
        }
        else
        {
            var data = editBox.val();
            
            toggleButton.removeClass("sh-icon-checked").addClass("sh-icon-edit");
            viewBox.css("display", "block");
            editBox.css("display", "none");
            setMarkdown(data);

            if (data !== originalContent)
            {
                upload(href, data, function ()
                {
                    originalContent = data;
                });
            }
        }
    }

    function upload(href, md, successCb)
    {
        $.ajax({
            url: href,
            type: "PUT",
            contentType: "text/x-markdown",
            processData: false,
            data: md
        })
        .done(function ()
        {
            successCb();
        })
        .fail(function ()
        {
            showError("Failed to upload.");
        })
        .always(function ()
        {
        });
    }

    var edited = false;

    var parts = href.split("/");
    var name = decodeURI(parts[parts.length - 1]);

    var page = showPage(name);
    var originalContent = "";

    sh.onSwipeBack(page, function () { page.pop(); });

    var toggleButton = page.addIconButton("sh-icon-edit", toggleMode);

    page.find("section").html("<script src='/::res/viewer/markdown/showdown.js'></script>");

    page.find("section").append("<div class='sh-html'>");
    var viewBox = page.find("section div");
    viewBox.css("padding", "0.5em");

    page.find("section").append("<textarea>");
    var editBox = page.find("section textarea");
    editBox.css("display", "none")
           .css("width", "100%")
           .css("padding", "1em")
           .css("height", ($(window).height() * 0.8) + "px");

    sh.push(page);
    page.one("sh-closed", function ()
    {
        var data = editBox.val();
        if (edited && data !== originalContent)
        {
            upload(href, data, function () { });
        }
    });


    var busyIndicator = showBusyIndicator();

    $.ajax(href, {
        beforeSend: function (xhr) {xhr.overrideMimeType("text/x-markdown"); }
    })
    .success(function (data, status, xhr)
    {
        originalContent = data;
        setMarkdown(data);
        editBox.val(data);
    })
    .fail(function (xhr, status, err)
    {
        var message = status;
        if (xhr.status === 0)
        {
            // no response from server
            message = "Connection failed.";
        }
        showError("Failed to load: " + message);
    })
    .complete(function ()
    {
        busyIndicator.remove();
    });
}

$(document).ready(function ()
{
    mimeRegistry.register("text/x-markdown", viewMarkdown);
});
