"use strict";

function currentPath()
{
    var path = $("#main-page > header h1").html();
    return path === "/" ? path
                        : "/" + path;
}

function escapeHtml(text)
{
    return text.replace(/[\"'&<>]/g, function (a)
    {
        return {
            '"': '&quot;',
            '\'': '&apos;',
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[a];
    });
}

function unescapeHtml(text)
{
    return text.replace(/&quot;|&apos;|&amp;|&lt;|&gt;/g, function (a)
    {
        return {
            "&quot;": "\"",
            "&apos;": "'",
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">"
        }[a];
    });
}

function showError(msg)
{
    $("#message-dialog h1").html("Error");
    $("#message-dialog p").html(msg);
    sh.popup("message-dialog");
}

function loadThumbnails(page)
{
    console.log("Location: " + window.location.href);

    var images = [];
    $(page).find(".fileitem .thumbnail").each(function (idx)
    {
        var url = $(this).attr("data-x-thumbnail");
        if (url)
        {
            console.log("- Thumbnail: " + url);
            images.push(this);
        }
    });

    console.log("loadThumbnails: " + images.length + " images");
    loadNextThumbnail(window.location.href, images);
}

function loadNextThumbnail(forLocation, images)
{
    if (images.length === 0)
    {
        return;
    }

    var img = images.shift();
    var url = $(img).attr("data-x-thumbnail");
    console.log("GET: " + url);

    var now = Date.now();

    var settings = {
        beforeSend: function (xhr) { xhr.overrideMimeType("text/plain; charset=x-user-defined"); }
    };

    $.ajax(url, settings)
    .done(function (data, status, xhr)
    {
        var contentType = "image/png"; //xhr.getResponseHeader("Content-Type");
        if (url.toLowerCase().endsWith(".svg"))
        {
            contentType = "image/svg+xml";
        }

        var buffer = "";
        for (var i = 0; i < data.length; ++i)
        {
            buffer += String.fromCharCode(data.charCodeAt(i) & 0xff);
        }
        var pic = "data:" + contentType + ";base64," + btoa(buffer);

        var then = Date.now();
        $(img).css("background-image", "url(" + pic + ")");
        $(img).css("background-size", "cover");

        var speed = Math.ceil((data.length / 1024) / ((then - now) / 1000.0));
        console.log("Loading took " + (then - now) + " ms, size: " + data.length + " B (" + speed + " kB/s).");
    })
    .always(function ()
    {
        if (window.location.href === forLocation)
        {
            loadNextThumbnail(forLocation, images);
        }
    });
}

function toggleSelect(item)
{
    $(item).toggleClass("sh-selected");

    checkSelected();
}

function selectAll()
{
    console.log("Select all");
    $("#filesbox .fileitem > div.sh-right").addClass("sh-selected");

    checkSelected();
}

function unselectAll()
{
    console.log("Unselect all");
    $("#filesbox .fileitem > div.sh-right").removeClass("sh-selected");

    checkSelected();
}

function checkSelected()
{
    var size = $("#filesbox .fileitem > div.sh-right.sh-selected").length;
    console.log(size);

    if (size === 0)
    {
        $("#mi-download, #mi-cut, #mi-copy, #mi-delete, #mi-rename, #mi-unselectall").addClass("sh-disabled");
        //$("#mi-selectall").removeClass("sh-disabled");
    }
    else
    {
        $("#mi-download, #mi-cut, #mi-copy, #mi-delete, #mi-unselectall").removeClass("sh-disabled");
        //$("#mi-selectall").addClass("sh-disabled");
        if (size === 1)
        {
            $("#mi-rename").removeClass("sh-disabled");
        }
        else
        {
            $("#mi-rename").addClass("sh-disabled");
        }
    }
}

function eachSelected(callback)
{
    console.log("Each selected");

    var items = $("#filesbox .fileitem > div.sh-right.sh-selected");
    items.each(function ()
    {
        callback($(this).parent());
    });
    unselectAll();
}

function showNewDirDialog()
{
    function acceptCb()
    {
        sh.popup_close("newdir-dialog");
        var name = $("#newdir-dialog form input").val();

        if (name !== "")
        {
            makeDirectory(name);
        }
        else
        {
            showError("Invalid name.");
        }
    }

    $("#newdir-dialog form input").val("");
    $("#newdir-dialog a:first-child").off("click").on("click", acceptCb);
    sh.popup("newdir-dialog");
}

function showNewFileDialog()
{
    function acceptCb()
    {
        sh.popup_close("name-dialog");
        var name = $("#name-dialog form input").val();

        if (name !== "")
        {
            makeFile(name);
        }
        else
        {
            showError("Invalid name.");
        }
    }

    $("#name-dialog form input").val("");
    $("#name-dialog a:first-child").off("click").on("click", acceptCb);
    sh.popup("name-dialog");
}

function showNameDialog(item)
{
    function acceptCb()
    {
        var newName = $("#name-dialog form input").val();
        renameItem(item, newName);
        sh.popup_close("name-dialog");
    }

    item = $(item);
    var name = unescapeHtml(item.find("h1:first-child").html());
    $("#name-dialog form input").val(name);
    $("#name-dialog a:first-child").off("click").on("click", acceptCb);
    sh.popup("name-dialog");
}

function checkClipboard()
{
    var size = $("#clipboard ul li").size();

    if (size === 0)
    {
        $("#mi-paste, #mi-showclipboard").addClass("sh-disabled");
    }
    else
    {
        $("#mi-paste, #mi-showclipboard").removeClass("sh-disabled");
    }
}


function clearClipboard(callback)
{
    console.log("Clear clipboard");

    var tokens = [];
    $("#clipboard ul li").each(function ()
    {
        tokens.push(1);
    });

    if (tokens.length === 0)
    {
        callback();
        return;
    }

    var binItems = $("#clipboard ul li");
    binItems.each(function ()
    {
        var item = this;
        var name = unescapeHtml($(item).find("h1").html());
        var target = "/.pilvini/clipboard/" + encodeURIComponent(name);

        $.ajax({
                   url: target,
                   type: "DELETE"
               })
        .done(function ()
        {
            console.log("File removed: " + name);
            $(item).remove();
        })
        .fail(function ()
        {
            showError("Failed to remove: " + name);
        })
        .always(function ()
        {
            tokens.pop();
            if (tokens.length === 0)
            {
                checkClipboard();
                callback();
            }
        });
    });
}

function copyItemToClipboard(item)
{
    var li = $(item).clone();
    li.off("click");
    li.find("div").last().remove();
    li.appendTo("#clipboard ul");

    checkClipboard();
}

function cutItem(item)
{
    console.log("Cut item");

    // TODO: use data-url
    var name = unescapeHtml($(item).find("h1").html());
    var target = encodeURIComponent(name);
    var newTarget = "/.pilvini/clipboard/" + encodeURIComponent(name);

    $.ajax({
               url: target,
               type: "MOVE",
               beforeSend: function(xhr) { xhr.setRequestHeader("Destination", newTarget); },
           })
    .done(function () {
        console.log("File cut: " + name);
        copyItemToClipboard(item);
        $(item).remove();
    })
    .fail(function () {
        showError("Failed to cut: " + name);
    });
}

function copyItem(item)
{
    console.log("Copy item");

    // TODO: use data-url
    var name = unescapeHtml($(item).find("h1").html());
    var target = encodeURIComponent(name);
    var newTarget = "/.pilvini/clipboard/" + encodeURIComponent(name);

    $.ajax({
               url: target,
               type: "COPY",
               beforeSend: function(xhr) { xhr.setRequestHeader("Destination", newTarget); },
           })
    .done(function () {
        console.log("File copied: " + name);
        copyItemToClipboard(item);
    })
    .fail(function () {
        showError("Failed to copy: " + name);
    });
}

function pasteItems()
{
    console.log("Paste items");

    var tokens = [];
    $("#clipboard ul li").each(function ()
    {
       tokens.push(1);
    });

    $("#clipboard ul li").each(function ()
    {
        var item = this;

        var path = currentPath();
        // TODO: use data-url
        var name = unescapeHtml($(item).find("h1").html());
        var target = "/.pilvini/clipboard/" + encodeURIComponent(name);
        var newTarget = encodeURI(path !== "/" ? path : "") + "/" + encodeURIComponent(name);

        $.ajax({
                   url: target,
                   type: "MOVE",
                   beforeSend: function(xhr) { xhr.setRequestHeader("Destination", newTarget); },
               })
        .done(function ()
        {
            console.log("File pasted: " + name);
        })
        .fail(function ()
        {
            showError("Failed to paste: " + name);
        })
        .always(function ()
        {
            tokens.pop();
            if (tokens.length === 0)
            {
                window.location.reload();
            }
        });
    });
}

function downloadItem(item)
{
    var mimeType = $(item).data("mimetype");
    // TODO: use data-url
    var name = unescapeHtml($(item).find("h1").html());
    var target = encodeURIComponent(name);

    var downloader = $("#download");
    downloader.attr("href", target);
    downloader.attr("download", mimeType === "application/x-folder" ? name + ".zip"
                                                                    : name);
    if (downloader.get(0).click)
    {
        downloader.get(0).click();
    }
    else
    {
        var event = document.createEvent('Event');
        event.initEvent('click', true, true);
        downloader.get(0).dispatchEvent(event);
    }
}

function renameItem(item, newName)
{
    console.log("Rename item");

    var path = currentPath();
    var name = unescapeHtml($(item).find("h1:first-child").html());
    var target = encodeURIComponent(name);
    var newTarget = encodeURI(path !== "/" ? path : "") + "/" + encodeURIComponent(newName);

    $.ajax({
               url: target,
               type: "MOVE",
               beforeSend: function(xhr) { xhr.setRequestHeader("Destination", newTarget); },
           })
    .done(function () {
        console.log("File renamed: " + name + " -> " + newName);
        $(item).find("h1").html(newName);
        window.location.reload();
    })
    .fail(function () {
        showError("Failed to rename: " + name + " -> " + newName);
    });
}

function removeItem(item)
{
    console.log("Remove item");

    // TODO: use data-url
    var name = unescapeHtml($(item).find("h1").html());
    var target = encodeURIComponent(name);

    $.ajax({
               url: target,
               type: "DELETE"
           })
    .done(function () {
        console.log("File removed: " + name);
        $(item).remove();
    })
    .fail(function () {
        showError("Failed to remove: " + name);
    });
}

function upload(file, target, callback)
{
    console.log("Upload: " + file.name + " -> " + target);

    var reader = new FileReader();
    reader.onload = function (ev)
    {
        console.log("FileReader::onLoad");
        var data = new Uint8Array(ev.target.result);

        $.ajax({
                   url: target,
                   type: "PUT",
                   contentType: "application/octet-stream",
                   processData: false,
                   data: data
               })
        .done(function () {
            console.log("File uploaded: " + file.name + ", size: " + data.length);
        })
        .fail(function () {
            showError("Failed to upload: " + file.name);
        })
        .always(function () {
            callback();
        });
    }
    reader.readAsArrayBuffer(file);
}

function uploadFiles(files)
{
    if (files.length == 0)
    {
        return;
    }

    sh.popup("busy-popup");

    var tokens = [];
    for (var i = 0; i < files.length; ++i)
    {
        tokens.push(1);
    }

    for (i = 0; i < files.length; ++i)
    {
        var file = files[i];
        var target = window.location.pathname.replace("index.html", encodeURIComponent(file.name));

        upload(file, target, function ()
        {
            tokens.pop();

            if (tokens.length === 0)
            {
                window.location.reload();
            }
        });
    }
}

function makeDirectory(name)
{
    var target = encodeURIComponent(name);

    $.ajax({
               url: target,
               type: "MKCOL"
           })
    .done(function ()
    {
        console.log("Directory created: " + name);
        window.location.reload();
    })
    .fail(function ()
    {
        showError("Failed to create directory: " + name);
    });
}

function makeFile(name)
{
    var target = encodeURIComponent(name);

    $.ajax({
               url: target,
               type: "PUT",
               contentType: "application/x-octet-stream",
               processData: false,
               data: ""
           })
    .done(function ()
    {
        console.log("File created: " + name);
        window.location.reload();
    })
    .fail(function ()
    {
        showError("Failed to create file: " + name);
    });
}

function changeSettings(key, value, altValue)
{
    var settingsFile = "/.pilvini/settings.json";

    function apply(json)
    {
        if (json[key] === value)
        {
            json[key] = altValue;
        }
        else
        {
            json[key] = value;
        }

        console.log("Uploading settings...");
        $.ajax({
            url: settingsFile,
            type: "PUT",
            data: JSON.stringify(json),
            processData: false,
            beforeSend: function (xhr) { xhr.overrideMimeType("text/plain; charset=x-user-defined"); }
        })
        .done(function ()
        {
            console.log("Settings changed: " + key + " = " + value);
            window.location.reload();
        })
        .fail(function (xhr, status, err)
        {
            showError("Failed to change settings: " + err);
        });
    }

    $.ajax({
        type: "GET",
        url: settingsFile,
        dataType: "json"
    })
    .done(function (data, status, xhr)
    {
        console.log("Data: " + JSON.stringify(data));
        apply(data);
    })
    .fail(function (xhr, status, err)
    {
        apply({ });
    });
}

function onFilesSelected(ev)
{
    uploadFiles(ev.target.files);
}

function onDragOver(ev)
{
    ev.dataTransfer = ev.originalEvent.dataTransfer;
    ev.stopPropagation();
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
}

function onDrop(ev)
{
    ev.dataTransfer = ev.originalEvent.dataTransfer;
    ev.stopPropagation();
    ev.preventDefault();
    uploadFiles(ev.dataTransfer.files);
}

function onItemTouchStart(ev)
{
    this.swipeContext = {
        beginX: ev.originalEvent.touches[0].screenX,
        beginY: ev.originalEvent.touches[0].screenY,
        status: 0
    };
}

function onItemTouchMove(ev)
{
    if ($(sh.topmost(".sh-visible")).attr("id") !== "main-page")
    {
        return;
    }

    var upButton = $(sh.topmost(".sh-page.sh-visible")).find("#upButton");
    if (! upButton.length)
    {
        return;
    }

    var dx = ev.originalEvent.touches[0].screenX - this.swipeContext.beginX;
    var dy = ev.originalEvent.touches[0].screenY - this.swipeContext.beginY;
    
    var swipeThreshold = $(this).width() * 0.50;

    switch (this.swipeContext.status)
    {
    case 0: // initiated
        if (dx > 32)
        {
            var angle = Math.atan(dy / dx);
            if (Math.abs(angle) > Math.PI / 4)
            {
                this.swipeContext.status = 3;
            }
            else
            {
                $("#main-page").addClass("sh-page-transitioning");
                this.swipeContext.status = 1;
            }
        }
        break;

    case 1: // swiping
        $("#main-page, #main-page > header").css("left", Math.max(0, Math.min(swipeThreshold, dx)) + "px")
                                            .css("right", -Math.max(0, Math.min(swipeThreshold, dx)) + "px");
        
        if (dx > swipeThreshold)
        {
            $("body").css("background-color", "#a0a0a0");
            this.swipeContext.status = 2;
        }
        break;

    case 2: // activated
    $("#main-page, #main-page > header").css("left", Math.max(0, Math.min(swipeThreshold, dx)) + "px")
                                        .css("right", -Math.max(0, Math.min(swipeThreshold, dx)) + "px");

        if (dx < swipeThreshold)
        {
            $("body").css("background-color", "");
            this.swipeContext.status = 1;
        }
        break;

    case 3: // aborted
        break;
    }

    //ev.preventDefault();
}

function onItemTouchEnd(ev)
{
    $("body").css("background-color", "");
    $("#main-page, #main-page > header").css("left", 0).css("right", 0);
    $("#main-page").removeClass("sh-page-transitioning");

    var upButton = $("#upButton");
    if (upButton.length && this.swipeContext.status === 2)
    {
        window.location.assign(upButton.data("url"));
    }
}

function init()
{
    $("#upload").on("change", onFilesSelected);
    sh.push("main-page", function () { }, true);

    var page = $("#main-page");
    setTimeout(function () { loadThumbnails(page); }, 500);

    $("#viewer-page").on("sh-closed", function ()
    {
        $(this).find("section").html("");
    });

    /* setup swipe suppport */
    $("body").on("touchstart", onItemTouchStart);
    $("body").on("touchmove", onItemTouchMove);
    $("body").on("touchend", onItemTouchEnd);

    /* setup drag and drop for external files */
    $("body").on("dragover", onDragOver);
    $("body").on("drop", onDrop);

    unselectAll();
    checkClipboard();
}

$(document).ready(init);
