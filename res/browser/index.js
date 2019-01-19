"use strict";

function currentUri()
{
    return $("#main-page > section").data("url");
}

/* Initiates loading the thumbnails of the items on the page.
 */
function loadThumbnails(page)
{
    console.log("Location: " + currentUri());

    var items = [];
    $(page).find(".fileitem").each(function (idx)
    {
        if ($(this).find(".thumbnail").length)
        {
            items.push(this);
        }
    });

    console.log("loadThumbnails: " + items.length + " images");
    loadNextThumbnail(currentUri(), items);
}

/* Loads the next thumbnail.
 */
function loadNextThumbnail(forLocation, items)
{
    if (items.length === 0)
    {
        return;
    }

    // sort images by visibility to load those in view first
    var topPos = $(document).scrollTop();
    var bottomPos = topPos + $(window).height();

    items.sort(function (a, b)
    {
        var aPos = $(a).offset().top;
        var bPos = $(b).offset().top;
        var aHeight = $(a).height();
        var bHeight = $(b).height();
        var aVisible = aPos < bottomPos && aPos + aHeight > topPos;
        var bVisible = bPos < bottomPos && bPos + bHeight > topPos;

        if (aVisible && ! bVisible)
        {
            return -1;
        }
        else if (! aVisible && bVisible)
        {
            return 1;
        }
        else
        {
            return aPos - bPos;
        }
    });

    var item = items.shift();
    var name = $(item).find("h1").html();
    var img = $(item).find(".thumbnail");
    var url = img.data("x-thumbnail");
    //var img = images.shift();
    //var url = img.attr("data-x-thumbnail");
    console.log("GET: " + url);

    var now = Date.now();

    var statusEntry = pushStatus("sh-icon-wait", name);

    var settings = {
        beforeSend: function (xhr)
        {
             xhr.overrideMimeType("text/plain; charset=x-user-defined");
             xhr.setRequestHeader("x-pilvini-width", 80);
             xhr.setRequestHeader("x-pilvini-height", 80);
        }
    };

    $.ajax(url, settings)
    .done(function (data, status, xhr)
    {
        if (xhr.status === 200)
        {
            var contentType = "image/jpeg"; //xhr.getResponseHeader("Content-Type");
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

            if (currentUri() === forLocation)
            {
                loadNextThumbnail(forLocation, items);
            }
            statusEntry.remove();
        }
        else if (xhr.status === 204)
        {
            // create thumbnail client-side, send to server, and retry           
            generateThumbnail(item, function (data)
            {
                var thumbnailUrl = $(item).find(".thumbnail").data("x-thumbnail");
                submitThumbnail("image/jpeg", data, thumbnailUrl, function (ok)
                {
                    statusEntry.remove();
                    if (ok)
                    {
                        items.unshift(item);
                    }
                    if (currentUri() === forLocation)
                    {
                        loadNextThumbnail(forLocation, items);
                    }
                });
            });
        }
    })
    .fail(function ()
    {
        if (currentUri() === forLocation)
        {
            loadNextThumbnail(forLocation, items);
        }
        statusEntry.remove();
    });
}

/* Generates a client-side thumbnail.
 */
function generateThumbnail(item, callback)
{
    var mimeType = $(item).data("mimetype");
    if (mimeType.indexOf("video/") === 0)
    {
        var sourceUrl = $(item).data("url");
        generateVideoThumbnail(sourceUrl, callback);
    }
    else
    {
        callback(false);
    }
}

/* Generates a video thumbnail.
 */
function generateVideoThumbnail(url, callback)
{
    function extractImage(data)
    {
        var pos = data.indexOf(",");
        var b64 = data.substr(pos + 1);
        return atob(b64);
    }


    var videoPlayer = document.createElement("video");
    videoPlayer.autoplay = true;
    videoPlayer.muted = true;

    var canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 80;

    var ctx = canvas.getContext("2d");
    
    $(videoPlayer).on("canplay", function ()
    {
        //alert("canplay");
        $(videoPlayer).off("canplay");
        videoPlayer.currentTime = videoPlayer.duration * 0.2;
        //videoPlayer.play();
    });

    $(videoPlayer).on("seeked", function ()
    {
        //alert("seeked");
        $(videoPlayer).off("seeked");
        var w = videoPlayer.videoWidth;
        var h = videoPlayer.videoHeight;

        // crop viewport
        var cw = Math.min(w, h);
        var ch = cw;
        var cx = (w - cw) / 2;
        var cy = (h - ch) / 2;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 80, 80);

        // capturing the image can go wrong and we don't want to upload a
        // broken thumbnail in these cases
        //  - Mobile Firefox does not allow capturing at all
        //  - Silk on Fire TV treats mp4 as copy-protected and captures all black
        //    (webm is fine, though)
        var data = "";
        try
        {
            ctx.drawImage(videoPlayer, cx, cy, cw, ch, 0, 0, 80, 80);

            // check if we got a valid image, as some browsers silently give us a black screen
            // for copy-protection
            var buffer = ctx.getImageData(0, 0, 80, 1);    
            var allBlack = true;
            for (var i = 0; i < buffer.data.length; i += 4)
            {
                if (buffer.data[i] !== 0 || buffer.data[i + 1] !== 0 || buffer.data[i + 2] !== 0)
                {
                    allBlack = false;
                    break;
                }
            }
            if (allBlack)
            {
                throw "No content";
            }

            data = extractImage(canvas.toDataURL("image/jpeg"));
        }
        catch (err)
        {
            //alert(err);
            console.error("Failed to thumbnail video " + url + ": " + err);
        }

        $(videoPlayer).off("error");
        videoPlayer.src = "";
        videoPlayer.load();
        $(videoPlayer).remove();

        callback(data);
    });

    $(videoPlayer).on("error", function ()
    {
        console.error("Failed to thumbnail video " + url + ": read error");
        callback("");
    });

    videoPlayer.src = url;
    videoPlayer.load();
}

/* Submits a client-side-generated thumbnail to the server.
 */
function submitThumbnail(mimeType, data, url, callback)
{
    if (data === "")
    {
        callback(false);
        return;
    }

    // fill binary buffer
    var buffer = new ArrayBuffer(data.length);
    var writer = new Uint8Array(buffer);
    for (var i = 0; i < data.length; ++i)
    {
        writer[i] = data.charCodeAt(i);
    }

    $.ajax({
        url: url,
        type: "PUT",
        data: buffer,
        processData: false,
        beforeSend: function (xhr)
        {
             xhr.overrideMimeType(mimeType);
             xhr.setRequestHeader("x-pilvini-width", 80);
             xhr.setRequestHeader("x-pilvini-height", 80);
        }
    })
    .done(function ()
    {
        callback(true);
    })
    .fail(function (xhr, status, err)
    {
        callback(false);
    });
}

function share(shareId, password)
{
    var targetUri = currentUri();
    $.ajax({
        type: "POST",
        url: "/share/",
        beforeSend: function(xhr)
        {
             xhr.setRequestHeader("Destination", targetUri);
             xhr.setRequestHeader("x-pilvini-share-id", shareId);
             xhr.setRequestHeader("x-pilvini-share-password", password);
        },
    })
    .done(function (data, status, xhr)
    {
        loadDirectory(currentUri());
    });
}

function unshare()
{
    var targetUri = currentUri();
    $.ajax({
        type: "POST",
        url: "/unshare/",
        beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
    })
    .done(function (data, status, xhr)
    {
        loadDirectory(currentUri());
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

function removeSelected()
{
    function yesCb()
    {
        eachSelected(removeItem);
    }

    function noCb()
    {

    }

    showQuestion("Delete", "Delete these entries?", yesCb, noCb);
}

function showLoginDialog()
{
    var dlg = showDialog("Login", "Welcome to pilvini.");
    var loginEntry = dlg.addTextEntry("Login:", "");
    var passwordEntry = dlg.addPasswordEntry("Password:", "");
    dlg.addButton("Login", function ()
    {
        login(loginEntry.val(), passwordEntry.val());
    }, true);
}

function showNewDirDialog()
{
    var dlg = showDialog("New Directory", "Create a new directory.");
    var entry = dlg.addTextEntry("Name:", "");
    dlg.addButton("Create", function ()
    {
        var name = entry.val();
        if (name !== "")
        {
            makeDirectory(name);
        }
        else
        {
            showError("Invalid name.");
        }
    }, true);
    dlg.addButton("Cancel");
}

function showNewFileDialog()
{
    var dlg = showDialog("New File", "Create a new file.");
    var entry = dlg.addTextEntry("Name:", "");
    dlg.addButton("Create", function ()
    {
        var name = entry.val();
        if (name !== "")
        {
            makeFile(name);
        }
        else
        {
            showError("Invalid name.");
        }
    }, true);
    dlg.addButton("Cancel");
}

function showNameDialog(item)
{
    item = $(item);
    var name = unescapeHtml(item.find("h1:first-child").html());

    var dlg = showDialog("Rename File", "Rename the file.");
    var entry = dlg.addTextEntry("Name:", name);
    dlg.addButton("Rename", function ()
    {
        var newName = entry.val();
        if (newName !== "")
        {
            renameItem(item, newName);
        }
        else
        {
            showError("Invalid name.");
        }
    }, true);
    dlg.addButton("Cancel");
}

function showShareDialog()
{
    var dlg = showDialog("Setup Share", "Share this directory.");
    var loginEntry = dlg.addTextEntry("Share Login:", "");
    var passwordEntry = dlg.addTextEntry("Share Password:", "");
    dlg.addButton("Share", function ()
    {
        share(loginEntry.val(), passwordEntry.val());
    }, true);
    dlg.addButton("Cancel");
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
    var name = unescapeHtml($(item).find("h1").html());
    var li = $(item).clone();
    li.data("url", "/.pilvini/clipboard/" + encodeURIComponent(name));
    li.off("click");
    li.find("div").last().remove();
    li.appendTo("#clipboard ul");

    checkClipboard();
}

function cutItem(item)
{
    console.log("Cut item");

    var name = unescapeHtml($(item).find("h1").html());
    var sourceUri = $(item).data("url");
    var targetUri = "/.pilvini/clipboard/" + encodeURIComponent(name);

    $.ajax({
               url: sourceUri,
               type: "MOVE",
               beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
           })
    .done(function () {
        console.log("File cut: " + name);
        copyItemToClipboard(item);
        $(item).remove();
        updateNavBar();
    })
    .fail(function () {
        showError("Failed to cut: " + name);
    });
}

function copyItem(item)
{
    console.log("Copy item");

    
    var name = unescapeHtml($(item).find("h1").html());
    var sourceUri = $(item).data("url");
    var targetUri = "/.pilvini/clipboard/" + encodeURIComponent(name);
    //var target = encodeURIComponent(name);
    //var newTarget = "/.pilvini/clipboard/" + encodeURIComponent(name);
    
    var statusEntry = pushStatus("sh-icon-clipboard", "Copying " + name);

    $.ajax({
               url: sourceUri,
               type: "COPY",
               beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
           })
    .done(function () {
        console.log("File copied: " + name);
        copyItemToClipboard(item);
    })
    .fail(function () {
        showError("Failed to copy: " + name);
    })
    .always(function ()
    {
        statusEntry.remove();
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

        var name = unescapeHtml($(item).find("h1").html());
        var sourceUri = $(item).data("url");
        var targetUri = currentUri() + "/" + name;

        $.ajax({
                   url: sourceUri,
                   type: "MOVE",
                   beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
               })
        .done(function ()
        {
            console.log("File pasted: " + name);
            $(item).remove();
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
                loadDirectory(currentUri());
            }
        });
    });
}

function downloadItem(item)
{
    var mimeType = $(item).data("mimetype");
    var targetUri = $(item).data("url");
    var name = unescapeHtml($(item).find("h1").html());

    var downloader = $("#download");
    downloader.attr("href", targetUri);
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

    //var path = currentPath();
    var name = unescapeHtml($(item).find("h1:first-child").html());
    var sourceUri = $(item).data("url");
    var targetUri = currentUri() + "/" + encodeURIComponent(newName);
    //var target = encodeURIComponent(name);
    //var newTarget = encodeURI(path !== "/" ? path : "") + "/" + encodeURIComponent(newName);

    $.ajax({
               url: sourceUri,
               type: "MOVE",
               beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
           })
    .done(function () {
        console.log("File renamed: " + name + " -> " + newName);
        $(item).find("h1").html(newName);
        loadDirectory(currentUri());
    })
    .fail(function () {
        showError("Failed to rename: " + name + " -> " + newName);
    });
}

function removeItem(item)
{
    console.log("Remove item");

    var name = unescapeHtml($(item).find("h1").html());
    var targetUri = $(item).data("url");

    $.ajax({
               url: targetUri,
               type: "DELETE"
           })
    .done(function () {
        console.log("File removed: " + name);
        $(item).remove();
        updateNavBar();
    })
    .fail(function () {
        showError("Failed to remove: " + name);
    });
}

function upload(file, target, callback)
{
    var statusEntry = pushStatus("sh-icon-cloud-upload", file.name);

    function createMonitoringXhr()
    {
        var xhr = $.ajaxSettings.xhr();
        if (xhr.upload)
        {
            xhr.upload.addEventListener("progress", function (status)
            {
                if (status.lengthComputable && status.total > 0)
                {
                    var p = status.loaded / status.total;
                    statusEntry.setProgress(p * 100);
                }
            }, false);
        }

        return xhr;
    }

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
                   data: data,
                   xhr: createMonitoringXhr
               })
        .done(function () {
            console.log("File uploaded: " + file.name + ", size: " + data.length);
        })
        .fail(function () {
            showError("Failed to upload: " + file.name);
        })
        .always(function () {
            statusEntry.remove();
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

    var tokens = [];
    for (var i = 0; i < files.length; ++i)
    {
        tokens.push(1);
    }

    for (i = 0; i < files.length; ++i)
    {
        var file = files[i];
        var targetUri = currentUri() +
                        (currentUri() !== "/" ? "/" : "") +
                        encodeURIComponent(file.name);

        upload(file, targetUri, function ()
        {
            tokens.pop();

            if (tokens.length === 0)
            {
                loadDirectory(currentUri());
            }
        });
    }
}

function makeDirectory(name)
{
    var targetUri = currentUri() + "/" + encodeURIComponent(name);

    $.ajax({
               url: targetUri,
               type: "MKCOL"
           })
    .done(function ()
    {
        console.log("Directory created: " + name);
        loadDirectory(currentUri());
    })
    .fail(function ()
    {
        showError("Failed to create directory: " + name);
    });
}

function makeFile(name)
{
    var targetUri = currentUri() + "/" + encodeURIComponent(name);

    $.ajax({
               url: targetUri,
               type: "PUT",
               contentType: "application/x-octet-stream",
               processData: false,
               data: ""
           })
    .done(function ()
    {
        console.log("File created: " + name);
        loadDirectory(currentUri());
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
            loadDirectory(currentUri());
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


/* Adds the given entry to the favorites menu.
 */
function addFavorite()
{
    function extractName(uri)
    {
        var parts = uri.split("/");
        var p = parts[parts.length - 1];
        return p !== "" ? decodeURIComponent(p)
                        : "/";
    }

    var favsFile = "/.pilvini/favorites.json";

    var name = extractName(currentUri());
    var uri = currentUri();

    function apply(json)
    {
        json.push({ "name": name, "href": uri });
        $.ajax({
            url: favsFile,
            type: "PUT",
            data: JSON.stringify(json),
            processData: false,
            beforeSend: function (xhr) { xhr.overrideMimeType("text/plain; charset=x-user-defined"); }
        })
        .done(function ()
        {
            loadDirectory(currentUri());
        })
        .fail(function (xhr, status, err)
        {
            showError("Failed to add favorite.");
        });
    }

    $.ajax({
        type: "GET",
        url: favsFile,
        dataType: "json"
    })
    .done(function (data, status, xhr)
    {
        apply(data);
    })
    .fail(function (xhr, status, err)
    {
        // file might not exist yet
        apply([]);
    });
}

function removeFavorite()
{
    var favsFile = "/.pilvini/favorites.json";
    var uri = currentUri();

    function apply(json)
    {
        json = json.filter(function (a)
        {
            return a.href !== uri;
        });

        $.ajax({
            url: favsFile,
            type: "PUT",
            data: JSON.stringify(json),
            processData: false,
            beforeSend: function (xhr) { xhr.overrideMimeType("text/plain; charset=x-user-defined"); }
        })
        .done(function ()
        {
            loadDirectory(currentUri());
        })
        .fail(function (xhr, status, err)
        {
            showError("Failed to remove favorite.");
        });
    }

    $.ajax({
        type: "GET",
        url: favsFile,
        dataType: "json"
    })
    .done(function (data, status, xhr)
    {
        apply(data);
    })
    .fail(function (xhr, status, err)
    {
        // file might not exist yet
        apply([]);
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

function updateNavBar()
{
    $("#navbar").html("");
    var items = $("#filesbox .fileitem");
    var currentLetter = "";
    for (var i = 0; i < items.length; ++i)
    {
        var item = $(items[i]);
        var letter = item.find("h1").html()[0].toUpperCase();

        if (letter !== currentLetter)
        {
            $("#navbar").append(
                tag("span")
                .style("position", "absolute")
                .style("top", (item.offset().top - $("#main-page > header").height()) + "px")
                .style("left", "0")
                .style("right", "0")
                .content(letter)
                .html()
            )
            currentLetter = letter;
        }
    }

    $("#navbar").off("mousedown").on("mousedown", function (event)
    {
        this.pressed = true;

        var percents = (event.clientY - $(this).offset().top) /
                       ($(window).height() - $(this).offset().top);
        $(document).scrollTop(($(document).height() - $(window).height()) * percents);
    });

    $("#navbar").off("mouseup").on("mouseup", function (event)
    {
        this.pressed = false;
    });

    $("#navbar").off("mouseleave").on("mouseleave", function (event)
    {
        this.pressed = false;
    });

    $("#navbar").off("mousemove").on("mousemove", function (event)
    {
        if (this.pressed)
        {
            var percents = (event.clientY - $(this).offset().top) /
                           ($(window).height() - $(this).offset().top);
            $(document).scrollTop(($(document).height() - $(window).height()) * percents);
        }
    });

    // quite an effort to work around quirks in certain touch browsers

    $("#navbar").off("touchstart").on("touchstart", function (event)
    {
        var scrollBegin = $(document).scrollTop();
        $("#main-page").addClass("sh-page-transitioning");
        $("#main-page > section").scrollTop(scrollBegin);
        this.touchContext = {
            top: $(this).offset().top,
            scrollBegin: scrollBegin,
            scrollTarget: 0
        };
    });

    $("#navbar").off("touchend").on("touchend", function (event)
    {
        $("#main-page > section").css("margin-top", 0);
        $("#main-page").removeClass("sh-page-transitioning");
        if (this.touchContext.scrollTarget > 0)
        {
            $(document).scrollTop(this.touchContext.scrollTarget);
        }    
    });

    $("#navbar").off("touchmove").on("touchmove", function (event)
    {
        event.preventDefault();
        
        var percents = (event.originalEvent.touches[0].clientY - this.touchContext.top) /
                       ($(window).height() - this.touchContext.top);
        percents = Math.max(0, Math.min(1, percents));

        var scrollTop = ($("#navbar").height() + $("#main-page > header").height() - $(window).height()) * percents;

        $("#main-page > section").css("margin-top", (-scrollTop) + "px");
        this.touchContext.scrollTarget = scrollTop;        
    });

    var h1 = $(window).height() - $("#main-page > header").height() - 1;
    if ($("#navbar").height() < h1)
    {
        $("#navbar").height(h1);
    }
}

function loadDirectory(href)
{
    var busyIndicator = showBusyIndicator();
    
    var prefix = $("#filesbox").data("prefix");

    $("#main-page").load(prefix + href + "?ajax #main-page > *", function (data, status, xhr)
    {
        if (xhr.status !== 200)
        {
            busyIndicator.remove();
            showError("Failed to load directory.");
            return;
        }

        sh.push("main-page", function ()
        {
            var page = $("#main-page");
            setTimeout(function () { loadThumbnails(page); }, 500);
        
            unselectAll();
            checkClipboard();
            updateNavBar();
    
            busyIndicator.remove();

            page.trigger("pilvini-page-replaced");
        }, true);
    });
}

function login(user, password)
{
    $.ajax({
        type: "POST",
        url: "/::login/",
        beforeSend: function(xhr)
        {
             xhr.setRequestHeader("x-pilvini-user", user);
             xhr.setRequestHeader("x-pilvini-password", password);
        },
    })
    .done(function (data, status, xhr)
    {
        // server returns the auth code on successful login
        var authCode = xhr.getResponseHeader("X-Pilvini-Auth");
        document.cookie = "AuthCode=" + authCode + "; path=/";
        window.location.reload();
    })
    .fail(function (xhr, status, err)
    {
        showError("Invalid login credentials.", function ()
        {
            showLoginDialog();
        });
    });
}

function logout()
{
    $.ajax({
        type: "POST",
        url: "/::login/",
        beforeSend: function(xhr)
        {
             xhr.setRequestHeader("x-pilvini-user", "");
             xhr.setRequestHeader("x-pilvini-password", "");
        },
    })
    .done(function (data, status, xhr)
    {
        window.location.reload();
    });
}

function init()
{
    $("#upload").on("change", onFilesSelected);
    sh.push("main-page", function () { }, true);

    var page = $("#main-page");
    var clipboardPage = $("#clipboard-page");
    setTimeout(function () { loadThumbnails(page); }, 500);

    /* setup swipe suppport */
    sh.onSwipeBack(page, function ()
    {
        var upButton = $("#upButton");
        if (upButton.length)
        {
            loadDirectory(upButton.data("url"));
        }
    });

    sh.onSwipeBack(clipboardPage, function ()
    {
        sh.pop();
    });

    /* setup drag and drop for external files */
    $("body").on("dragover", onDragOver);
    $("body").on("drop", onDrop);

    unselectAll();
    checkClipboard();
    updateNavBar();
}

function initLogin()
{
    sh.push("main-page", function () { }, true);
    showLoginDialog();
}
