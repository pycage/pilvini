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

    var page = $("#viewer-page");
    var originalContent = "";

    sh.onSwipeBack(page, function () { sh.pop(); });

    var parts = href.split("/");
    var name = decodeURI(parts[parts.length - 1]);
    page.find("header h1").html(name);

    page.find("header").append("<span class='sh-right sh-fw-icon sh-icon-edit' onclick=''></span>");
    var toggleButton = page.find("header span:last-child");

    toggleButton.on("click", toggleMode);

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
        if (data !== originalContent)
        {
            upload(href, data, function () { });
        }
        toggleButton.remove();
    });



    sh.popup("busy-popup");
    $.ajax(href, {
        beforeSend: function (xhr) {xhr.overrideMimeType("text/x-markdown"); }
    })
    .success(function (data, status, xhr)
    {
        originalContent = data;
        setMarkdown(data);
        editBox.val(data);
    })
    .complete(function ()
    {
        sh.popup_close("busy-popup");
    });
}
