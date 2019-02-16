"use strict";

var files = { };

(function ()
{
    var m_page;
    var m_navBar;
    var m_currentUri = "";

    var m_miClipboardCut;
    var m_miClipboardCopy;
    var m_miClipboardPaste;
    var m_miClipboardShow;
    
    var m_miDownload;
    var m_miDelete;
    var m_miRename;

    var m_miSelectAll;
    var m_miUnselectAll;
    
    var m_clipboard = [];
    var m_favorites = [];
    var m_shares = [];


    /* Returns a list of URIs by MIME type.
     */
    files.filesByMimetype = function (pattern)
    {
        var result = [];
        var items = m_page.find(".fileitem");

        for (var i = 0; i < items.length; ++i)
        {
            var item = items[i];
            var mimeType = $(item).data("meta").mimeType;
            var uri = $(item).data("meta").uri;
            if (mimeType.startsWith(pattern))
            {
                result.push(uri);
            }
        }

        return result;
    };


    /* Adds the current location to the favorites menu.
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

        var name = extractName(m_currentUri);
        var uri = m_currentUri;
        m_favorites.push({ name: name, uri: uri });
        storage.store("favorites", m_favorites, function () { });
    }

    /* Removes the current location from the favorites menu.
     */
    function removeFavorite()
    {
        var uri = m_currentUri;
        m_favorites = m_favorites.filter(function (a)
        {
            return a.uri !== uri;
        });
        storage.store("favorites", m_favorites, function () { });
    }

    function showShareDialog()
    {
        var dlg = ui.showDialog("Setup Share", "Share this directory.");
        var loginEntry = dlg.addTextEntry("Share Login:", "");
        var passwordEntry = dlg.addTextEntry("Share Password:", "");
        dlg.addButton("Share", function ()
        {
            share(loginEntry.val(), passwordEntry.val());
        }, true);
        dlg.addButton("Cancel");
    }

    function share(shareId, password)
    {
        var targetUri = m_currentUri;
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
            loadDirectory(m_currentUri, false);
        });
    }

    function unshare()
    {
        var targetUri = m_currentUri;
        $.ajax({
            type: "POST",
            url: "/unshare/",
            beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
        })
        .done(function (data, status, xhr)
        {
            loadDirectory(m_currentUri, false);
        });
    }


    function makeNewDirectory()
    {
        var dlg = ui.showDialog("New Directory", "Create a new directory.");
        var entry = dlg.addTextEntry("Name:", "");
        dlg.addButton("Create", function ()
        {
            var name = entry.val();
            if (name !== "")
            {
                var targetUri = m_currentUri + "/" + encodeURIComponent(name);
                file.mkdir(targetUri, function (ok)
                {
                    if (ok)
                    {
                        loadDirectory(m_currentUri, false);    
                    }
                    else
                    {
                        ui.showError("Failed to create directory: " + name);
                    }
                });
            }
            else
            {
                ui.showError("Invalid name.");
            }
        }, true);
        dlg.addButton("Cancel");
    }

    function makeNewFile()
    {
        var dlg = ui.showDialog("New File", "Create a new file.");
        var entry = dlg.addTextEntry("Name:", "");
        dlg.addButton("Create", function ()
        {
            var name = entry.val();
            if (name !== "")
            {
                var targetUri = m_currentUri + "/" + encodeURIComponent(name);
                file.create(targetUri, function (ok)
                {
                    if (ok)
                    {
                        loadDirectory(m_currentUri, false);
                    }
                    else
                    {
                        ui.showError("Failed to create file: " + name);
                    }
                });
            }
            else
            {
                ui.showError("Invalid name.");
            }
        }, true);
        dlg.addButton("Cancel");
    }

    function loadThumbnails()
    {
        console.log("Location: " + m_currentUri);

        var items = [];
        m_page.find(".fileitem").each(function (idx)
        {
            var item = $(this);
            var mimeType = item.data("meta").mimeType;
    
            if (mimeType.startsWith("image/") ||
                mimeType.startsWith("audio/") ||
                mimeType === "video/mp4" ||
                mimeType === "video/webm")
            {
                items.push(this);
            }
        });
    
        console.log("loadThumbnails: " + items.length + " images");
        loadNextThumbnail(m_currentUri, items);
    }

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
        var img = $(item).find(".sh-left");
        var thumbnailUri = "/::thumbnail" + $(item).data("meta").uri;
    
        var now = Date.now();
        var statusEntry = ui.pushStatus("sh-icon-wait", name);
    
        var settings = {
            beforeSend: function (xhr)
            {
                 xhr.overrideMimeType("text/plain; charset=x-user-defined");
                 xhr.setRequestHeader("x-pilvini-width", 80);
                 xhr.setRequestHeader("x-pilvini-height", 80);
            }
        };
    
        $.ajax(thumbnailUri, settings)
        .done(function (data, status, xhr)
        {
            if (xhr.status === 200)
            {
                var contentType = "image/jpeg"; //xhr.getResponseHeader("Content-Type");
                if (thumbnailUri.toLowerCase().endsWith(".svg"))
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
    
                if (m_currentUri === forLocation)
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
                    var thumbnailUri = "/::thumbnail" + $(item).data("meta").uri;
                    submitThumbnail("image/jpeg", data, thumbnailUri, function (ok)
                    {
                        statusEntry.remove();
                        if (ok)
                        {
                            items.unshift(item);
                        }
                        if (m_currentUri === forLocation)
                        {
                            loadNextThumbnail(forLocation, items);
                        }
                    });
                });
            }
        })
        .fail(function ()
        {
            if (m_currentUri === forLocation)
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
        var mimeType = $(item).data("meta").mimeType;
        if (mimeType.indexOf("video/") === 0)
        {
            var sourceUri = $(item).data("meta").uri;
            generateVideoThumbnail(sourceUri, callback);
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

    function downloadItem(item)
    {
        var meta = $(item).data("meta");
    
        var downloader = $("#download");
        downloader.attr("href", meta.uri);
        downloader.attr("download", meta.mimeType === "application/x-folder" ? meta.name + ".zip"
                                                                             : meta.name);
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

    function renameItem(item)
    {
        var meta = $(item).data("meta");
        var name = meta.name;

        var dlg = ui.showDialog("Rename File", "Rename the file.");
        var entry = dlg.addTextEntry("Name:", name);
        dlg.addButton("Rename", function ()
        {
            var newName = entry.val();
            var targetUri = m_currentUri + "/" + encodeURIComponent(newName);

            file.move(meta.uri, targetUri, function (ok)
            {
                if (ok)
                {
                    console.log("File moved: " + name + " -> " + newName);
                    $(item).find("h1").html(escapeHtml(newName));
                    loadDirectory(m_currentUri, false);    
                }
                else
                {
                    ui.showError("Failed to move: " + name + " -> " + newName);
                }
            });
        }, true);
        dlg.addButton("Cancel");
    }

    function removeSelected()
    {
        function yesCb()
        {
            eachSelected(removeItem)();
        }
    
        function noCb()
        {
    
        }
    
        ui.showQuestion("Delete", "Delete these entries?", yesCb, noCb);
    }

    function removeItem(item)
    {
        var meta = $(item).data("meta");
        var name = meta.name;
        var targetUri = meta.uri;
    
        file.remove(targetUri, function (ok)
        {
            if (ok)
            {
                $(item).remove();
                updateNavBar();
            }
            else
            {
                ui.showError("Failed to remove: " + name);
            }
        });
    }

    function selectAll()
    {
        m_page.find(".fileitem > div.sh-right").addClass("sh-selected");
        checkSelected();
    }

    function unselectAll()
    {
        m_page.find(".fileitem > div.sh-right").removeClass("sh-selected");
        checkSelected();        
    }

    function toggleSelect(item)
    {
        $(item).toggleClass("sh-selected");
        checkSelected();
    }

    function checkSelected()
    {
        var size = m_page.find(".fileitem > div.sh-right.sh-selected").length;

        m_miClipboardCut.setEnabled(size > 0);
        m_miClipboardCopy.setEnabled(size > 0);

        m_miDownload.setEnabled(size > 0);
        m_miDelete.setEnabled(size > 0);
        m_miRename.setEnabled(size === 1);

        m_miUnselectAll.setEnabled(size > 0);
    }

    function eachSelected(callback)
    {
        return function ()
        {
            var items = m_page.find(".fileitem > div.sh-right.sh-selected");
            items.each(function ()
            {
                callback($(this).parent());
            });
            unselectAll();
        };
    }

    function openPathMenu()
    {
        var menu = new ui.Menu();

        var favsMenu = new ui.SubMenu("Favorites");
        menu.addSubMenu(favsMenu);

        if (m_favorites.find(function (a) { return a.uri === m_currentUri; }))
        {
            favsMenu.addItem(new ui.MenuItem("", "Remove from Favorites", removeFavorite));
        }
        else
        {
            favsMenu.addItem(new ui.MenuItem("", "Add to Favorites", addFavorite));
        }
        favsMenu.addSeparator();
        m_favorites.forEach(function (f)
        {
            favsMenu.addItem(new ui.MenuItem("sh-icon-star-circle", f.name, function ()
            {
                loadDirectory(f.uri, true);
            }));
        });

        var sharesMenu = new ui.SubMenu("Shares");
        menu.addSubMenu(sharesMenu);

        console.log(m_shares);
        if (m_shares.find(function (a) { return a.uri === m_currentUri; }))
        {
            sharesMenu.addItem(new ui.MenuItem("", "Unshare This", unshare));
        }
        else
        {
            sharesMenu.addItem(new ui.MenuItem("", "Share This", showShareDialog));
        }
        sharesMenu.addSeparator();
        m_shares.forEach(function (s)
        {
            sharesMenu.addItem(new ui.MenuItem("sh-icon-share", s.share, function ()
            {
                loadDirectory(s.uri, true);
            }));
        });

        menu.addSeparator();
        var menuItem = new ui.MenuItem("", "/", function ()
        {
            menu.close();
            loadDirectory("/", true);
        });
        menu.addItem(menuItem);

        var parts = m_currentUri.split("/");
        var breadcrumbUri = "";
        for (var i = 0; i < parts.length; ++i)
        {
            if (parts[i] === "")
            {
                continue;
            }

            breadcrumbUri += "/" + parts[i];
            menuItem = new ui.MenuItem("", decodeURI(parts[i]), function (uri)
            {
                return function ()
                {
                    loadDirectory(uri, true);
                };
            }(breadcrumbUri));
            menu.addItem(menuItem);
        }

        menu.popup(m_page.find("> header h1"));
    }

    function setupNavBar()
    {
        var navBar = $(tag("div").class("files-navbar")
                       .style("position", "absolute")
                       .style("top", "0")
                       .style("left", "0")
                       .style("width", "32px")
                       .style("height", "100%")
                       .style("background-color", "var(--color-primary)")
                       .style("color", "var(--color-primary-background)")
                       .style("text-align", "center")
                       .style("font-weight", "bold")
                       .html()
        );

        m_page.find("> section").append(navBar);

        navBar.on("mousedown", function (event)
        {
            this.pressed = true;
    
            var percents = (event.clientY - $(this).offset().top) /
                           ($(window).height() - $(this).offset().top);
            $(document).scrollTop(($(document).height() - $(window).height()) * percents);
        });
    
        navBar.on("mouseup", function (event)
        {
            this.pressed = false;
        });
    
        navBar.on("mouseleave", function (event)
        {
            this.pressed = false;
        });
    
        navBar.on("mousemove", function (event)
        {
            if (this.pressed)
            {
                var percents = (event.clientY - $(this).offset().top) /
                               ($(window).height() - $(this).offset().top);
                $(document).scrollTop(($(document).height() - $(window).height()) * percents);
            }
        });

        // quite an effort to work around quirks in certain touch browsers

        navBar.on("touchstart", function (event)
        {
            var scrollBegin = $(document).scrollTop();
            m_page.addClass("sh-page-transitioning");
            m_page.find("> section").scrollTop(scrollBegin);
            this.touchContext = {
                top: $(this).offset().top,
                scrollBegin: scrollBegin,
                scrollTarget: 0
            };
        });

        navBar.on("touchend", function (event)
        {
            m_page.find("> section").css("margin-top", 0);
            m_page.removeClass("sh-page-transitioning");
            if (this.touchContext.scrollTarget > 0)
            {
                $(document).scrollTop(this.touchContext.scrollTarget);
            }    
        });

        navBar.on("touchmove", function (event)
        {
            event.preventDefault();
            
            var percents = (event.originalEvent.touches[0].clientY - this.touchContext.top) /
                        ($(window).height() - this.touchContext.top);
            percents = Math.max(0, Math.min(1, percents));

            var scrollTop = (navBar.height() + m_page.find("> header").height() - $(window).height()) * percents;

            m_page.find("> section").css("margin-top", (-scrollTop) + "px");
            this.touchContext.scrollTarget = scrollTop;        
        });
    }

    function updateNavBar()
    {
        var navBar = m_page.find(".files-navbar");
        navBar.html("");

        var items = m_page.find(".fileitem");
        var currentLetter = "";
        for (var i = 0; i < items.length; ++i)
        {
            var item = $(items[i]);
            var letter = item.find("h1").html()[0].toUpperCase();
    
            if (letter !== currentLetter)
            {
                navBar.append(
                    tag("span")
                    .style("position", "absolute")
                    .style("top", (item.offset().top - m_page.find("> header").height()) + "px")
                    .style("left", "0")
                    .style("right", "0")
                    .content(letter)
                    .html()
                )
                currentLetter = letter;
            }
        }

        var h1 = $(window).height() - m_page.find("> header").height() - 1;
        if (navBar.height() < h1)
        {
            navBar.height(h1);
        }
    }

    function loadDirectory(uri, pushToHistory)
    {
        var busyIndicator = ui.showBusyIndicator("Loading");

        scrollPositionsMap[m_currentUri] = $(document).scrollTop();

        m_page.find("> section").html("");

        $.ajax({
            type: "GET",
            url: "/::shell" + uri + "?json",
            dataType: "json"
        })
        .done(function (data, status, xhr)
        {
            if (pushToHistory)
            {
                window.history.pushState({ "uri": uri }, uri, "/::shell" + uri);
            }
            showDirectory(data);
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Failed to load directory.");
        })
        .always(function ()
        {
            busyIndicator.remove();
        });

    }

    function showDirectory(data)
    {
        var files = data.files || [];
        files.sort(function (a, b)
        {
            if (a.name < b.name)
            {
                return -1;
            }
            else if (a.name > b.name)
            {
                return 1;
            }
            else
            {
                return 0;
            }
        });
    
        var listView = $(
            tag("ul").class("sh-listview")
            .style("margin-left", "32px")
            .html()
        );
        files.forEach(function (entry)
        {
            var item = ui.listItem(entry.name, entry.info, function ()
            {
                viewFile(this);
            });
            item.addClass("fileitem");
            item.data("meta", entry);
            item.setAction("sh-icon-checked-circle", function ()
            {
                toggleSelect(item.find(".sh-right"));
            });
            if (entry.icon)
            {
                item.setIcon(entry.icon);
            }
            listView.append(item);
        });

        m_currentUri = data.uri;
        m_shares = data.shares;
        var filesBox = m_page.find("> section");

        setupNavBar();
        filesBox.append(listView);
        m_page.setTitle(decodeURI(data.uri));

        setTimeout(function () { loadThumbnails(); }, 500);
        updateNavBar();
        checkSelected();
        checkClipboard();
    }

    function cdUp()
    {
        var parts = m_currentUri.split("/");
        var parentUri = parts.slice(0, parts.length - 1).join("/");
        loadDirectory(parentUri, true);
    }

    function checkClipboard()
    {
        var size = m_clipboard.length;

        m_miClipboardPaste.setEnabled(size > 0);
        m_miClipboardShow.setEnabled(size > 0);
    }

    function cutToClipboard(item)
    {
        var meta = $(item).data("meta");
        var sourceUri = meta.uri;
        var targetUri = "/.pilvini/clipboard/" + encodeURIComponent(meta.name);
    
        file.move(sourceUri, targetUri, function (ok)
        {
            if (ok)
            {
                m_clipboard.push(meta);
                $(item).remove();
                updateNavBar();
                checkClipboard();
            }
            else
            {
                ui.showError("Failed to cut: " + meta.name);
            }
        });
    }

    function copyToClipboard(item)
    {
        var meta = $(item).data("meta");
        var sourceUri = meta.uri;
        var targetUri = "/.pilvini/clipboard/" + encodeURIComponent(meta.name);

        var statusEntry = ui.pushStatus("sh-icon-clipboard", "Copying " + meta.name);

        file.copy(sourceUri, targetUri, function (ok)
        {
            if (ok)
            {
                m_clipboard.push(meta);
                checkClipboard();
            }
            else
            {
                ui.showError("Failed to copy: " + meta.name);
            }
            statusEntry.remove();
        });
    }

    function pasteFromClipboard()
    {
        var count = m_clipboard.length;

        m_clipboard.forEach(function (meta)
        {
            var sourceUri = meta.uri;
            var targetUri = m_currentUri + "/" + encodeURIComponent(meta.name);

            file.move(sourceUri, targetUri, function (ok)
            {
                if (! ok)
                {
                    ui.showError("Failed to paste: " + meta.name);
                }

                --count;
                if (count === 0)
                {
                    m_clipboard = [];
                    loadDirectory(m_currentUri, false);
                }
            });
        });
    }

    function loadClipboard()
    {
        $.ajax({
            type: "GET",
            url: "/::shell/.pilvini/clipboard?json",
            dataType: "json"
        })
        .done(function (data, status, xhr)
        {
            m_clipboard = data.files;
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Failed to load clipboard contents.");
        });
    }

    function openClipboardPage()
    {
        var clipboardPage = ui.showPage("Clipboard");

        clipboardPage.find("> section").html("");
        var listView = $(
            tag("ul").class("sh-listview")
            .html()
        );

        m_clipboard.forEach(function (entry)
        {
            var item = ui.listItem(entry.name, entry.info, function () { });
            if (entry.icon)
            {
                item.setIcon(entry.icon);
            }
            listView.append(item);
        });

        var filesBox = clipboardPage.find("> section");
        filesBox.append(listView);
    }


    m_page = ui.showPage("", cdUp);
    m_page.find("> header > h1").on("click", openPathMenu);
    m_page.addIconButton("sh-icon-menu", function ()
    {
        actionsMenu.popup($(this));
    });
    m_page.append($(
        tag("footer").class("sh-dropshadow")
        .html()
    ));

    actionsMenu = new ui.Menu();
    var subMenuNew = new ui.SubMenu("New");
    subMenuNew.addItem(new ui.MenuItem("sh-icon-folder", "Directory", makeNewDirectory));
    subMenuNew.addItem(new ui.MenuItem("sh-icon-file", "File", makeNewFile));
    actionsMenu.addSubMenu(subMenuNew);
    
    var subMenuClipboard = new ui.SubMenu("Clipboard");
    m_miClipboardCut = new ui.MenuItem("sh-icon-clipboard-cut", "Cut", eachSelected(cutToClipboard));
    subMenuClipboard.addItem(m_miClipboardCut);
    m_miClipboardCopy = new ui.MenuItem("sh-icon-clipboard-copy", "Copy", eachSelected(copyToClipboard));
    subMenuClipboard.addItem(m_miClipboardCopy);;
    m_miClipboardPaste = new ui.MenuItem("sh-icon-clipboard-paste", "Paste", pasteFromClipboard);
    subMenuClipboard.addItem(m_miClipboardPaste);
    m_miClipboardShow = new ui.MenuItem("sh-icon-clipboard", "Show", openClipboardPage);
    subMenuClipboard.addItem(m_miClipboardShow);
    actionsMenu.addSubMenu(subMenuClipboard);
    
    var subMenuAction = new ui.SubMenu("Action");
    subMenuAction.addItem(new ui.MenuItem("sh-icon-cloud-upload", "Upload"));
    m_miDownload = new ui.MenuItem("sh-icon-download", "Download", eachSelected(downloadItem));
    subMenuAction.addItem(m_miDownload);
    m_miRename = new ui.MenuItem("sh-icon-rename", "Rename", eachSelected(renameItem));
    subMenuAction.addItem(m_miRename);
    m_miDelete = new ui.MenuItem("sh-icon-trashcan", "Delete", removeSelected);
    subMenuAction.addItem(m_miDelete);
    actionsMenu.addSubMenu(subMenuAction);

    m_miSelectAll = new ui.MenuItem("", "Select All", selectAll);
    actionsMenu.addItem(m_miSelectAll);
    m_miUnselectAll = new ui.MenuItem("", "Unselect All", unselectAll);
    actionsMenu.addItem(m_miUnselectAll);


    /* setup history navigation */
    window.addEventListener("popstate", function (ev)
    {
        if (ev.state && ev.state.uri)
        {
            loadDirectory(ev.state.uri, false);
        }
    }, false);

    loadDirectory("/", true);
    loadClipboard();

    storage.load("favorites", function (data)
    {
        m_favorites = data || [];
    });


    mimeRegistry.register("application/x-folder", function (uri)
    {
        loadDirectory(uri, true);
    });

    mimeRegistry.register("application/zip", function (uri)
    {
        loadDirectory(uri, true);
    });
})();
