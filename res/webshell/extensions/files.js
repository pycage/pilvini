"use strict";

var files = { };

(function ()
{
    var m_page = null;
    var m_listView = null;
    var m_actionsMenu = null;
    var m_properties = { };
   
    var m_scrollPositionsMap = { };

    var m_logItem = null;


    /* Returns the current location.
     */
    files.currentUri = function ()
    {
        return m_properties.currentUri.value();
    };

    /* Returns the actions menu.
     */
    files.actionsMenu = function ()
    {
        return m_actionsMenu;
    };

    /* Returns a list of URIs by MIME type.
     */
    files.filesByMimetype = function (pattern)
    {
        return m_properties.files.value().filter(function (meta)
        {
            return meta.mimeType.startsWith(pattern);
        })
        .map(function (meta)
        {
            return meta.uri;
        });
    };

    files.eachSelected = function (callback)
    {
        return eachSelected(callback);
    };

    files.pushStatus = function (item)
    {
        pushStatus(item);
    };

    files.popStatus = function (item)
    {
        popStatus(item);
    };

    files.properties = function ()
    {
        return m_properties;
    };

    function log(message)
    {
        if (! m_logItem)
        {
            m_logItem = sh.element(ui.StatusItem).text(message).get();
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

    /* Pushes the given item into the status box.
     */
    function pushStatus(item)
    {
        m_page.footer.push(item);
        m_page.updateGeometry();
        updateNavBar();
    }

    /* Removes the given item from the status box.
     */
    function popStatus(item)
    {
        item.get().remove();
        m_page.updateGeometry();
        updateNavBar();
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
        var dlg = sh.element(sh.Dialog).title("Setup Share")
        .add(
            sh.element(sh.Label).text("Share this directory.")
        )
        .add(
            sh.element(sh.Labeled).text("Share Login:")
            .add(
                sh.element(sh.TextInput).id("login").focus(true)
            )
        )
        .add(
            sh.element(sh.Labeled).text("Share Password:")
            .add(
                sh.element(sh.TextInput).id("password")
            )
        )
        .button(
            sh.element(sh.Button).text("Share").isDefault(true)
            .action(function ()
            {
                dlg.close_();
                share(dlg.find("login").get().text,
                      dlg.find("password").get().text);
            })
        )
        .button(
            sh.element(sh.Button).text("Cancel")
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
        var dlg = sh.element(sh.Dialog).title("New Directory")
        .add(
            sh.element(sh.Label).text("Create a new directory.")
        )
        .add(
            sh.element(sh.Labeled).text("Name:")
            .add(
                sh.element(sh.TextInput).id("name").focus(true)
            )
        )
        .button(
            sh.element(sh.Button).text("Create").isDefault(true)
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
            sh.element(sh.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        );
        dlg.show_();
    }

    function makeNewFile()
    {
        var dlg = sh.element(sh.Dialog).title("New File")
        .add(
            sh.element(sh.Label).text("Create a new file.")
        )
        .add(
            sh.element(sh.Labeled).text("Name:")
            .add(
                sh.element(sh.TextInput).id("name").focus(true)
            )
        )
        .button(
            sh.element(sh.Button).text("Create").isDefault(true)
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
            sh.element(sh.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        );
        dlg.show_();
    }

    function loadThumbnails()
    {
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
   
        console.log("loadThumbnails: " + items.length + " images");
        loadNextThumbnail(m_properties.currentUri.value(), items);
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
            if (m_properties.currentUri.value() === forLocation)
            {
                loadNextThumbnail(forLocation, items);
            }
            return;
        }
        var name = meta.name;
        var thumbnailUri = "/::thumbnail" + meta.uri;
    
        var now = Date.now();
        var statusEntry = sh.element(ui.StatusItem).icon("sh-icon-wait").text(name).get();
        pushStatus(statusEntry);
    
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
            popStatus(statusEntry);

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
    
                if (m_properties.currentUri.value() === forLocation)
                {
                    loadNextThumbnail(forLocation, items);
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
                        if (m_properties.currentUri.value() === forLocation)
                        {
                            loadNextThumbnail(forLocation, items);
                        }
                    });
                });
            }
        })
        .fail(function ()
        {
            popStatus(statusEntry);
            if (m_properties.currentUri.value() === forLocation)
            {
                loadNextThumbnail(forLocation, items);
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

        var dlg = sh.element(sh.Dialog).title("Rename File")
        .add(
            sh.element(sh.Label).text("Rename the file.")
        )
        .add(
            sh.element(sh.Labeled).text("Name:")
            .add(
                sh.element(sh.TextInput).id("name").text(name).focus(true)
            )
        )
        .button(
            sh.element(sh.Button).text("Rename").isDefault(true)
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
            sh.element(sh.Button).text("Cancel")
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

    function eachSelected(callback)
    {
        return function ()
        {
            var sel = m_properties.selection.value().slice();
            sel.sort();
            sel.forEach(function (idx)
            {
                callback(idx);
            });
            unselectAll();
        };
    }

    function openPathMenu()
    {
        var favs = configuration.get("favorites", []);
        var isFav = !! favs.find(function (a) { return a.uri === m_properties.currentUri.value(); });
        var isShare = !! m_properties.shares.value().find(function (a) { return a.uri === m_properties.currentUri.value(); });

        console.log(JSON.stringify(m_properties.shares.value()) + " current " + m_properties.currentUri.value());

        var menu = sh.element(sh.Menu)
        .add(
            sh.element(sh.SubMenu).text("Favorites")
            .add(
                sh.element(sh.MenuItem).text("Remove from Favorites")
                .visible(isFav)
                .onClicked(removeFavorite)
            )
            .add(
                sh.element(sh.MenuItem).text("Add to Favorites")
                .visible(! isFav)
                .onClicked(addFavorite)
            )
            .add(
                sh.element(sh.Separator)
            )
        )
        .add(
            sh.element(sh.SubMenu).text("Shares")
            .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("SHARE") !== -1; }))
            .add(
                sh.element(sh.MenuItem).text("Unshare This")
                .visible(isShare)
                .onClicked(unshare)
            )
            .add(
                sh.element(sh.MenuItem).text("Share This")
                .visible(! isShare)
                .onClicked(showShareDialog)
            )
            .add(
                sh.element(sh.Separator)
            )
        )
        .add(
            sh.element(sh.Separator)
        );

        favs.forEach(function (f)
        {
            menu.child(0).add(
                sh.element(sh.MenuItem).text(f.name).icon("sh-icon-star-circle")
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
                sh.element(sh.MenuItem).text(s.share + " " + s.uri).icon("sh-icon-share")
                .onClicked(function ()
                {
                    m_scrollPositionsMap = { };
                    loadDirectory(s.uri, true);
                })
            );
        });

        menu.add(
            sh.element(sh.MenuItem).text("/")
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
                sh.element(sh.MenuItem).text(decodeURIComponent(parts[i]))
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
        m_page.left.update();
    }

    function loadDirectory(uri, pushToHistory)
    {
        var busyIndicator = sh.element(sh.BusyPopup).text("Loading");
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
            var listView = new sh.ListView();

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
                var item = new sh.ListItem();
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
                ++count;
            });
            m_page.add(listView);
            m_listView = listView;
            break;

        case "grid":
            var gridView = new sh.GridView();

            var count = 0;
            files.forEach(function (entry)
            {
                var item = new sh.GridItem();
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
                ++count;
            });
            m_page.add(gridView);
            m_listView = gridView;
            break;
        }

        m_properties.currentUri.assign(data.uri);
        m_properties.files.assign(files);
        m_properties.selection.assign([]);
        m_properties.shares.assign(data.shares);
        m_properties.permissions.assign(data.permissions);

        //setupNavBar();
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

        var statusEntry = sh.element(ui.StatusItem).icon("sh-icon-clipboard").text("Copying " + meta.name).get();
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
        var amount = sh.binding(0);

        var page = sh.element(sh.NSPage)
        .onSwipeBack(function () { page.pop_(); })
        .header(
            sh.element(sh.PageHeader)
            .title("Clipboard")
            .subtitle(sh.predicate([amount], function () { return amount.value() + " items"; }))
            .left(
                sh.element(sh.IconButton).icon("sh-icon-back")
                .onClicked(function () { page.pop_(); })
            )
        )
        .add(
            sh.element(sh.ListView).id("listview")
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
                sh.element(sh.ListItem)
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
                var icon = type === "directory" ? "sh-icon-folder" : "sh-icon-cloud-upload";
                ctx.statusEntry = sh.element(ui.StatusItem).icon(icon).text(amount + "/" + total + " " + name).get();
                pushStatus(ctx.statusEntry);
            }
            else if (progress === -1)
            {
                popStatus(ctx.statusEntry);
                if (type === "directory")
                {
                    ui.showError("Failed to create directory: " + name);
                }
                else
                {
                    ui.showError("Failed to upload file: " + name);
                }
            }
            else if (progress === 1)
            {
                popStatus(ctx.statusEntry);
            }
            else
            {
                ctx.statusEntry.progress = progress * 100;
            }
        }

        function finishedCallback()
        {
            if (m_properties.currentUri.value() === rootUri)
            {
                loadDirectory(m_properties.currentUri.value(), false);
            }
        }

        var rootUri = m_properties.currentUri.value();
        var amount = 0;
        var total = 0;

        ev.dataTransfer = ev.originalEvent.dataTransfer;
        ev.stopPropagation();
        ev.preventDefault();
    
        var items = ev.dataTransfer.items;
        for (var i = 0; i < items.length; ++i)
        {
            var item = items[i];
            if (item.webkitGetAsEntry)
            {
                uploadHierarchy(item.webkitGetAsEntry(), m_properties.currentUri.value(), fileCallback, progressCallback, finishedCallback);
            }
            else if (ev.dataTransfer.getAsEntry)
            {
                uploadHierarchy(item.getAsEntry(), m_properties.currentUri.value(), fileCallback, progressCallback, finishedCallback);
            }
            else
            {
                uploadFiles(ev.dataTransfer.files, m_properties.currentUri.value(), fileCallback, progressCallback, finishedCallback);
                break;
            }
        }
    
    }

    /* setup properties */
    m_properties.currentUri = sh.binding("");
    m_properties.files = sh.binding([]);
    m_properties.selection = sh.binding([]);
    m_properties.clipboard = sh.binding([]);
    m_properties.clipboardFilled = sh.binding(false);
    m_properties.shares = sh.binding([]);
    m_properties.permissions = sh.binding([]);
    m_properties.configuration = sh.binding(configuration);

    var page = sh.element(sh.NSPage)
    .onSwipeBack(cdUp)
    .header(
        sh.element(sh.PageHeader)
        .title(sh.predicate([m_properties.currentUri, m_properties.shares], function ()
        {
            var isFav = configuration.get("favorites", []).find(function (a) { return a.uri === m_properties.currentUri.value(); }) !== undefined;
            var isShare = m_properties.shares.value().find(function (a) { return a.uri === m_properties.currentUri.value(); }) !== undefined;
    
            return (isFav ? "[icon:star-circle] " : "") +
                   (isShare ? "[icon:share] " : "") +
                   decodeURIComponent(m_properties.currentUri.value());
        }))
        .subtitle(sh.predicate([m_properties.files], function ()
        {
            return m_properties.files.value().length + " items";
        }))
        .onClicked(openPathMenu)
        .left(
            sh.element(sh.IconButton).icon("sh-icon-back")
            .visible(sh.predicate([m_properties.currentUri], function () { return m_properties.currentUri.value() !== "/"; }))
            .onClicked(cdUp)
        )
        .right(
            sh.element(sh.IconButton).icon("sh-icon-menu")
            .onClicked(function ()
            {
                var menu = m_actionsMenu.get();
                menu.popup(page.get().header.right[0].get());
            })
        )
    )
    .left(
        sh.element(ui.NavBar)
    )
    .footer(
        sh.element(ui.StatusBox)
    );
    m_page = page.get();

    m_page.left.page = m_page;

    m_page.push();



    /* setup actions menu */
    var m_actionsMenu = sh.element(sh.Menu)
    .add(
        sh.element(sh.IconButton).icon("sh-icon-view-as-list")
        .checked(sh.predicate([m_properties.configuration], function () { return configuration.get("view-mode", "list") === "list"; }))
        .onClicked(function () { setViewMode("list"); })
    )
    .add(
        sh.element(sh.IconButton).icon("sh-icon-view-as-grid")
        .checked(sh.predicate([m_properties.configuration], function () { return configuration.get("view-mode") === "grid"; }))
        .onClicked(function () { setViewMode("grid"); })
    )
    .add(
        sh.element(sh.IconButton).icon("sh-icon-alphabet")
        .checked(sh.predicate([m_properties.configuration], function () { return configuration.get("sort-mode", "name") === "name"; }))
        .onClicked(function () { setSortMode("name"); })
    )
    .add(
        sh.element(sh.IconButton).icon("sh-icon-number")
        .checked(sh.predicate([m_properties.configuration], function () { return configuration.get("sort-mode") === "number"; }))
        .onClicked(function () { setSortMode("number"); })
    )
    .add(
        sh.element(sh.IconButton).icon("sh-icon-clock")
        .checked(sh.predicate([m_properties.configuration], function () { return configuration.get("sort-mode") === "date"; }))
        .onClicked(function () { setSortMode("date"); })
    )
    .add(
        sh.element(sh.SubMenu).text("New")
        .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-folder").text("Directory...")
            .onClicked(makeNewDirectory)
        )
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-file").text("File...")
            .onClicked(makeNewFile)
        )
    )
    .add(
        sh.element(sh.SubMenu).text("Clipboard")
        .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
        .add(
            sh.element(sh.MenuItem).text("Cut").icon("sh-icon-clipboard-cut")
            .enabled(sh.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(eachSelected(cutToClipboard))
        )
        .add(
            sh.element(sh.MenuItem).text("Copy").icon("sh-icon-clipboard-copy")
            .enabled(sh.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(eachSelected(copyToClipboard))
        )
        .add(
            sh.element(sh.MenuItem).text("Paste").icon("sh-icon-clipboard-paste")
            .enabled(sh.predicate([m_properties.clipboard], function () { return m_properties.clipboard.value().length > 0; }))
            .onClicked(pasteFromClipboard)
        )
        .add(
            sh.element(sh.MenuItem).text("Show").icon("sh-icon-clipboard")
            .enabled(sh.predicate([m_properties.clipboard], function () { return m_properties.clipboard.value().length > 0; }))
            .onClicked(openClipboardPage)
        )
    )
    .add(
        sh.element(sh.SubMenu).text("Action")
        .add(
            sh.element(sh.MenuItem).text("Upload...").icon("sh-icon-cloud-upload")
            .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
            .onClicked(function () { $("#upload").click(); })
        )
        .add(
            sh.element(sh.MenuItem).text("Download").icon("sh-icon-download")
            .enabled(sh.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(eachSelected(downloadItem))
        )
        .add(
            sh.element(sh.MenuItem).text("Rename...").icon("sh-icon-rename")
            .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("MODIFY") !== -1; }))
            .enabled(sh.predicate([m_properties.selection], function () { return m_properties.selection.value().length === 1; }))
            .onClicked(eachSelected(renameItem))
        )
        .add(
            sh.element(sh.MenuItem).text("Delete").icon("sh-icon-trashcan")
            .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("DELETE") !== -1; }))
            .enabled(sh.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
            .onClicked(removeSelected)
        )
    )
    .add(
        sh.element(sh.MenuItem).text("Select All")
        .onClicked(selectAll)
    )
    .add(
        sh.element(sh.MenuItem).text("Unselect All")
        .enabled(sh.predicate([m_properties.selection], function () { return m_properties.selection.value().length > 0; }))
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

    /* setup file upload */
    $("#upload").on("change", function (event)
    {
        // TODO: proper callbacks!
        uploadFiles(event.target.files, m_properties.currentUri.value(), function () { }, function () { }, function () { });
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
})();
