"use strict";

var files = { };
files.menu = { };
files.predicates = { };

(function ()
{
    function Node(type, text)
    {
        var that = this;
        var m_type = type;
        var m_text = text;
        var m_icon = "";
        var m_callback = function () { };
        var m_enabled = function () { return true; };
        var m_visible = function () { return true; };
        var m_children = [];

        this.isEnabled = function ()
        {
            return m_enabled();
        };
        
        this.isVisible = function ()
        {
            return m_visible();
        };

        this.type = function ()
        {
            return m_type;
        };

        this.icon = function (icon)
        {
            m_icon = icon;
            return that;
        };

        this.action = function (cb)
        {
            m_callback = cb;
            return that;
        };

        this.enabled = function (predicate)
        {
            m_enabled = predicate;
            return that;
        };

        this.visible = function (predicate)
        {
            m_visible = predicate;
            return that;
        };

        this.add = function (child)
        {
            m_children.push(child);
            return that;
        };

        this.child = function (n)
        {
            if (n >= 0)
            {
                return m_children[n];
            }
            else
            {
                return m_children[m_children.length + n];
            }
        };

        this.create = function ()
        {
            var visibleChildren = m_children.filter(function (c)
            {
                return c.isVisible();
            });

            if (m_type === "menu")
            {
                var menu = new ui.Menu();
                visibleChildren.forEach(function (c)
                {
                    if (c.type() === "submenu")
                    {
                        menu.addSubMenu(c.create());
                    }
                    else if (c.type() === "separator")
                    {
                        menu.addSeparator();
                    }
                    else
                    {
                        menu.addItem(c.create());
                    }
                });
                return menu;
            }
            else if (m_type === "submenu")
            {
                var menu = new ui.SubMenu(m_text);
                visibleChildren.forEach(function (c)
                {
                    if (c.type() === "submenu")
                    {
                        menu.addSubMenu(c.create());
                    }
                    else if (c.type() === "separator")
                    {
                        menu.addSeparator();
                    }
                    else
                    {
                        menu.addItem(c.create());
                    }
                });
                return menu;
            }
            else
            {
                var item = new ui.MenuItem(m_icon, m_text, m_callback);
                item.setEnabled(m_enabled());
                return item;
            }
        };
    }

    files.menu.menu = function ()
    {
        return new Node("menu", "");
    }

    files.menu.submenu = function (t)
    {
        return new Node("submenu", t);
    }

    files.menu.item = function (t)
    {
        return new Node("item", t);
    }

    files.menu.separator = function ()
    {
        return new Node("separator", "");
    }
})();

(function ()
{
    var m_page;
    var m_currentUri = "";
    var m_permissions = [];

    var m_actionsMenu;
   
    var m_clipboard = [];
    var m_shares = [];

    var m_scrollPositionsMap = { };


    /* Returns the current location.
     */
    files.currentUri = function ()
    {
        return m_currentUri;
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

    files.eachSelected = function (callback)
    {
        return eachSelected(callback);
    }

    files.pushStatus = function (item)
    {
        pushStatus(item);
    }

    files.popStatus = function (item)
    {
        popStatus(item);
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
        $("#statusbox").append(item.get());
        m_page.find("> section").css("padding-bottom", m_page.find("#statusbox").height() + "px");
        updateNavBar();
    }

    /* Removes the given item from the status box.
     */
    function popStatus(item)
    {
        item.get().remove();
        m_page.find("> section").css("padding-bottom", m_page.find("#statusbox").height() + "px");
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

        var name = extractName(m_currentUri);
        var uri = m_currentUri;
        var favs = configuration.get("favorites", []);
        favs.push({ name: name, uri: uri });
        configuration.set("favorites", favs);
        loadDirectory(m_currentUri, false);
    }

    /* Removes the current location from the favorites menu.
     */
    function removeFavorite()
    {
        var uri = m_currentUri;
        var favs = configuration.get("favorites", []);
        favs = favs.filter(function (a)
        {
            return a.uri !== uri;
        });
        configuration.set("favorites", favs);
        loadDirectory(m_currentUri, false);
    }

    function setSortMode(mode)
    {
        configuration.set("sort-mode", mode);
        m_scrollPositionsMap = { };
        loadDirectory(m_currentUri, false);
    }

    function setViewMode(mode)
    {
        configuration.set("view-mode", mode);
        m_scrollPositionsMap = { };
        loadDirectory(m_currentUri, false);
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
                var targetUri = joinPath(m_currentUri, encodeURIComponent(name));
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
                var targetUri = joinPath(m_currentUri, encodeURIComponent(name));
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
        var meta = $(item).data("meta");
        if (! meta)
        {
            if (m_currentUri === forLocation)
            {
                loadNextThumbnail(forLocation, items);
            }
            return;
        }
        var name = meta.name;
        var img = $(item).hasClass("icon") ? item
                                           : $(item).find(".icon");
        var thumbnailUri = "/::thumbnail" + meta.uri;
    
        var now = Date.now();
        var statusEntry = new ui.StatusItem("sh-icon-wait", name);
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
                $(img).css("background-image", "url(" + pic + ")");
                $(img).css("background-size", "cover");
        
                var speed = Math.ceil((data.length / 1024) / ((then - now) / 1000.0));
                console.log("Loading took " + (then - now) + " ms, size: " + data.length + " B (" + speed + " kB/s).");
    
                if (m_currentUri === forLocation)
                {
                    loadNextThumbnail(forLocation, items);
                }
            }
            else if (xhr.status === 204)
            {
                // create thumbnail client-side, send to server, and retry           
                generateThumbnail(item, function (data)
                {
                    var thumbnailUri = "/::thumbnail" + $(item).data("meta").uri;
                    submitThumbnail("image/jpeg", data, thumbnailUri, function (ok)
                    {
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
            popStatus(statusEntry);
            if (m_currentUri === forLocation)
            {
                loadNextThumbnail(forLocation, items);
            }
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
            var targetUri = joinPath(m_currentUri, encodeURIComponent(newName));

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
        m_page.find(".fileitem > div.selector").addClass("sh-selected");
    }

    function unselectAll()
    {
        m_page.find(".fileitem > div.selector").removeClass("sh-selected");
    }

    function toggleSelect(item)
    {
        $(item).toggleClass("sh-selected");
    }

    files.predicates.filesSelected = function ()
    {
        var size = m_page.find(".fileitem > div.selector.sh-selected").length;
        return size > 0;
    }

    files.predicates.oneFileSelected = function ()
    {
        var size = m_page.find(".fileitem > div.selector.sh-selected").length;
        return size === 1;
    }

    files.predicates.clipboardFilled = function ()
    {
        return m_clipboard.length > 0;
    }

    files.predicates.permissions = function (ps)
    {
        var permissions = [];
        for (var i = 0; i < arguments.length; ++i)
        {
            permissions.push(arguments[i]);
        }
        return function ()
        {
            return permissions
            .map(function (p) { return m_permissions.indexOf(p) !== -1; })
            .reduce(function (a, b) { return a && b; }, true);
        };
    }

    files.predicates.mimeTypeSelected = function (mimeType)
    {
        return function ()
        {
            var v = false;
            var items = m_page.find(".fileitem > div.selector.sh-selected");
            items.each(function ()
            {
                var meta = $(this).parent().data("meta");
                v |= meta.mimeType === mimeType;
            });
            return v;
        };
    }

    function eachSelected(callback)
    {
        return function ()
        {
            var items = m_page.find(".fileitem > div.selector.sh-selected");
            items.each(function ()
            {
                callback($(this).parent());
            });
            unselectAll();
        };
    }

    function openPathMenu()
    {
        var favs = configuration.get("favorites", []);
        function isFavPredicate()
        {
            return !! favs.find(function (a) { return a.uri === m_currentUri; });
        }

        console.log(JSON.stringify(m_shares) + " current " + m_currentUri);
        function isSharePredicate()
        {
            return !! m_shares.find(function (a) { return a.uri === m_currentUri; });
        }

        var menu = files.menu.menu()
        .add(
            files.menu.submenu("Favorites")
            .add(
                files.menu.item("Remove from Favorites")
                .visible(isFavPredicate)
                .action(removeFavorite)
            )
            .add(
                files.menu.item("Add to Favorites")
                .visible(not(isFavPredicate))
                .action(addFavorite)
            )
            .add(
                files.menu.separator()
            )
        )
        .add(
            files.menu.submenu("Shares")
            .visible(files.predicates.permissions("SHARE"))
            .add(
                files.menu.item("Unshare This")
                .visible(isSharePredicate)
                .action(unshare)
            )
            .add(
                files.menu.item("Share This")
                .visible(not(isSharePredicate))
                .action(showShareDialog)
            )
            .add(
                files.menu.separator()
            )
        )
        .add(
            files.menu.separator()
        );

        favs.forEach(function (f)
        {
            menu.child(0).add(
                files.menu.item(f.name).icon("sh-icon-star-circle")
                .action(function ()
                {
                    m_scrollPositionsMap = { };
                    loadDirectory(f.uri, true);
                })
            );
        });

        m_shares.forEach(function (s)
        {
            menu.child(1).add(
                files.menu.item(s.share).icon("sh-icon-share")
                .action(function ()
                {
                    m_scrollPositionsMap = { };
                    loadDirectory(s.uri, true);
                })
            );
        });

        menu.add(
            files.menu.item("/")
            .action(function ()
            {
                m_scrollPositionsMap = { };
                loadDirectory("/", true);
            })
        );

        var parts = m_currentUri.split("/");
        var breadcrumbUri = "";
        for (var i = 0; i < parts.length; ++i)
        {
            if (parts[i] === "")
            {
                continue;
            }

            breadcrumbUri += "/" + parts[i];
            menu.add(
                files.menu.item(decodeURIComponent(parts[i]))
                .action(function (uri)
                {
                    return function ()
                    {
                        m_scrollPositionsMap = { };
                        loadDirectory(uri, true);
                    };
                }(breadcrumbUri))
            );
        }

        menu.create().popup(m_page.find("> header > div"));
    }

    function setupStatusBox()
    {
        var statusBox = $(
            tag("div").id("statusbox")
            .style("position", "fixed")
            .style("bottom", "0")
            .style("left", "0")
            .style("right", "0")
            .style("height", "auto")
            .style("border", "solid 1px var(--color-border)")
            .style("background-color", "var(--color-primary-background)")
            .html()
        );

        m_page.append(statusBox);
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
        var previousOffset = -1;

        for (var i = 0; i < items.length; ++i)
        {
            var item = $(items[i]);
            var letter = item.find("h1").html()[0].toUpperCase();
            var offset = item.offset().top;
    
            if (letter !== currentLetter && offset !== previousOffset)
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
                previousOffset = offset;
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

        m_scrollPositionsMap[m_currentUri] = $(document).scrollTop();

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
    
        var filesBox = m_page.find("> section");

        switch (configuration.get("view-mode", "list"))
        {
        case "list":
            var listView = $(
                tag("ul").class("sh-listview")
                .style("margin-left", "32px")
                .html()
            );
            files.forEach(function (entry)
            {
                var info = "";
                if (entry.mimeType !== "application/x-folder")
                {
                    info += (entry.size / (1024 * 1024)).toFixed(2) + " MB, ";
                }
                var d = new Date(entry.mtime);
                info += d.toLocaleDateString() + " " + d.toLocaleTimeString();
                var item = ui.listItem(entry.name, info, function ()
                {
                    openFile(entry);
                });
                item.addClass("fileitem");
                item.data("meta", entry);
                item.setAction("sh-icon-checked-circle", function ()
                {
                    toggleSelect(item.find(".selector"));
                });
                if (entry.icon)
                {
                    item.setIcon(entry.icon);
                }
                listView.append(item);
            });
            filesBox.append(listView);
            break;

        case "grid":
            var gridView = $(
                tag("div")
                .style("display", "flex")
                .style("flex-direction", "row")
                .style("flex-wrap", "wrap")
                .style("justify-content", "flex-start")
                .style("margin-left", "32px")
                .html()
            );
            files.forEach(function (entry)
            {
                var item = $(
                    tag("div").class("fileitem icon")
                    .style("position", "relative")
                    .style("width", "160px")
                    .style("height", "160px")
                    .style("padding", "0").style("margin", "0")
                    .style("margin-top", "2px")
                    .style("margin-left", "2px")
                    .style("background-repeat", "no-repeat")
                    .style("background-position", "50% 50%")
                    .style("background-image", "url(" + entry.icon + ")")
                    .content(
                        tag("h1")
                        .style("position", "absolute")
                        .style("background-color", "var(--color-primary-background-translucent)")
                        .style("padding", "0")
                        .style("left", "0")
                        .style("right", "0")
                        .style("bottom", "0")
                        .style("font-size", "80%")
                        .style("text-align", "center")
                        .content(entry.name)
                    )
                    .content(
                        tag("div").class("selector")
                        .style("position", "absolute")
                        .style("top", "0")
                        .style("right", "0")
                        .style("width", "42px")
                        .style("height", "42px")
                        .style("text-align", "center")
                        .content(
                            tag("span").class("sh-fw-icon sh-icon-checked-circle")
                            .style("line-height", "42px")
                        )
                    )
                    .html()
                );
                item.data("meta", entry);
                item.on("click", function ()
                {
                    openFile(entry);
                });
                item.find(".selector").on("click", function (event)
                {
                    event.stopPropagation();
                    toggleSelect(item.find(".selector"));
                });
                gridView.append(item);
            });
            filesBox.append(gridView);
            break;
        }

        m_currentUri = data.uri;
        m_shares = data.shares;
        m_permissions = data.permissions;

        var isFav = configuration.get("favorites", []).find(function (a) { return a.uri === m_currentUri; }) !== undefined;
        var isShare = m_shares.find(function (a) { return a.uri === m_currentUri; }) !== undefined;

        setupNavBar();
        m_page.setTitle(decodeURIComponent(data.uri));
        m_page.setSubtitle(files.length + " items");
        document.title = "Pilvini - " + decodeURIComponent(data.uri);

        if (data.uri === "/")
        {
            m_page.find("> header > span").first().css("visibility", "hidden");
        }
        else
        {
            m_page.find("> header > span").first().css("visibility", "visible");
        }

        if (isFav)
        {
            m_page.find("> header h1").prepend($(
                tag("span").class("sh-fw-icon sh-icon-star-circle").content(" ").html()
            ));
        }
        if (isShare)
        {
            m_page.find("> header h1").prepend($(
                tag("span").class("sh-fw-icon sh-icon-share").content(" ").html()
            ));
        }

        $(document).scrollTop(m_scrollPositionsMap[m_currentUri] || 0);

        setTimeout(function () { loadThumbnails(); }, 500);
        updateNavBar();
    }

    function cdUp()
    {
        var parts = m_currentUri.split("/");
        var parentUri = parts.slice(0, parts.length - 1).join("/");
        loadDirectory(parentUri, true);
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
                var targetMeta = JSON.parse(JSON.stringify(meta));
                targetMeta.uri = targetUri;
                m_clipboard.push(targetMeta);
                $(item).remove();
                updateNavBar();
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

        var statusEntry = new ui.StatusItem("sh-icon-clipboard", "Copying " + meta.name);
        pushStatus(statusEntry);

        file.copy(sourceUri, targetUri, function (ok)
        {
            if (ok)
            {
                var targetMeta = JSON.parse(JSON.stringify(meta));
                targetMeta.uri = targetUri;
                m_clipboard.push(targetMeta);
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
        var count = m_clipboard.length;

        m_clipboard.forEach(function (meta)
        {
            var sourceUri = meta.uri;
            var targetUri = joinPath(m_currentUri, encodeURIComponent(meta.name));

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

        console.log(JSON.stringify(m_clipboard));
        m_clipboard.forEach(function (entry)
        {
            var info = "";
            if (entry.mimeType !== "application/x-folder")
            {
                info += (entry.size / (1024 * 1024)).toFixed(2) + " MB, ";
            }
            var d = new Date(entry.mtime);
            info += d.toLocaleDateString() + " " + d.toLocaleTimeString();
            var item = ui.listItem(entry.name, info, function () { });
            if (entry.icon)
            {
                item.setIcon(entry.icon);
            }
            listView.append(item);
        });

        var filesBox = clipboardPage.find("> section");
        filesBox.append(listView);
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
                ctx.statusEntry = new ui.StatusItem(icon, amount + "/" + total + " " + name);
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
                ctx.statusEntry.setProgress(progress * 100);
            }
        }

        function finishedCallback()
        {
            if (m_currentUri === rootUri)
            {
                loadDirectory(m_currentUri, false);
            }
        }

        var rootUri = m_currentUri;
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
                uploadHierarchy(item.webkitGetAsEntry(), m_currentUri, fileCallback, progressCallback, finishedCallback);
            }
            else if (ev.dataTransfer.getAsEntry)
            {
                uploadHierarchy(item.getAsEntry(), m_currentUri, fileCallback, progressCallback, finishedCallback);
            }
            else
            {
                uploadFiles(ev.dataTransfer.files, m_currentUri, fileCallback, progressCallback, finishedCallback);
                break;
            }
        }
    
    }


    m_page = ui.showPage("", cdUp);
    m_page.find("> header > div").on("click", openPathMenu);
    m_page.addIconButton("sh-icon-menu", function ()
    {
        var menu = m_actionsMenu.create();
        menu.popup($(this));
    });
    m_page.append($(
        tag("footer").class("sh-dropshadow")
        .html()
    ));


    /* setup actions menu */
    m_actionsMenu = files.menu.menu()
    .add(
        files.menu.submenu("View")
        .add(
            files.menu.item("As List")
            .action(function () { setViewMode("list"); })
        )
        .add(
            files.menu.item("As Grid")
            .action(function () { setViewMode("grid"); })
        )
        .add(
            files.menu.item("By Name")
            .action(function () { setSortMode("name"); })
        )
        .add(
            files.menu.item("By Date")
            .action(function () { setSortMode("date"); })
        )
        .add(
            files.menu.item("By Number")
            .action(function () { setSortMode("number"); })
        )
    )
    .add(
        files.menu.submenu("New")
        .visible(files.predicates.permissions("CREATE"))
        .add(
            files.menu.item("Directory...").icon("sh-icon-folder")
            .action(makeNewDirectory)
        )
        .add(
            files.menu.item("File...").icon("sh-icon-file")
            .action(makeNewFile)
        )
    )
    .add(
        files.menu.submenu("Clipboard")
        .visible(files.predicates.permissions("CREATE"))
        .add(
            files.menu.item("Cut").icon("sh-icon-clipboard-cut")
            .enabled(files.predicates.filesSelected)
            .action(eachSelected(cutToClipboard))
        )
        .add(
            files.menu.item("Copy").icon("sh-icon-clipboard-copy")
            .enabled(files.predicates.filesSelected)
            .action(eachSelected(copyToClipboard))
        )
        .add(
            files.menu.item("Paste").icon("sh-icon-clipboard-paste")
            .enabled(files.predicates.clipboardFilled)
            .action(pasteFromClipboard)
        )
        .add(
            files.menu.item("Show").icon("sh-icon-clipboard")
            .enabled(files.predicates.clipboardFilled)
            .action(openClipboardPage)
        )
    )
    .add(
        files.menu.submenu("Action")
        .add(
            files.menu.item("Upload...").icon("sh-icon-cloud-upload")
            .visible(files.predicates.permissions("CREATE"))
            .action(function () { $("#upload").click(); })
        )
        .add(
            files.menu.item("Download").icon("sh-icon-download")
            .enabled(files.predicates.filesSelected)
            .action(eachSelected(downloadItem))
        )
        .add(
            files.menu.item("Rename...").icon("sh-icon-rename")
            .visible(files.predicates.permissions("MODIFY"))
            .enabled(files.predicates.oneFileSelected)
            .action(eachSelected(renameItem))
        )
        .add(
            files.menu.item("Delete").icon("sh-icon-trashcan")
            .visible(files.predicates.permissions("DELETE"))
            .enabled(files.predicates.filesSelected)
            .action(removeSelected)
        )
    )
    .add(
        files.menu.item("Select All")
        .action(selectAll)
    )
    .add(
        files.menu.item("Unselect All")
        .enabled(files.predicates.filesSelected)
        .action(unselectAll)
    );

    /* setup history navigation */
    window.addEventListener("popstate", function (ev)
    {
        if (ev.state && ev.state.uri)
        {
            loadDirectory(ev.state.uri, false);
        }
    }, false);

    /* setup file upload */
    $("#upload").on("change", function (event)
    {
        // TODO: proper callbacks!
        uploadFiles(event.target.files, m_currentUri, function () { }, function () { }, function () { });
    });

    /* setup drag and drop for external files */
    $("body").on("dragover", onDragOver);
    $("body").on("drop", onDrop);

    setupStatusBox();
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
