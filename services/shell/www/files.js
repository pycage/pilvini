"use strict";

const mods = [
    "/::res/shellfish/core/low.js",
    "/::res/shellfish/core/mid.js",
    "/::res/shellfish/core/high.js",
    __dirname + "/ui.js",
    __dirname + "/configuration.js",
    __dirname + "/mime-registry.js"
];

require(mods, function (low, mid, high, ui, cfg, mimeReg)
{
    console.log("using configuration");
    var configuration = cfg.configuration;
    var mimeRegistry = mimeReg.mimeRegistry;

    var m_page = null;
    var m_listView = null;
    var m_actionsMenu = null;
    var m_properties = { };
   
    var m_scrollPositionsMap = { };

    var m_logItem = null;


    /* Opens the given file item.
     */
    function openFile(item)
    {
        var mimeType = item.mimeType;
        var uri = item.uri;

        var handlers = mimeRegistry.fileHandlers(mimeType);
        if (handlers.length === 0)
        {
            ui.showError("There is no handler available for this type: " + mimeType);
        }
        else
        {
            handlers[0](uri);
        }
    }
    exports.openFile = openFile;

    /* Returns the current location.
     */
    function currentUri()
    {
        return m_properties.currentUri.value();
    }
    exports.currentUri = currentUri;

    /* Returns the actions menu.
     */
    function actionsMenu()
    {
        return m_actionsMenu;
    }
    exports.actionsMenu = actionsMenu;

    /* Returns a list of URIs by MIME type.
     */
    function filesByMimetype(pattern)
    {
        return m_properties.files.value().filter(function (meta)
        {
            return meta.mimeType.startsWith(pattern);
        })
        .map(function (meta)
        {
            return meta.uri;
        });
    }
    exports.filesByMimetype = filesByMimetype;

    function eachSelected(callback)
    {
        return function ()
        {
            var sel = m_properties.selection.value().slice();
            sel.sort(function (a, b) { return Number.parseInt("" + a) - Number.parseInt("" + b); });
            sel.forEach(function (idx)
            {
                callback(idx);
            });
            unselectAll();
        };
    }
    exports.eachSelected = eachSelected;

    /* Pushes the given item into the status box.
     */
    function pushStatus(item)
    {
        m_page.footer.push(item);
        m_page.updateGeometry();
        updateNavBar();
    }
    exports.pushStatus = pushStatus;

    /* Removes the given item from the status box.
     */
    function popStatus(item)
    {
        item.get().remove();
        m_page.updateGeometry();
        updateNavBar();
    }
    exports.popStatus = popStatus;

    function properties()
    {
        return m_properties;
    }
    exports.properties = properties;

    function log(message)
    {
        if (! m_logItem)
        {
            m_logItem = high.element(ui.StatusItem).text(message).get();
            pushStatus(m_logItem)
        }
        else
        {
            m_logItem.text = message;
        }
    }

    function joinPath(a, b)
    {
        return a.endsWith("/") ? a + b
                               : a + "/" + b;
    }

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

        var name = extractName(m_properties.currentUri.value());
        var uri = m_properties.currentUri.value();
        var favs = configuration.get("favorites", []);
        favs.push({ name: name, uri: uri });
        configuration.set("favorites", favs);
        m_properties.configuration.update();
        loadDirectory(m_properties.currentUri.value(), false);
    }

    /* Removes the current location from the favorites menu.
     */
    function removeFavorite()
    {
        var uri = m_properties.currentUri.value();
        var favs = configuration.get("favorites", []);
        favs = favs.filter(function (a)
        {
            return a.uri !== uri;
        });
        configuration.set("favorites", favs);
        m_properties.configuration.update();
        loadDirectory(m_properties.currentUri.value(), false);
    }

    function setSortMode(mode)
    {
        configuration.set("sort-mode", mode);
        m_properties.configuration.update();
        m_scrollPositionsMap = { };
        loadDirectory(m_properties.currentUri.value(), false);
    }

    function setViewMode(mode)
    {
        configuration.set("view-mode", mode);
        m_properties.configuration.update();
        m_scrollPositionsMap = { };
        loadDirectory(m_properties.currentUri.value(), false);
    }

    function showShareDialog()
    {
        var dlg = high.element(mid.Dialog).title("Setup Share")
        .add(
            high.element(mid.Label).text("Share this directory.")
        )
        .add(
            high.element(mid.Labeled).text("Share Login:")
            .add(
                high.element(mid.TextInput).id("login").focus(true)
            )
        )
        .add(
            high.element(mid.Labeled).text("Share Password:")
            .add(
                high.element(mid.TextInput).id("password")
            )
        )
        .button(
            high.element(mid.Button).text("Share").isDefault(true)
            .action(function ()
            {
                dlg.close_();
                share(dlg.find("login").get().text,
                      dlg.find("password").get().text);
            })
        )
        .button(
            high.element(mid.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        );

        dlg.show_();
    }

    function share(shareId, password)
    {
        var targetUri = m_properties.currentUri.value();
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
            loadDirectory(m_properties.currentUri.value(), false);
        });
    }

    function unshare()
    {
        var targetUri = m_properties.currentUri.value();
        $.ajax({
            type: "POST",
            url: "/unshare/",
            beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
        })
        .done(function (data, status, xhr)
        {
            loadDirectory(m_properties.currentUri.value(), false);
        });
    }


    function makeNewDirectory()
    {
        var dlg = high.element(mid.Dialog).title("New Directory")
        .add(
            high.element(mid.Label).text("Create a new directory.")
        )
        .add(
            high.element(mid.Labeled).text("Name:")
            .add(
                high.element(mid.TextInput).id("name").focus(true)
            )
        )
        .button(
            high.element(mid.Button).text("Create").isDefault(true)
            .action(function ()
            {
                dlg.close_();
                var name = dlg.find("name").get().text;
                if (name !== "")
                {
                    var targetUri = joinPath(m_properties.currentUri.value(), encodeURIComponent(name));
                    file.mkdir(targetUri, function (ok)
                    {
                        if (ok)
                        {
                            loadDirectory(m_properties.currentUri.value(), false);    
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
            })
        )
        .button(
            high.element(mid.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        );
        dlg.show_();
    }

    function makeNewFile()
    {
        var dlg = high.element(mid.Dialog).title("New File")
        .add(
            high.element(mid.Label).text("Create a new file.")
        )
        .add(
            high.element(mid.Labeled).text("Name:")
            .add(
                high.element(mid.TextInput).id("name").focus(true)
            )
        )
        .button(
            high.element(mid.Button).text("Create").isDefault(true)
            .action(function ()
            {
                dlg.close_();
                var name = dlg.find("name").get().text;
                if (name !== "")
                {
                    var targetUri = joinPath(m_properties.currentUri.value(), encodeURIComponent(name));
                    file.create(targetUri, function (ok)
                    {
                        if (ok)
                        {
                            loadDirectory(m_properties.currentUri.value(), false);
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
            })
        )
        .button(
            high.element(mid.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        );
        dlg.show_();
    }

    function loadThumbnails()
    {
        function loadNextThumbnail(forContext, items)
        {
            if (items.length === 0)
            {
                popStatus(statusEntry);
                statusEntry = null;
                return;
            }
        
            // sort images by visibility to load those in view first
            var topPos = $(document).scrollTop();
            var bottomPos = topPos + $(window).height();
        
            items.sort(function (a, b)
            {
                var itemA = m_listView.item(a);
                var itemB = m_listView.item(b);
    
                var aPos = itemA.get().offset().top;
                var bPos = itemB.get().offset().top;
                var aHeight = itemA.get().height();
                var bHeight = itemB.get().height();
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
        
            var idx = items.shift();
            var meta = m_properties.files.value()[idx];
            if (! meta)
            {
                if (m_properties.currentContext.value() === forContext)
                {
                    loadNextThumbnail(forContext, items);
                }
                return;
            }
            var name = meta.name;
            var thumbnailUri = "/::thumbnail" + meta.uri;
        
            var now = Date.now();
            statusEntry.text = "Preview: " + name;
            statusEntry.progress = 100 * (totalItems - items.length - 1) / totalItems;
        
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
                if (m_properties.currentContext.value() !== forContext)
                {
                    return;
                }

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
                    m_listView.item(idx).icon = pic;
                    m_listView.item(idx).fillMode = "cover";
            
                    var speed = Math.ceil((data.length / 1024) / ((then - now) / 1000.0));
                    console.log("Loading took " + (then - now) + " ms, size: " + data.length + " B (" + speed + " kB/s).");
        
                    if (m_properties.currentContext.value() === forContext)
                    {
                        loadNextThumbnail(forContext, items);
                    }
                }
                else if (xhr.status === 204)
                {
                    // create thumbnail client-side, send to server, and retry           
                    generateThumbnail(meta, function (data)
                    {
                        var thumbnailUri = "/::thumbnail" + meta.uri;
                        submitThumbnail("image/jpeg", data, thumbnailUri, function (ok)
                        {
                            if (ok)
                            {
                                items.unshift(idx);
                            }
                            if (m_properties.currentContext.value() === forContext)
                            {
                                loadNextThumbnail(forContext, items);
                            }
                        });
                    });
                }
            })
            .fail(function ()
            {
                if (m_properties.currentContext.value() === forContext)
                {
                    loadNextThumbnail(forContext, items);
                }
            });
        }

        /* Generates a client-side thumbnail.
         */
        function generateThumbnail(meta, callback)
        {
            var mimeType = meta.mimeType;
            if (mimeType.indexOf("video/") === 0)
            {
                var sourceUri = meta.uri;
                generateVideoThumbnail(sourceUri, callback);
            }
            else
            {
                callback("");
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

            if (navigator.userAgent.indexOf("Mobile") !== -1)
            {
                callback("");
                return;
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

                    // prettify

                    ctx.fillStyle = "#666";
                    ctx.fillRect(0, 0, 10, 80);
                    ctx.fillRect(80 - 10, 0, 16, 80);

                    ctx.fillStyle = "#fff";
                    for (var y = 0; y < 80; y += 10)
                    {
                        ctx.fillRect(2, y + 3, 6, 4);
                        ctx.fillRect(80 - 8, y + 3, 6, 4);
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


        console.log("Location: " + m_properties.currentUri.value());

        var items = [];
        for (var idx = 0; idx < m_properties.files.value().length; ++idx)
        {
            var mimeType = m_properties.files.value()[idx].mimeType;

            if (mimeType.startsWith("image/") ||
                mimeType.startsWith("audio/") ||
                mimeType === "video/mp4" ||
                mimeType === "video/webm")
            {
                items.push(idx);
            }
        }

        if (items.length === 0)
        {
            return;
        }
        console.log("loadThumbnails: " + items.length + " images");

        var totalItems = items.length;
        var statusEntry = high.element(ui.StatusItem).icon("sh-icon-wait").get();
        pushStatus(statusEntry);
        var watchHandle = m_properties.currentContext.watch(function ()
        {
            watchHandle.unwatch();
            if (statusEntry)
            {
                popStatus(statusEntry);
            }
        });
        
        loadNextThumbnail(m_properties.currentContext.value(), items);
    }



    function downloadItem(idx)
    {
        var meta = m_properties.files.value()[idx];
    
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

    function renameItem(idx)
    {
        var meta = m_properties.files.value()[idx];
        var name = meta.name;

        var dlg = high.element(mid.Dialog).title("Rename File")
        .add(
            high.element(mid.Label).text("Rename the file.")
        )
        .add(
            high.element(mid.Labeled).text("Name:")
            .add(
                high.element(mid.TextInput).id("name").text(name).focus(true)
            )
        )
        .button(
            high.element(mid.Button).text("Rename").isDefault(true)
            .action(function ()
            {
                dlg.close_();
                var newName = dlg.find("name").get().text;
                var targetUri = joinPath(m_properties.currentUri.value(), encodeURIComponent(newName));
    
                file.move(meta.uri, targetUri, function (ok)
                {
                    if (ok)
                    {
                        console.log("File moved: " + name + " -> " + newName);
                        m_listView.item(idx).title = newName;
                        loadDirectory(m_properties.currentUri.value(), false);    
                    }
                    else
                    {
                        ui.showError("Failed to move: " + name + " to " + newName);
                    }
                }); 
            })
        )
        .button(
            high.element(mid.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        );
        dlg.show_();
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

    function removeItem(idx)
    {
        var meta = m_properties.files.value()[idx];
        var name = meta.name;
        var targetUri = meta.uri;
    
        file.remove(targetUri, function (ok)
        {
            if (ok)
            {
                m_listView.item(idx).get().remove();
                updateNavBar();
            }
            else
            {
                ui.showError("Failed to remove: " + name);
            }
        });
    }

    function bulkRename()
    {
        function padZero(n, amount)
        {
            var s = "" + n;
            while (s.length < amount) s = "0" + s;
            return s;
        }

        var dlg = high.element(mid.Dialog).title("Bulk-Rename")
        .add(
            high.element(mid.Label).text("Rename the selected files.")
        )
        .add(
            high.element(mid.Label).text("- <N>: Number (prepend 0 for leading zeros, e.g. <00N>)")
        )
        .add(
            high.element(mid.Label).text("- <NAME>: File name without extension")
        )
        .add(
            high.element(mid.Label).text("- <EXT>: File extension")
        )
        .add(
            high.element(mid.Labeled).text("Pattern:")
            .add(
                high.element(mid.TextInput).id("pattern").focus(true)
                .text("<00N> <NAME>.<EXT>")
            )
        )
        .add(
            high.element(mid.Labeled).text("Start N at:")
            .add(
                high.element(mid.TextInput).id("startAt")
                .text("1")
            )
        )
        .button(
            high.element(mid.Button).text("Rename").isDefault(true)
            .action(function ()
            {
                dlg.close_();
                var pattern = dlg.find("pattern").get().text;
                var startAt = Number.parseInt(dlg.find("startAt").get().text);

                var sel = m_properties.selection.value().slice();
                sel.sort(function (a, b) { return Number.parseInt("" + a) - Number.parseInt("" + b); });
                
                var n = startAt;
                var remaining = sel.length;
                var failures = 0;

                sel.forEach(function (idx)
                {
                    var meta = m_properties.files.value()[idx];

                    var fullName = meta.name;
                    var name = fullName;
                    var ext = "";

                    var pos = fullName.lastIndexOf(".");
                    if (pos !== -1)
                    {
                        name = fullName.substr(0, pos);
                        ext = fullName.substr(pos + 1);
                    }
                    
                    var newName = pattern.replace(/<N>/g, padZero(n, 1))
                                         .replace(/<0N>/g, padZero(n, 2))
                                         .replace(/<00N>/g, padZero(n, 3))
                                         .replace(/<000N>/g, padZero(n, 4))
                                         .replace(/<0000N>/g, padZero(n, 5))
                                         .replace(/<NAME>/g, name)
                                         .replace(/<EXT>/g, ext);

                    ++n;
                    var targetUri = joinPath(m_properties.currentUri.value(), encodeURIComponent(newName));
    
                    file.move(meta.uri, targetUri, function (ok)
                    {
                        if (ok)
                        {
                            console.log("File moved: " + name + " -> " + newName);
                            m_listView.item(idx).title = newName;
                        }
                        else
                        {
                            ++failures;
                            //ui.showError("Failed to move: " + name + " to " + newName);
                        }
                        
                        --remaining;
                        if (remaining === 0)
                        {
                            loadDirectory(m_properties.currentUri.value(), false);
                        }

                    }); 
                });
            unselectAll();
            })
        )
        .button(
            high.element(mid.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        )
        dlg.show_();
    }

    function selectAll()
    {
        var sel = [];
        for (var idx = 0; idx < m_properties.files.value().length; ++idx)
        {
            sel.push(idx);
            m_listView.item(idx).selected = true;
        }
        m_properties.selection.assign(sel);
    }

    function unselectAll()
    {
        m_properties.selection.value().forEach(function (idx)
        {
            m_listView.item(idx).selected = false;
        });
        m_properties.selection.assign([]);
    }

    function openPathMenu()
    {
        var favs = configuration.get("favorites", []);
        var isFav = !! favs.find(function (a) { return a.uri === m_properties.currentUri.value(); });
        var isShare = !! m_properties.shares.value().find(function (a) { return a.uri === m_properties.currentUri.value(); });

        console.log(JSON.stringify(m_properties.shares.value()) + " current " + m_properties.currentUri.value());

        var menu = high.element(mid.Menu)
        .add(
            high.element(mid.SubMenu).text("Favorites")
            .add(
                high.element(mid.MenuItem).text("Remove from Favorites")
                .visible(isFav)
                .onClicked(removeFavorite)
            )
            .add(
                high.element(mid.MenuItem).text("Add to Favorites")
                .visible(! isFav)
                .onClicked(addFavorite)
            )
            .add(
                high.element(mid.Separator)
            )
        )
        .add(
            high.element(mid.SubMenu).text("Shares")
            .visible(high.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("SHARE") !== -1; }))
            .add(
                high.element(mid.MenuItem).text("Unshare This")
                .visible(isShare)
                .onClicked(unshare)
            )
            .add(
                high.element(mid.MenuItem).text("Share This")
                .visible(! isShare)
                .onClicked(showShareDialog)
            )
            .add(
                high.element(mid.Separator)
            )
        )
        .add(
            high.element(mid.Separator)
        );

        favs.forEach(function (f)
        {
            menu.child(0).add(
                high.element(mid.MenuItem).text(f.name).icon("sh-icon-star-circle")
                .onClicked(function ()
                {
                    m_scrollPositionsMap = { };
                    loadDirectory(f.uri, true);
                })
            );
        });

        m_properties.shares.value().forEach(function (s)
        {
            menu.child(1).add(
                high.element(mid.MenuItem).text(s.share + " " + s.uri).icon("sh-icon-share")
                .onClicked(function ()
                {
                    m_scrollPositionsMap = { };
                    loadDirectory(s.uri, true);
                })
            );
        });

        menu.add(
            high.element(mid.MenuItem).text("/")
            .onClicked(function ()
            {
                m_scrollPositionsMap = { };
                loadDirectory("/", true);
            })
        );

        var parts = m_properties.currentUri.value().split("/");
        var breadcrumbUri = "";
        for (var i = 0; i < parts.length; ++i)
        {
            if (parts[i] === "")
            {
                continue;
            }

            breadcrumbUri += "/" + parts[i];
            menu.add(
                high.element(mid.MenuItem).text(decodeURIComponent(parts[i]))
                .onClicked(function (uri)
                {
                    return function ()
                    {
                        m_scrollPositionsMap = { };
                        loadDirectory(uri, true);
                    };
                }(breadcrumbUri))
            );
        }

        menu.get().popup(m_page.header.get());
    }

    function updateNavBar()
    {
        if (m_page.get().is(":visible"))
        {
            m_page.left.update();
        }
    }

    function loadDirectory(uri, pushToHistory)
    {
        var busyIndicator = high.element(mid.BusyPopup).text("Loading");
        busyIndicator.show_();

        m_scrollPositionsMap[m_properties.currentUri.value()] = $(document).scrollTop();

        $.ajax({
            type: "GET",
            url: "/::shell" + uri + "?json",
            dataType: "json"
        })
        .done(function (data, status, xhr)
        {
            m_page.get().find("> section").html("");
            if (pushToHistory)
            {
                window.history.pushState({ "uri": uri }, uri, "/::shell" + uri);
            }
            showDirectory(data);
        })
        .fail(function (xhr, status, err)
        {
            if (status === "parsererror")
            {
                window.location.reload();
            }
            else
            {
                ui.showError("Failed to read directory.");
            }
        })
        .always(function ()
        {
            busyIndicator.hide_();
        });

    }

    function showDirectory(data)
    {
        var files = (data.files || []).filter(function (f)
        {
            // don't show hiddens
            return ! f.name.startsWith(".");
        });
        files.sort(function (a, b)
        {
            if (a.mimeType === "application/x-folder" && b.mimeType !== "application/x-folder")
            {
                return -1;
            }
            else if (a.mimeType !== "application/x-folder" && b.mimeType === "application/x-folder")
            {
                return 1;
            }
            else
            {
                switch (configuration.get("sort-mode", "name"))
                {
                case "name":
                    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
                case "date":
                    return a.mtime < b.mtime ? -1 : 1;
                case "number":
                    return Number.parseInt(a.name) < Number.parseInt(b.name) ? -1 : 1;
                default:
                    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
                }
            }
        });
    
        switch (configuration.get("view-mode", "list"))
        {
        case "list":
            var listView = new mid.ListView();

            var count = 0;
            files.forEach(function (entry)
            {
                var info = "";
                if (entry.mimeType !== "application/x-folder")
                {
                    info += (entry.size / (1024 * 1024)).toFixed(2) + " MB, ";
                }
                var d = new Date(entry.mtime);
                info += d.toLocaleDateString() + " " + d.toLocaleTimeString();
                var item = new mid.ListItem();
                item.title = entry.name;
                item.subtitle = info;
                item.onClicked = function ()
                {
                    openFile(entry);
                };

                var idx = count;
                item.action = ["sh-icon-checked-circle", function ()
                {
                    item.selected = ! item.selected;
                    var sel = m_properties.selection.value().slice();
                    if (item.selected)
                    {
                        sel.push(idx);
                    }
                    else
                    {
                        var pos = sel.indexOf(idx);
                        if (pos !== -1)
                        {
                            sel.splice(pos, 1);
                        }
                    }
                    m_properties.selection.assign(sel);
                }];
                if (entry.icon)
                {
                    item.icon = entry.icon;
                }
                listView.add(item);
                item.get().addClass("fileitem");
                ++count;
            });
            m_page.add(listView);
            m_listView = listView;
            break;

        case "grid":
            var gridView = new mid.GridView();

            var count = 0;
            files.forEach(function (entry)
            {
                var item = new mid.GridItem();
                item.title = entry.name;
                item.onClicked = function ()
                {
                    openFile(entry);
                };

                var idx = count;
                item.action = ["sh-icon-checked-circle", function ()
                {
                    item.selected = ! item.selected;
                    var sel = m_properties.selection.value().slice();
                    if (item.selected)
                    {
                        sel.push(idx);
                    }
                    else
                    {
                        var pos = sel.indexOf(idx);
                        if (pos !== -1)
                        {
                            sel.splice(pos, 1);
                        }
                    }
                    m_properties.selection.assign(sel);
                }];
                if (entry.icon)
                {
                    item.icon = entry.icon;
                }
                gridView.add(item);
                item.get().addClass("fileitem");
                ++count;
            });
            m_page.add(gridView);
            m_listView = gridView;
            break;
        }


        m_properties.currentUri.assign(data.uri);
        m_properties.currentContext.assign(m_properties.currentContext.value() + 1);
        m_properties.files.assign(files);
        m_properties.selection.assign([]);
        m_properties.shares.assign(data.shares);
        m_properties.permissions.assign(data.permissions);

        document.title = "Pilvini - " + decodeURIComponent(data.uri);

        $(document).scrollTop(m_scrollPositionsMap[m_properties.currentUri.value()] || 0);

        setTimeout(function () { loadThumbnails(); }, 500);
        updateNavBar();
    }

    function cdUp()
    {
        var parts = m_properties.currentUri.value().split("/");
        var parentUri = parts.slice(0, parts.length - 1).join("/");
        loadDirectory(parentUri, true);
    }

    function cutToClipboard(idx)
    {
        var meta = m_properties.files.value()[idx];
        var sourceUri = meta.uri;
        var targetUri = "/.pilvini/clipboard/" + encodeURIComponent(meta.name);
    
        file.move(sourceUri, targetUri, function (ok)
        {
            if (ok)
            {
                var targetMeta = JSON.parse(JSON.stringify(meta));
                targetMeta.uri = targetUri;
                m_properties.clipboard.push(targetMeta);
                
                m_listView.item(idx).get().remove();
                //$(item).remove();
                updateNavBar();
            }
            else
            {
                ui.showError("Failed to cut: " + meta.name);
            }
        });
    }

    function copyToClipboard(idx)
    {
        var meta = m_properties.files.value()[idx];
        var sourceUri = meta.uri;
        var targetUri = "/.pilvini/clipboard/" + encodeURIComponent(meta.name);

        var statusEntry = high.element(ui.StatusItem).icon("sh-icon-clipboard").text("Copying " + meta.name).get();
        pushStatus(statusEntry);

        file.copy(sourceUri, targetUri, function (ok)
        {
            if (ok)
            {
                var targetMeta = JSON.parse(JSON.stringify(meta));
                targetMeta.uri = targetUri;
                m_properties.clipboard.push(targetMeta);
            }
            else
            {
                ui.showError("Failed to copy: " + meta.name);
            }
            popStatus(statusEntry);
        });
    }

    function pasteFromClipboard()
    {
        var count = m_properties.clipboard.value().length;

        m_properties.clipboard.value().forEach(function (meta)
        {
            var sourceUri = meta.uri;
            var targetUri = joinPath(m_properties.currentUri.value(), encodeURIComponent(meta.name));

            file.move(sourceUri, targetUri, function (ok)
            {
                if (! ok)
                {
                    ui.showError("Failed to paste: " + meta.name);
                }

                --count;
                if (count === 0)
                {
                    m_properties.clipboard.assign([]);
                    loadDirectory(m_properties.currentUri.value(), false);
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
            m_properties.clipboard.assign(data.files);
        })
        .fail(function (xhr, status, err)
        {
            //ui.showError("Failed to load clipboard contents.");
        });
    }

    function openClipboardPage()
    {
        var amount = high.binding(0);

        var page = high.element(mid.Page)
        .onSwipeBack(function () { page.pop_(); })
        .header(
            high.element(mid.PageHeader)
            .title("Clipboard")
            .subtitle(high.predicate([amount], function () { return amount.value() + " items"; }))
            .left(
                high.element(mid.IconButton).icon("sh-icon-back")
                .onClicked(function () { page.pop_(); })
            )
        )
        .add(
            high.element(mid.ListView).id("listview")
        );
        
        m_properties.clipboard.value().forEach(function (entry)
        {
            var info = "";
            if (entry.mimeType !== "application/x-folder")
            {
                info += (entry.size / (1024 * 1024)).toFixed(2) + " MB, ";
            }
            var d = new Date(entry.mtime);
            info += d.toLocaleDateString() + " " + d.toLocaleTimeString();

            page.find("listview")
            .add(
                high.element(mid.ListItem)
                .title(entry.name)
                .subtitle(info)
                .icon(entry.icon || "")
            );
            amount.assign(amount.value() + 1);
        });

        page.push_();
    }

    function onDragOver(ev)
    {
        ev.dataTransfer = ev.originalEvent.dataTransfer;
        ev.stopPropagation();
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "copy";
    }
    
    function onDrop(ev)
    {
        function progressCallback(a, b)
        {
            amount = a;
            total = b;
        }

        function fileCallback(type, name, progress, ctx)
        {
            if (progress === 0)
            {
                statusEntry.progress = 0;
                statusEntry.text = amount + "/" + total + " " + name;
            }
            else if (progress === -1)
            {
                popStatus(statusEntry);
                if (type === "directory")
                {
                    ui.showError("Failed to create directory: " + name);
                }
                else
                {
                    ui.showError("Failed to upload file: " + name);
                }
            }
            else
            {
                statusEntry.progress = progress * 100;
            }
        }

        function finishedCallback()
        {
            popStatus(statusEntry);
            if (m_properties.currentUri.value() === rootUri)
            {
                loadDirectory(m_properties.currentUri.value(), false);
            }
        }

        var statusEntry = high.element(ui.StatusItem).icon("sh-icon-cloud-upload").get();
        pushStatus(statusEntry);

        var rootUri = m_properties.currentUri.value();
        var amount = 0;
        var total = 0;

        ev.dataTransfer = ev.originalEvent.dataTransfer;
        ev.stopPropagation();
        ev.preventDefault();
    
        var items = ev.dataTransfer.items;
        if (items)
        {
            uploadFileItems(items, m_properties.currentUri.value(), fileCallback, progressCallback, finishedCallback);
        }
        else
        {
            uploadFiles(ev.dataTransfer.files, m_properties.currentUri.value(), fileCallback, progressCallback, finishedCallback);
        }   
    }


    /* setup properties */
    m_properties.currentUri = high.binding("");
    m_properties.currentContext = high.binding(0);
    m_properties.files = high.binding([]);
    m_properties.selection = high.binding([]);
    m_properties.clipboard = high.binding([]);
    m_properties.clipboardFilled = high.binding(false);
    m_properties.shares = high.binding([]);
    m_properties.permissions = high.binding([]);
    m_properties.configuration = high.binding(configuration.configuration);

    var page = high.element(mid.Page)
    .onSwipeBack(cdUp)
    .header(
        high.element(mid.PageHeader)
        .title(high.predicate([m_properties.currentUri, m_properties.shares], function ()
        {
            var isFav = configuration.get("favorites", []).find(function (a) { return a.uri === m_properties.currentUri.value(); }) !== undefined;
            var isShare = m_properties.shares.value().find(function (a) { return a.uri === m_properties.currentUri.value(); }) !== undefined;
    
            return (isFav ? "[icon:star-circle] " : "") +
                   (isShare ? "[icon:share] " : "") +
                   decodeURIComponent(m_properties.currentUri.value());
        }))
        .subtitle(high.predicate([m_properties.files], function ()
        {
            return m_properties.files.value().length + " items";
        }))
        .onClicked(openPathMenu)
        .left(
            high.element(mid.IconButton).icon("sh-icon-back")
            .visible(high.predicate([m_properties.currentUri], function () { return m_properties.currentUri.value() !== "/"; }))
            .onClicked(cdUp)
        )
        .right(
            high.element(mid.IconButton).icon("sh-icon-menu")
            .onClicked(function ()
            {
                var menu = m_actionsMenu.get();
                menu.popup(page.get().header.right[0].get());
            })
        )
    )
    .left(
        high.element(ui.NavBar)
    )
    .footer(
        high.element(ui.StatusBox)
    );
    m_page = page.get();

    m_page.left.page = m_page;

    m_page.push();



    /* setup actions menu */
    var m_actionsMenu = high.element(mid.Menu)
    .add(
        high.element(mid.IconButton).icon("sh-icon-view-as-list")
        .checked(high.predicate([m_properties.configuration], function () { return configuration.get("view-mode", "list") === "list"; }))
        .onClicked(function () { setViewMode("list"); })
    )
    .add(
        high.element(mid.IconButton).icon("sh-icon-view-as-grid")
        .checked(high.predicate([m_properties.configuration], function () { return configuration.get("view-mode") === "grid"; }))
        .onClicked(function () { setViewMode("grid"); })
    )
    .add(
        high.element(mid.IconButton).icon("sh-icon-alphabet")
        .checked(high.predicate([m_properties.configuration], function () { return configuration.get("sort-mode", "name") === "name"; }))
        .onClicked(function () { setSortMode("name"); })
    )
    .add(
        high.element(mid.IconButton).icon("sh-icon-number")
        .checked(high.predicate([m_properties.configuration], function () { return configuration.get("sort-mode") === "number"; }))
        .onClicked(function () { setSortMode("number"); })
    )
    .add(
        high.element(mid.IconButton).icon("sh-icon-clock")
        .checked(high.predicate([m_properties.configuration], function () { return configuration.get("sort-mode") === "date"; }))
        .onClicked(function () { setSortMode("date"); })
    )
    .add(
        high.element(mid.SubMenu).text("Tools").id("tools-menu")
        .add(
            high.element(mid.MenuItem).text("Toggle Dark Mode")
            .onClicked(function ()
            {
                if ($("body").hasClass("sh-theme-dark"))
                {
                    $("body").removeClass("sh-theme-dark").addClass("sh-theme-default");
                }
                else
                {
                    $("body").removeClass("sh-theme-default").addClass("sh-theme-dark");
                }
            })
        )
    )
    .add(
        high.element(mid.SubMenu).text("New")
        .visible(high.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
        .add(
            high.element(mid.MenuItem).icon("sh-icon-folder").text("Directory...")
            .onClicked(makeNewDirectory)
        )
        .add(
            high.element(mid.MenuItem).icon("sh-icon-file").text("File...")
            .onClicked(makeNewFile)
        )
    )
    .add(
        high.element(mid.SubMenu).text("Clipboard")
        .visible(high.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
        .add(
            high.element(mid.MenuItem).text("Cut").icon("sh-icon-clipboard-cut")
            .enabled(high.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(eachSelected(cutToClipboard))
        )
        .add(
            high.element(mid.MenuItem).text("Copy").icon("sh-icon-clipboard-copy")
            .enabled(high.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(eachSelected(copyToClipboard))
        )
        .add(
            high.element(mid.MenuItem).text("Paste").icon("sh-icon-clipboard-paste")
            .enabled(high.predicate([m_properties.clipboard], function () { return m_properties.clipboard.value().length > 0; }))
            .onClicked(pasteFromClipboard)
        )
        .add(
            high.element(mid.MenuItem).text("Show").icon("sh-icon-clipboard")
            .enabled(high.predicate([m_properties.clipboard], function () { return m_properties.clipboard.value().length > 0; }))
            .onClicked(openClipboardPage)
        )
    )
    .add(
        high.element(mid.SubMenu).text("Action")
        .add(
            high.element(mid.MenuItem).text("Upload...").icon("sh-icon-cloud-upload")
            .visible(high.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
            .onClicked(function () { $("#upload").click(); })
        )
        .add(
            high.element(mid.MenuItem).text("Download").icon("sh-icon-download")
            .enabled(high.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(eachSelected(downloadItem))
        )
        .add(
            high.element(mid.MenuItem).text("Rename...").icon("sh-icon-rename")
            .visible(high.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("MODIFY") !== -1; }))
            .enabled(high.predicate([m_properties.selection], function () { return m_properties.selection.value().length === 1; }))
            .onClicked(eachSelected(renameItem))
        )
        .add(
            high.element(mid.MenuItem).text("Bulk-Rename...").icon("sh-icon-rename")
            .visible(high.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("MODIFY") !== -1; }))
            .enabled(high.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(bulkRename)
        )
        .add(
            high.element(mid.MenuItem).text("Delete").icon("sh-icon-trashcan")
            .visible(high.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("DELETE") !== -1; }))
            .enabled(high.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(removeSelected)
        )
    )
    .add(
        high.element(mid.MenuItem).text("Select All")
        .onClicked(selectAll)
    )
    .add(
        high.element(mid.MenuItem).text("Unselect All")
        .enabled(high.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
        .onClicked(unselectAll)
    );
    
    /* setup history navigation */
    window.addEventListener("popstate", function (ev)
    {
        if (ev.state && ev.state.uri)
        {
            loadDirectory(ev.state.uri, false);
        }
    }, false);

    $(window).resize(updateNavBar);
    m_page.get().on("visible", updateNavBar);

    /* setup file upload */
    $("#upload").on("change", function (event)
    {
        function progressCallback(a, b)
        {
            amount = a;
            total = b;
        }

        function fileCallback(type, name, progress, ctx)
        {
            if (progress === 0)
            {
                statusEntry.progress = 0;
                statusEntry.text = amount + "/" + total + " " + name;
            }
            else if (progress === -1)
            {
                popStatus(statusEntry);
                if (type === "directory")
                {
                    ui.showError("Failed to create directory: " + name);
                }
                else
                {
                    ui.showError("Failed to upload file: " + name);
                }
            }
            else
            {
                statusEntry.progress = progress * 100;
            }
        }

        function finishedCallback()
        {
            popStatus(statusEntry);
            if (m_properties.currentUri.value() === rootUri)
            {
                loadDirectory(m_properties.currentUri.value(), false);
            }
        }

        var statusEntry = high.element(ui.StatusItem).icon("sh-icon-cloud-upload").get();
        pushStatus(statusEntry);

        var rootUri = m_properties.currentUri.value();
        var amount = 0;
        var total = 0;

        uploadFiles(event.target.files, m_properties.currentUri.value(), fileCallback, progressCallback, finishedCallback);
    });

    /* setup drag and drop for external files */
    $("body").on("dragover", onDragOver);
    $("body").on("drop", onDrop);

    loadDirectory("/", true);
    loadClipboard();

    mimeRegistry.register("application/x-folder", function (uri)
    {
        loadDirectory(uri, true);
    });

    mimeRegistry.register("application/zip", function (uri)
    {
        loadDirectory(uri, true);
    });
});
