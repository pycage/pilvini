"use strict";

var files = { };
files.predicates = { };

(function ()
{
    var m_page;
    var m_backButton;
    var m_currentUri = "";

    var m_actionsMenu;
    var m_properties = { };
   
    var m_scrollPositionsMap = { };

    var m_logItem = null;


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
        var items = m_page.get().find(".fileitem");

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

    function log(message)
    {
        if (! m_logItem)
        {
            m_logItem = new ui.StatusItem("", message);
            pushStatus(m_logItem)
        }
        else
        {
            m_logItem.setText(message);
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
        $("#statusbox").append(item.get());
        m_page.get().find("> section").css("padding-bottom", m_page.get().find("#statusbox").height() + "px");
        updateNavBar();
    }

    /* Removes the given item from the status box.
     */
    function popStatus(item)
    {
        item.get().remove();
        m_page.get().find("> section").css("padding-bottom", m_page.get().find("#statusbox").height() + "px");
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
        var dlg = new sh.Dialog("Setup Share");
        dlg.add(new sh.Label("Share this directory."));
        var loginEntry = new sh.TextInput("");
        var passwordEntry = new sh.TextInput("");
        dlg.add(new sh.Labeled("Share Login:", loginEntry));
        dlg.add(new sh.Labeled("Share Password:", passwordEntry));
        dlg.addButton("Share", function ()
        {
            share(loginEntry.value(), passwordEntry.value());
        }, true);
        dlg.addButton("Cancel");
        dlg.show();
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
        var dlg = new sh.Dialog("New Directory");
        dlg.add(new sh.Label("Create a new directory."));
        var entry = new sh.TextInput("");
        dlg.add(new sh.Labeled("Name:", entry));
        dlg.addButton("Create", function ()
        {
            var name = entry.value();
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
        dlg.show();
    }

    function makeNewFile()
    {
        var dlg = new sh.Dialog("New File");
        dlg.add(new sh.Label("Create a new file."));
        var entry = new sh.TextInput("");
        dlg.add(new sh.Labeled("Name:", entry));
        dlg.addButton("Create", function ()
        {
            var name = entry.value();
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
        dlg.show();
    }

    function loadThumbnails()
    {
        console.log("Location: " + m_currentUri);

        var items = [];
        m_page.get().find(".fileitem").each(function (idx)
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

        var dlg = new sh.Dialog("Rename File");
        dlg.add(new sh.Label("Rename the file."));
        var entry = new sh.TextInput(name);
        dlg.add(new sh.Labeled("Name:", entry));
        dlg.addButton("Rename", function ()
        {
            var newName = entry.value();
            var targetUri = joinPath(m_currentUri, encodeURIComponent(newName));

            file.move(meta.uri, targetUri, function (ok)
            {
                if (ok)
                {
                    console.log("File moved: " + name + " -> " + newName);
                    $(item).find("h1").html(sh.escapeHtml(newName));
                    loadDirectory(m_currentUri, false);    
                }
                else
                {
                    ui.showError("Failed to move: " + name + " to " + newName);
                }
            });
        }, true);
        dlg.addButton("Cancel");
        dlg.show();
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
        m_page.get().find(".fileitem > div.selector").addClass("sh-selected");
        m_properties.filesSelected.assign(files.predicates.filesSelected());
    }

    function unselectAll()
    {
        m_page.get().find(".fileitem > div.selector").removeClass("sh-selected");
        m_properties.filesSelected.assign(files.predicates.filesSelected());
    }

    function toggleSelect(item)
    {
        $(item).toggleClass("sh-selected");
        m_properties.filesSelected.assign(files.predicates.filesSelected());
    }

    files.predicates.filesSelected = function ()
    {
        var size = m_page.get().find(".fileitem > div.selector.sh-selected").length;
        return size;
    }

    files.predicates.oneFileSelected = function ()
    {
        var size = m_page.get().find(".fileitem > div.selector.sh-selected").length;
        return size === 1;
    }

    files.predicates.clipboardFilled = function ()
    {
        return m_properties.clipboard.value().length > 0;
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
            .map(function (p) { return m_properties.permissions.value().indexOf(p) !== -1; })
            .reduce(function (a, b) { return a && b; }, true);
        };
    }

    files.predicates.mimeTypeSelected = function (mimeType)
    {
        return function ()
        {
            var v = false;
            var items = m_page.get().find(".fileitem > div.selector.sh-selected");
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
            var items = m_page.get().find(".fileitem > div.selector.sh-selected");
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
        var isFav = !! favs.find(function (a) { return a.uri === m_currentUri; });
        var isShare = !! m_properties.shares.value().find(function (a) { return a.uri === m_currentUri; });

        console.log(JSON.stringify(m_properties.shares.value()) + " current " + m_currentUri);

        var menu = sh.element(sh.Menu)
        .add(
            sh.element(sh.SubMenu).text("Favorites")
            .add(
                sh.element(sh.MenuItem).text("Remove from Favorites")
                .visible(isFav)
                .callback(removeFavorite)
            )
            .add(
                sh.element(sh.MenuItem).text("Add to Favorites")
                .visible(! isFav)
                .callback(addFavorite)
            )
            .add(
                sh.element(sh.Separator)
            )
        )
        .add(
            sh.element(sh.SubMenu).text("Shares")
            .visible(files.predicates.permissions("SHARE"))
            .add(
                sh.element(sh.MenuItem).text("Unshare This")
                .visible(isShare)
                .callback(unshare)
            )
            .add(
                sh.element(sh.MenuItem).text("Share This")
                .visible(! isShare)
                .callback(showShareDialog)
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
                .callback(function ()
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
                .callback(function ()
                {
                    m_scrollPositionsMap = { };
                    loadDirectory(s.uri, true);
                })
            );
        });

        menu.add(
            sh.element(sh.MenuItem).text("/")
            .callback(function ()
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
                sh.element(sh.MenuItem).text(decodeURIComponent(parts[i]))
                .callback(function (uri)
                {
                    return function ()
                    {
                        m_scrollPositionsMap = { };
                        loadDirectory(uri, true);
                    };
                }(breadcrumbUri))
            );
        }

        menu.get().popup(m_page.get().find("> header > div"));
    }

    function setupStatusBox()
    {
        var statusBox = $(
            sh.tag("div").id("statusbox")
            .style("position", "fixed")
            .style("bottom", "0")
            .style("left", "0")
            .style("right", "0")
            .style("height", "auto")
            .style("border", "solid 1px var(--color-border)")
            .style("background-color", "var(--color-primary-background)")
            .html()
        );

        m_page.get().append(statusBox);
    }

    function setupNavBar()
    {
        var navBar = $(sh.tag("div").class("files-navbar")
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

        m_page.get().find("> section").append(navBar);

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
            m_page.get().addClass("sh-page-transitioning");
            m_page.get().find("> section").scrollTop(scrollBegin);
            this.touchContext = {
                top: $(this).offset().top,
                scrollBegin: scrollBegin,
                scrollTarget: 0
            };
        });

        navBar.on("touchend", function (event)
        {
            m_page.get().find("> section").css("margin-top", 0);
            m_page.get().removeClass("sh-page-transitioning");
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

            var scrollTop = (navBar.height() + m_page.get().find("> header").height() - $(window).height()) * percents;

            m_page.get().find("> section").css("margin-top", (-scrollTop) + "px");
            this.touchContext.scrollTarget = scrollTop;        
        });
    }

    function updateNavBar()
    {
        var navBar = m_page.get().find(".files-navbar");
        navBar.html("");
        navBar.height(0);

        var items = m_page.get().find(".fileitem");
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
                    sh.tag("span")
                    .style("position", "absolute")
                    .style("top", (item.offset().top - m_page.get().find("> header").height()) + "px")
                    .style("left", "0")
                    .style("right", "0")
                    .content(letter)
                    .html()
                )
                currentLetter = letter;
                previousOffset = offset;
            }
        }

        var windowHeight = $(window).height() - m_page.get().find("> header").height() - 1;
        var contentHeight = m_page.get().find("> section").height();
        var minHeight = Math.max(windowHeight, contentHeight);
        navBar.height(Math.max(windowHeight, contentHeight));
        //log("win height: " + $(window).height() + ", content height: " + contentHeight);
    }

    function loadDirectory(uri, pushToHistory)
    {
        var busyIndicator = new sh.BusyPopup("Loading");
        busyIndicator.show();

        m_scrollPositionsMap[m_currentUri] = $(document).scrollTop();

        m_page.get().find("> section").html("");

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
            if (status === "parsererror")
            {
                window.location.reload();
            }
            else
            {
                ui.showError("Failed to load directory.");
            }
        })
        .always(function ()
        {
            busyIndicator.hide();
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
    
        var filesBox = m_page.get().find("> section");

        switch (configuration.get("view-mode", "list"))
        {
        case "list":
            var listView = new sh.ListView();
            listView.get().css("margin-left", "32px");

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
                item.callback = function ()
                {
                    openFile(entry);
                };
                item.get().addClass("fileitem");
                item.get().data("meta", entry);
                item.action = ["sh-icon-checked-circle", function ()
                {
                    toggleSelect(item.get().find(".selector"));
                }];
                if (entry.icon)
                {
                    item.icon = entry.icon;
                }
                listView.add(item);
            });
            m_page.add(listView);
            break;

        case "grid":
            var gridView = $(
                sh.tag("div")
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
                    sh.tag("div").class("fileitem icon")
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
                        sh.tag("h1")
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
                        sh.tag("div").class("selector")
                        .style("position", "absolute")
                        .style("top", "0")
                        .style("right", "0")
                        .style("width", "42px")
                        .style("height", "42px")
                        .style("text-align", "center")
                        .content(
                            sh.tag("span").class("sh-fw-icon sh-icon-checked-circle")
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
        m_properties.shares.assign(data.shares);
        m_properties.permissions.assign(data.permissions);

        var isFav = configuration.get("favorites", []).find(function (a) { return a.uri === m_currentUri; }) !== undefined;
        var isShare = m_properties.shares.value().find(function (a) { return a.uri === m_currentUri; }) !== undefined;

        setupNavBar();
        m_page.setTitle(decodeURIComponent(data.uri));
        m_page.setSubtitle(files.length + " items");
        document.title = "Pilvini - " + decodeURIComponent(data.uri);

        if (data.uri === "/")
        {
            m_backButton.get().css("visibility", "hidden");
        }
        else
        {
            m_backButton.get().css("visibility", "visible");
        }

        if (isFav)
        {
            m_page.get().find("> header h1").prepend($(
                sh.tag("span").class("sh-fw-icon sh-icon-star-circle").content(" ").html()
            ));
        }
        if (isShare)
        {
            m_page.get().find("> header h1").prepend($(
                sh.tag("span").class("sh-fw-icon sh-icon-share").content(" ").html()
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
                m_properties.clipboard.push(targetMeta);
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
                    m_properties.clipboard.assign([]);
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
            m_properties.clipboard.assign(data.files);
        })
        .fail(function (xhr, status, err)
        {
            //ui.showError("Failed to load clipboard contents.");
        });
    }

    function openClipboardPage()
    {
        var clipboardPage = new sh.Page("Clipboard", "");
        clipboardPage.setSwipeBack(function () { clipboardPage.pop(); });
        clipboardPage.addToHeaderLeft(new sh.IconButton("sh-icon-back", function () { clipboardPage.pop(); }));
        clipboardPage.push();

        var listView = new sh.ListView();
        clipboardPage.add(listView);

        m_properties.clipboard.value().forEach(function (entry)
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
            if (entry.icon)
            {
                item.icon = entry.icon;
            }
            listView.add(item);
        });
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

    m_page = new sh.Page("", "");
    m_page.get().find("> header > div").on("click", openPathMenu);
    m_page.setSwipeBack(cdUp);
    m_backButton = new sh.IconButton("sh-icon-back", cdUp);
    m_page.addToHeaderLeft(m_backButton);
    m_page.addToHeaderRight(new sh.IconButton("sh-icon-menu", function (button)
    {
        var menu = m_actionsMenu.get(); //.create();
        menu.popup(button.get());
    }));
    m_page.get().append($(
        sh.tag("footer").class("sh-dropshadow")
        .html()
    ));

    m_page.push();


    /* setup properties */
    m_properties.filesSelected = sh.binding(0);
    m_properties.clipboard = sh.binding([]);
    m_properties.clipboardFilled = sh.binding(false);
    m_properties.shares = sh.binding([]);
    m_properties.permissions = sh.binding([]);


    /* setup actions menu */
    var m_actionsMenu = sh.element(sh.Menu)
    .add(
        sh.element(sh.SubMenu).text("View")
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-view-as-list").text("As List")
            .callback(function () { setViewMode("list"); })
        )
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-view-as-grid").text("As Grid")
            .callback(function () { setViewMode("grid"); })
        )
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-alphabet")
            .callback(function () { setSortMode("name"); })
        )
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-clock")
            .callback(function () { setSortMode("date"); })
        )
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-number")
            .callback(function () { setSortMode("number"); })
        )
    )
    .add(
        sh.element(sh.SubMenu).text("New")
        .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-folder").text("Directory...")
            .callback(makeNewDirectory)
        )
        .add(
            sh.element(sh.MenuItem).icon("sh-icon-file").text("File...")
            .callback(makeNewFile)
        )
    )
    .add(
        sh.element(sh.SubMenu).text("Clipboard")
        .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
        .add(
            sh.element(sh.MenuItem).text("Cut").icon("sh-icon-clipboard-cut")
            .enabled(sh.predicate([m_properties.filesSelected], function () { return m_properties.filesSelected.value() > 0; }))
            .callback(eachSelected(cutToClipboard))
        )
        .add(
            sh.element(sh.MenuItem).text("Copy").icon("sh-icon-clipboard-copy")
            .enabled(sh.predicate([m_properties.filesSelected], function () { return m_properties.filesSelected.value() > 0; }))
            .callback(eachSelected(copyToClipboard))
        )
        .add(
            sh.element(sh.MenuItem).text("Paste").icon("sh-icon-clipboard-paste")
            .enabled(sh.predicate([m_properties.clipboard], function () { return m_properties.clipboard.value().length > 0; }))
            .callback(pasteFromClipboard)
        )
        .add(
            sh.element(sh.MenuItem).text("Show").icon("sh-icon-clipboard")
            .enabled(sh.predicate([m_properties.clipboard], function () { return m_properties.clipboard.value().length > 0; }))
            .callback(openClipboardPage)
        )
    )
    .add(
        sh.element(sh.SubMenu).text("Action")
        .add(
            sh.element(sh.MenuItem).text("Upload...").icon("sh-icon-cloud-upload")
            .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("CREATE") !== -1; }))
            .callback(function () { $("#upload").click(); })
        )
        .add(
            sh.element(sh.MenuItem).text("Download").icon("sh-icon-download")
            .enabled(sh.predicate([m_properties.filesSelected], function () { return m_properties.filesSelected.value() > 0; }))
            .callback(eachSelected(downloadItem))
        )
        .add(
            sh.element(sh.MenuItem).text("Rename...").icon("sh-icon-rename")
            .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("MODIFY") !== -1; }))
            .enabled(sh.predicate([m_properties.filesSelected], function () { return m_properties.filesSelected.value() === 1; }))
            .callback(eachSelected(renameItem))
        )
        .add(
            sh.element(sh.MenuItem).text("Delete").icon("sh-icon-trashcan")
            .visible(sh.predicate([m_properties.permissions], function () { return m_properties.permissions.value().indexOf("DELETE") !== -1; }))
            .enabled(sh.predicate([m_properties.filesSelected], function () { return m_properties.filesSelected.value() > 0; }))
            .callback(removeSelected)
        )
    )
    .add(
        sh.element(sh.MenuItem).text("Select All")
        .callback(selectAll)
    )
    .add(
        sh.element(sh.MenuItem).text("Unselect All")
        .enabled(sh.predicate([m_properties.filesSelected], function () { return m_properties.filesSelected.value() > 0; }))
        .callback(unselectAll)
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
