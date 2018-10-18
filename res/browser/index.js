"use strict";

function currentPath()
{
    var path = $("#main-page div h1").html();
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

function showMessage(msg)
{
    $("#message-dialog h1").html("Error");
    $("#message-dialog p").html(msg);
    $("#message-dialog").popup("open");
}

function closeMoreMenu(callback)
{
    if (callback)
    {
        $("#more-menu").one("popupafterclose", function ()
        {
            console.log("invoking callback");
            setTimeout(callback, 100);
        });
    }
    $("#more-menu").popup("close");
}

function loadThumbnails(page)
{
    console.log("Location: " + window.location.href);

    var images = [];
    $(page).find(".fileitem a img").each(function (idx)
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
    console.log("toggleSelect " + item);
    var selected = ! (item.data("selected") || false);
    item.data("selected", selected);

    if (selected)
    {
        $(item).find("> a:eq(1)").addClass("ui-btn-b");
    }
    else
    {
        $(item).find("> a:eq(1)").removeClass("ui-btn-b");
    }

    checkSelected();
}

function selectAll()
{
    console.log("Select all");
    var items = $("#filesbox .fileitem");
    items.data("selected", true);
    items.find("> a:eq(1)").addClass("ui-btn-b");

    checkSelected();
}

function unselectAll()
{
    console.log("Unselect all");

    var items = $("#filesbox .fileitem");
    items.data("selected", false);
    items.find("> a:eq(1)").removeClass("ui-btn-b");

    checkSelected();
}

function checkSelected()
{
    var items = $("#filesbox .fileitem");
    var size = 0;
    items.each(function ()
    {
        if ($(this).data("selected") == true)
        {
            ++size;
        }
    });
    console.log(size);

    if (size === 0)
    {
        $("#mi-download, #mi-cut, #mi-copy, #mi-delete, #mi-rename, #mi-unselectall").addClass("ui-state-disabled");
        $("#mi-selectall").removeClass("ui-state-disabled");
    }
    else
    {
        $("#mi-download, #mi-cut, #mi-copy, #mi-delete, #mi-unselectall").removeClass("ui-state-disabled");
        $("#mi-selectall").addClass("ui-state-disabled");
        if (size === 1)
        {
            $("#mi-rename").removeClass("ui-state-disabled");
        }
        else
        {
            $("#mi-rename").addClass("ui-state-disabled");
        }
    }
}

function eachSelected(callback)
{
    console.log("Each selected");

    var items = $("#filesbox .fileitem");
    var size = 0;
    items.each(function ()
    {
        if ($(this).data("selected"))
        {
            callback(this);
        }
    });
    unselectAll();
}

function showNewDirDialog()
{
    $("#newdir-dialog .accept-btn").off();
    $("#newdir-dialog .accept-btn").on("click", function ()
    {
        var name = $("#newdir-dialog form input").val();

        if (name !== "")
        {
            $("#newdir-dialog").one("popupafterclose", function ()
            {
                setTimeout(function ()
                {
                    makeDirectory(name);
                }, 100);
            });
        }
        $("#newdir-dialog").popup("close");
    });

    $("#newdir-dialog .cancel-btn").off();
    $("#newdir-dialog .cancel-btn").on("click", function ()
    {
        $("#newdir-dialog").popup("close");
    });

    $("#newdir-dialog").popup("open");
}

function showNewFileDialog()
{
    $("#name-dialog form input").val("New File");

    $("#name-dialog .accept-btn").off();
    $("#name-dialog .accept-btn").on("click", function ()
    {
        var name = $("#name-dialog form input").val();
        if (name !== "")
        {
            $("#name-dialog").one("popupafterclose", function ()
            {
                setTimeout(function ()
                {
                    makeFile(name);
                }, 100);
            });
        }
        $("#name-dialog").popup("close");
    });

    $("#name-dialog").popup("open");
}

function showNameDialog(item)
{
    item = $(item);
    var name = unescapeHtml(item.find("a h2").html());
    $("#name-dialog form input").val(name);

    $("#name-dialog .accept-btn").off();
    $("#name-dialog .accept-btn").on("click", function ()
    {
        var newName = $("#name-dialog form input").val();
        renameItem(item, newName);

        $("#name-dialog").popup("close");
    });

    $("#name-dialog").popup("open");
}

function checkClipboard()
{
    var size = $("#clipboard ul li").size();

    if (size === 0)
    {
        $("#mi-paste, #mi-showclipboard").addClass("ui-state-disabled");
    }
    else
    {
        $("#mi-paste, #mi-showclipboard").removeClass("ui-state-disabled");
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
        var name = unescapeHtml($(item).find("a h2").html());
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
            showMessage("Failed to remove: " + name);
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
    var img = $(item).find("img:eq(0)").clone();
    var info = $(item).find("p").clone();
    var name = $(item).find("a h2").html();

    var copy = $("<li data-icon='false'><a href='#'><h2>" + name + "</h2></a></li>");
    copy.find("a").prepend(img);
    copy.find("a").append(info);
    copy.appendTo("#clipboard ul");

    checkClipboard();
}

function cutItem(item)
{
    console.log("Cut item");

    var name = unescapeHtml($(item).find("a h2").html());
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
        $("#filesbox ul").listview("refresh");
    })
    .fail(function () {
        showMessage("Failed to cut: " + name);
    });
}

function copyItem(item)
{
    console.log("Copy item");

    var name = unescapeHtml($(item).find("a h2").html());
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
        showMessage("Failed to copy: " + name);
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
        var name = unescapeHtml($(item).find("a h2").html());
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
            showMessage("Failed to paste: " + name);
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
    var mimeType = $(item).find("a").data("mimetype");
    var name = unescapeHtml($(item).find("a h2").html());
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
    var name = unescapeHtml($(item).find("a h2").html());
    var target = encodeURIComponent(name);
    var newTarget = encodeURI(path !== "/" ? path : "") + "/" + encodeURIComponent(newName);

    $.ajax({
               url: target,
               type: "MOVE",
               beforeSend: function(xhr) { xhr.setRequestHeader("Destination", newTarget); },
           })
    .done(function () {
        console.log("File renamed: " + name + " -> " + newName);
        $(item).find("a h2").html(newName);
        window.location.reload();
    })
    .fail(function () {
        showMessage("Failed to rename: " + name + " -> " + newName);
    });
}

function removeItem(item)
{
    console.log("Remove item");

    var name = unescapeHtml($(item).find("a h2").html());
    var target = encodeURIComponent(name);

    $.ajax({
               url: target,
               type: "DELETE"
           })
    .done(function () {
        console.log("File removed: " + name);
        $(item).remove();
        $("#filesbox ul").listview("refresh");
    })
    .fail(function () {
        showMessage("Failed to remove: " + name);
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
            showMessage("Failed to upload: " + file.name);
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

    $.mobile.loading("show", { text: "Uploading", textVisible: true });

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
        showMessage("Failed to create directory: " + name);
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
        showMessage("Failed to create file: " + name);
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
            showMessage("Failed to change settings: " + err);
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
    var upButton = $("#upButton");
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
        if (dx > 16)
        {
            var angle = Math.atan(dy / dx);
            if (Math.abs(angle) > Math.PI / 4)
            {
                this.swipeContext.status = 3;
            }
            else
            {
                this.swipeContext.status = 1;
            }
        }
        break;

    case 1: // swiping
        $(".ui-header, #filesbox").css("margin-left", Math.min(swipeThreshold, dx) + "px");
        
        if (dx > swipeThreshold)
        {
            $("#main-page").css("background-color", "#a0a0a0");
            this.swipeContext.status = 2;
        }
        break;

    case 2: // activated
        $(".ui-header, #filesbox").css("margin-left", Math.min(swipeThreshold, dx) + "px");

        if (dx < swipeThreshold)
        {
            $("#main-page").css("background-color", "");
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
    $("#main-page").css("background-color", "");
    $(".ui-header, #filesbox").css("margin-left", 0 + "px");

    var upButton = $("#upButton");
    if (upButton.length && this.swipeContext.status === 2)
    {
        window.location.assign(upButton.attr("href"));
    }
}

function init()
{
    $("#upload").on("change", onFilesSelected);
}

$.event.special.tap.emitTapOnTaphold = false;

$(document).on("pagecreate", "#main-page", function (ev)
{
    /* setup swipe suppport */
    $("body").on("touchstart", onItemTouchStart);
    $("body").on("touchmove", onItemTouchMove);
    $("body").on("touchend", onItemTouchEnd);

    /* setup drag and drop for external files */
    $("body").on("dragover", onDragOver);
    $("body").on("drop", onDrop);

    $("#image-popup").on("popupbeforeposition", function ()
    {
        var maxHeight = $(window).height() - 24 + "px";
        $("#image-popup img" ).css("max-height", maxHeight);
    });

    unselectAll();
    checkClipboard();

    var page = ev.target;
    setTimeout(function () { loadThumbnails(page); }, 500);
});

$(document).on("pagebeforeshow", "#clipboard-page", function (ev)
{
    $("#clipboard ul").listview("refresh");
});

$(document).ready(init);
