"use strict";

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
            toggleButton.setIcon("sh-icon-checked");
            viewBox.css("display", "none");
            editBox.css("display", "block");
            edited = true;
        }
        else
        {
            var data = editBox.val();
            
            toggleButton.setIcon("sh-icon-edit");
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
        var busyIndicator = sh.element(sh.BusyPopup).text("Saving");
        busyIndicator.show_();

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
            ui.showError("Failed to upload.");
        })
        .always(function ()
        {
            busyIndicator.hide_();
        });
    }

    var edited = false;

    var parts = href.split("/");
    var name = decodeURI(parts[parts.length - 1]);

    var page = new sh.Page(name, "");
    page.setSwipeBack(function () { page.pop(); });
    page.addToHeaderLeft(new sh.IconButton("sh-icon-back", function () { page.pop(); }));
    var originalContent = "";

    var toggleButton = new sh.IconButton("sh-icon-edit", toggleMode);
    page.addToHeaderRight(toggleButton);

    page.get().find("> section").html("<script src='/::res/webshell/extensions/markdown/showdown.js'></script>");

    page.get().find("> section").append("<div class='sh-html'>");
    var viewBox = page.get().find("> section div");
    viewBox.css("padding", "0.5em");

    page.get().find("> section").append("<textarea>");
    var editBox = page.get().find("> section textarea");
    editBox.css("display", "none")
           .css("width", "100%")
           .css("padding", "1em")
           .css("height", "calc(100vh - 3rem)");

    page.get().one("sh-closed", function ()
    {
        var data = editBox.val();
        if (edited && data !== originalContent)
        {
            upload(href, data, function () { });
        }
    });

    page.push();

    var busyIndicator = sh.element(sh.BusyPopup).text("Loading");
    busyIndicator.show_();

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
        ui.showError("Failed to load: " + message);
    })
    .complete(function ()
    {
        busyIndicator.hide_();
    });
}

(function ()
{
    mimeRegistry.register("text/x-markdown", viewMarkdown);
})();
