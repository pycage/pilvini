"use strict";

function viewText(href)
{
    function setText(text)
    {
        viewBox.html(text);
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
            toggleButton.removeClass("sh-icon-checked").addClass("sh-icon-edit");
            viewBox.css("display", "block");
            editBox.css("display", "none");
            setText(editBox.val());
        }
    }

    function upload(href, text)
    {
        var busyIndicator = ui.showBusyIndicator("Saving");

        $.ajax({
            url: href,
            type: "PUT",
            contentType: "text/plain",
            processData: false,
            data: text
        })
        .done(function ()
        {
        })
        .fail(function ()
        {
            ui.showError("Failed to upload.");
        })
        .always(function ()
        {
            busyIndicator.remove();
        });
    }

    var edited = false;
    
    var parts = href.split("/");
    var name = decodeURI(parts[parts.length - 1]);

    var page = ui.showPage(name);
    var originalContent = "";

    sh.onSwipeBack(page, function () { page.pop(); });

    var toggleButton = page.addIconButton("sh-icon-edit", toggleMode);

    page.find("section").append("<pre></pre>");
    var viewBox = page.find("section pre");
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
            upload(href, editBox.val());
        }
    });


    var busyIndicator = ui.showBusyIndicator("Loading");

    $.ajax(href, {
        beforeSend: function (xhr) {xhr.overrideMimeType("text/plain"); }
    })
    .success(function (data, status, xhr)
    {
        originalContent = data;
        setText(data);
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
        busyIndicator.remove();
    });
}

(function ()
{
    mimeRegistry.register("application/x-batch", viewText);
    mimeRegistry.register("application/x-json", viewText);
    mimeRegistry.register("application/x-python", viewText);
    mimeRegistry.register("application/x-qml", viewText);
    mimeRegistry.register("application/x-shellscript", viewText);
    mimeRegistry.register("text/plain", viewText);
    mimeRegistry.register("text/javascript", viewText);
    mimeRegistry.register("text/xml", viewText);
})();
