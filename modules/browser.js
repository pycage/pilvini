"use strict";

const attempt = require("./attempt.js").attempt;

const modFs = require("fs"),
      modPath = require("path"),
      modHtml = require("./html.js"),
      modMime = require("./mime.js"),
      modThumbnail = attempt(function () { return require("./thumbnail.js"); }),
      modUtils = require("./utils.js");

const MIME_INFO = {
    "application/java-archive": { "icon": "package.png" },
    "application/ogg": { "icon": "audio.png", "viewer": "viewAudio" },
    "application/pdf": { "icon": "pdf.png", "viewer": "viewPdf" },
    "application/vnd.oasis.opendocument.text": { "icon": "document.png" },
    "application/x-batch": { "icon": "text.png", "viewer": "viewText" },
    "application/x-python": { "icon": "text.png", "viewer": "viewText" },
    "application/x-shellscript": { "icon": "text.png", "viewer": "viewText" },
    "application/x-gzip": { "icon": "package.png" },
    "application/x-iso9660-image": { "icon": "optical.png" },
    "application/zip": { "icon": "package.png" },
    "audio/mp3": { "icon": "audio.png", "viewer": "viewAudio" },
    "image/gif": { "icon": "image.png", "viewer": "viewImage" },
    "image/jpeg": { "icon": "image.png", "viewer": "viewImage" },
    "image/png": { "icon": "image.png", "viewer": "viewImage" },
    "image/svg+xml": { "icon": "image.png", "viewer": "viewImage" },
    "text/html": { "icon": "html.png" },
    "text/plain": { "icon": "text.png", "viewer": "viewText" },
    "text/rtf": { "icon": "document.png" },
    "text/vcard": { "icon": "contacts.png", "viewer": "viewVCard" },
    "text/x-markdown": { "icon": "document.png", "viewer": "viewMarkdown" },
    "video/mp4": { "icon": "video.png" },
    "video/x-flv": { "icon": "video.png" },
    "video/x-msvideo": { "icon": "video.png" }
};

function readSettings(userRoot)
{
    var settingsFile = modPath.join(userRoot, ".pilvini", "settings.json");
    if (! modFs.existsSync(settingsFile))
    {
        return { };
    }

    try
    {
        var settings = modFs.readFileSync(settingsFile, "utf8");
    }
    catch (err)
    {
        console.error("Failed to read settings: " + err);
        return { };
    }

    try
    {
        return JSON.parse(settings);
    }
    catch (err)
    {
        console.error("Invalid settings document: " + err);
        return { };
    }
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

function getIcon(mimeType)
{
    var info = MIME_INFO[mimeType];
    if (info)
    {
        return "/::res/file-icons/" + info.icon;
    }
    else
    {
        return "/::res/file-icons/text.png"
    }
}

function prepareClipboard(userRoot, callback)
{
    var path = modPath.join(userRoot, ".pilvini", "clipboard");

    // create clipboard if missing
    modFs.stat(path, function (err, stats)
    {
        if (err)
        {
            modUtils.mkdirs(path, function (err)
            {
                callback();
            });
        }
        else
        {
            callback();
        }
    });
}

function readStats(sortMode, path, callback)
{
    modFs.readdir(path, function (err, files)
    {
        if (err || files.length === 0)
        {
            callback([]);
            return;
        }

        var result = [];
        for (var i = 0; i < files.length; ++i)
        {
            var file = files[i];
            modFs.stat(modPath.join(path, file), function (file) { return function (err, stat)
            {
                result.push([file, stat]);
                if (result.length === files.length)
                {
                    var r = result
                    .filter(function (a)
                    {
                        return !! a[1];
                    })
                    .sort(function (a, b)
                    {
                        if (a[1].isDirectory() && ! b[1].isDirectory())
                        {
                            return -1;
                        }
                        else if (! a[1].isDirectory() && b[1].isDirectory())
                        {
                            return 1;
                        }
                        else
                        {
                            switch (sortMode)
                            {
                            case "date":
                                return a[1].mtime < b[1].mtime ? -1 : 1;
                            case "date-desc":
                                return a[1].mtime > b[1].mtime ? -1 : 1;
                            case "name-desc":
                                return a[0].toLowerCase() > b[0].toLowerCase() ? -1 : 1;
                            default:
                                return a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1;
                            }
                        }
                    });

                    callback(r);
                }
            }; } (file));
        }
    });
}

function makeInfo(file, stat)
{
    var info = (stat.size / (1024 * 1024)).toFixed(2) + " MB, " +
            stat.mtime.toDateString();
    return info;
}

function makeIcon(icon)
{
    var tag = modHtml.tag;

    return tag("div").class("sh-left")
           .style("width", "80px")
           .style("background-image", "url(" + icon + ")")
           .style("background-size", "48px")
           .style("background-repeat", "no-repeat")
           .style("background-position", "50% 50%");
}

function makeThumbnail(icon, uri)
{
    var tag = modHtml.tag;

    return tag("div").class("thumbnail sh-left")
           .data("x-thumbnail", "/::thumbnail" + uri)
           .style("width", "80px")
           .style("background-image", "url(" + icon + ")")
           .style("background-size", "48px")
           .style("background-repeat", "no-repeat")
           .style("background-position", "50% 50%");
}

function makeFileItem(pathUri, file, stat, active, callback)
{
    var mimeType = modMime.mimeType(file);
    var mimeInfo = MIME_INFO[mimeType];
    var icon = getIcon(mimeType);
    var info = "";
    var uri = (pathUri + "/" + encodeURIComponent(file)).replace(/'/g, "%27").replace("//", "/");
    var action = "window.location.href=\"" + uri + "\";";

    var iconHtml = "";

    if (active && mimeInfo && mimeInfo.viewer)
    {
        action = mimeInfo.viewer + "(\"" + uri + "\");";
    }

    if (stat.isDirectory())
    {
        mimeType = "application/x-folder";
        icon = "/::res/file-icons/folder.png";
        iconHtml = makeIcon(icon);
        action = "loadDirectory(\"" + uri + "\");";
    }
    else if (mimeType.startsWith("image/") ||
             mimeType.startsWith("audio/"))
    {
        if (! modThumbnail)
        {
            iconHtml = makeIcon(icon);
        }
        else
        {
            iconHtml = makeThumbnail(icon, uri);
        }

        info = makeInfo(file, stat);
    }
    else
    {
        info = makeInfo(file, stat);
        iconHtml = makeIcon(icon);
    }

    return callback(uri, info, mimeType, action, iconHtml);
}

function makeFiles(uri, stats, active)
{
    var tag = modHtml.tag;
    var t = tag("ul").class("sh-listview");

    for (var i = 0; i < stats.length; ++i)
    {
        var file = stats[i][0];
        var stat = stats[i][1];

        if (! stat || file.indexOf(".") === 0)
        {
            continue;
        }

        t.content(makeFileItem(uri, file, stat, active, function (uri, info, mimeType, action, iconHtml)
        {
            var tag = modHtml.tag;

            var t = tag("li").class("fileitem filelink")
                    .style("height", "80px")
                    .data("mimetype", mimeType)
                    .data("url", uri)
                    .content(iconHtml)
                    .content(
                        tag("div")
                        .style("position", "absolute")
                        .style("left", "80px")
                        .style("right", "42px>")
                        .style("top", "1em")
                        .style("padding-left", "0.5em")
                        .content(
                            tag("h1")
                            .content(escapeHtml(file))
                        )
                        .content(
                            tag("h2").class("sh-font-small")
                            .content(info)
                        )
                    );

            if (action !== "")
            {
                t = t.on("click", action);
            }

            if (active)
            {
                t = t.content(
                        tag("div").class("sh-right")
                        .style("width", "42px")
                        .style("text-align", "center")
                        .style("border-left", "solid 1px var(--color-border)")
                        .on("click", "event.stopPropagation(); toggleSelect(this);")
                        .content(
                            tag("span").class("sh-icon-checked-circle")
                            .style("width", "42px")
                            .style("text-align", "center")
                            .style("line-height", "80px")
                        )
                    );
            }

            return t;
        }));
    }

    return t.html();
}

function makeFilesGrid(sortMode, uri, stats, active)
{
    function getSectionHeader(name, stat)
    {
        if (sortMode === "name" || sortMode === "name-desc")
        {
            return name[0];
        }
        else
        {
            return stat.mtime.toDateString();
        }
    }

    var tag = modHtml.tag;
    var t = tag("div");

    var currentP = tag("p");
    t.content(currentP);

    var currentHeader = "";
    for (var i = 0; i < stats.length; ++i)
    {
        var file = stats[i][0];
        var stat = stats[i][1];

        if (! stat || file.indexOf(".") === 0)
        {
            continue;
        }

        var thisHeader = getSectionHeader(file, stat);
        if (thisHeader !== currentHeader)
        {
            currentHeader = thisHeader;
            t.content(tag("h3").content(thisHeader));
            currentP = tag("p");
            t.content(currentP);
        }
        
        currentP.content(makeFileItem(uri, file, stat, active, function (uri, info, mimeType, action, iconHtml)
        {
            var tag = modHtml.tag;
            
            var t = tag("div").class("fileitem")
                    .style("position", "relative")
                    .style("display", "inline-block")
                    .style("width", "80px")
                    .style("height", "80px")
                    .data("mimetype", mimeType)
                    .data("url", uri)
                    .content(iconHtml);

            if (action !== "")
            {
                t = t.on("click", action);
            }

            return t;
        }))
        .content("&nbsp;");
    }

    return t.html();
}

function makeHtmlHead()
{
    var tag = modHtml.tag;
    var t = tag("head")
            .content(tag("title"))
            .content(
                tag("meta")
                .attr("http-equiv", "Content-Type")
                .attr("content", "text/html; charset=utf-8")
            )
            .content(
                tag("meta")
                .attr("name", "viewport")
                .attr("content", "width=device-width, initial-scale=1")
            )
            .content(
                tag("link")
                .attr("rel", "icon")
                .attr("type", "image/png")
                .attr("sizes", "192x192")
                .attr("href", "/::res/favicon.png")
            )
            .content(
                tag("link")
                .attr("rel", "icon")
                .attr("type", "image/png")
                .attr("sizes", "32x32")
                .attr("href", "/::res/favicon-32x32.png")
            )
            .content(
                tag("link")
                .attr("rel", "apple-touch-icon")
                .attr("type", "image/png")
                .attr("sizes", "180x180")
                .attr("href", "/::res/apple-touch-icon.png")
            )
            .content(
                tag("link")
                .attr("rel", "stylesheet")
                .attr("href", "/::res/shellfish/style/shellfish.css")
            )
            .content(
                tag("script").attr("src", "https://code.jquery.com/jquery-2.1.4.min.js")
            )
            .content(
                tag("script").attr("src", "/::res/shellfish/core/shellfish.js")
            )
            .content(
                tag("script").attr("src", "/::res/browser/index.js")
            )
            .content(
                tag("script").attr("src", "/::res/viewer/audio.js")
            )
            .content(
                tag("script").attr("src", "/::res/viewer/image.js")
            )
            .content(
                tag("script").attr("src", "/::res/viewer/markdown.js")
            )
            .content(
                tag("script").attr("src", "/::res/viewer/pdf.js")
            )
            .content(
                tag("script").attr("src", "/::res/viewer/text.js")
            )
            .content(
                tag("script").attr("src", "/::res/viewer/vcard.js")
            );

    return t.html();
}

function makeBreadcrumbs(uri)
{
    var uriParts = uri.split("/");

    var tag = modHtml.tag;
    var t = tag("ul")
            .content(
                tag("li").on("click", "loadDirectory(\"/\");").content("/")
            );

    var breadcrumbUri = "";
    for (var i = 0; i < uriParts.length; ++i)
    {
        if (uriParts[i] === "")
        {
            continue;
        }

        breadcrumbUri += "/" + uriParts[i];
        t.content(
            tag("li").on("click", "loadDirectory(\"" + breadcrumbUri.replace(/'/g, "%27") + "\");").content(escapeHtml(decodeURI(uriParts[i])))
        )
        //out += "  <li onclick=\"loadDirectory('" + breadcrumbUri.replace(/'/g, "%27") + "');\">" + escapeHtml(decodeURI(uriParts[i])) + "</li>";
    }

    return t.html();
}

function makeFavorites(userRoot)
{
    var tag = modHtml.tag;
    var t = tag("");

    var favsFile = modPath.join(userRoot, ".pilvini", "favorites.json");
    if (! modFs.existsSync(favsFile))
    {
        return t.html();
    }

    try
    {
        var favs = modFs.readFileSync(favsFile, "utf8");
    }
    catch (err)
    {
        console.error("Failed to read favorites: " + err);
        return t.html();
    }

    try
    {
        var doc = JSON.parse(favs);
    }
    catch (err)
    {
        console.error("Invalid favorites document: " + err);
        return t.html();
    }

    if (doc.length === 0)
    {
        return t.html();
    }

    for (var i = 0; i < doc.length; ++i)
    {
        var node = doc[i];
        var href = node["href"];
        var name = node["name"];

        t.content(
            tag("li").on("click", "loadDirectory(\"" + href.replace(/'/g, "%27") + "\");")
            .content(
                tag("span").class("sh-fw-icon sh-icon-star-circle")
            )
            .content(name)
        );
    }

    t.content(tag("hr"));

    return t.html();
}

function makeShares(userHome, shares)
{
    var tag = modHtml.tag;
    var t = tag("");
    
    shares.shares().forEach(function (shareId)
    {
        var shareRoot = shares.info(shareId).root;
        if (shareRoot.substr(0, userHome.length) === userHome)
        {
            // this share is within reach of the user
            var uri = encodeURI(shareRoot.substr(userHome.length));

            t.content(
                tag("li").on("click", "loadDirectory(\"" + uri + "\");")
                .content(
                    tag("span").class("sh-fw-icon sh-icon-share")
                )
                .content(shareId)
            );
        }
    });
    
    t.content(tag("hr"));

    return t.html();
}

function isFavorite(uri, userRoot)
{
    var favsFile = modPath.join(userRoot, ".pilvini", "favorites.json");
    if (! modFs.existsSync(favsFile))
    {
        return false;
    }

    try
    {
        var favs = modFs.readFileSync(favsFile, "utf8");
    }
    catch (err)
    {
        console.error("Failed to read favorites: " + err);
        return false;
    }

    try
    {
        var doc = JSON.parse(favs);
    }
    catch (err)
    {
        console.error("Invalid favorites document: " + err);
        return false;
    }

    return doc.find(function (a) { return a.href === uri; }) !== undefined;
}

function makeMoreMenu(viewMode, sortMode, permissions)
{
    var sortByNameExt = "";
    var sortByDateExt = "";

    switch (sortMode)
    {
    case "name":
        sortByNameExt = " (↓)";
    break;
    case "name-desc":
        sortByNameExt = " (↑)";
        break;
    case "date":
        sortByDateExt = " (↓)";
        break;
    case "date-desc":
        sortByDateExt = " (↑)";
        break;
    }

    var out = "";
    out += "<div id='more-menu' class='sh-menu' onclick='sh.menu_close();'>";

    out += "  <div onclick='event.stopPropagation();'>";
    if (permissions.mayModify())
    {
        out += "    <h1 class='sh-submenu' onclick='sh.toggle_submenu(this);'>View</h1>" +
               "    <ul>" +
               "      <li id='mi-listview' onclick='changeSettings(\"view\", \"list\");'>As List</li>" +
               "      <li id='mi-gridview' onclick='changeSettings(\"view\", \"grid\");'>As Grid</li>" +
               "      <li id='mi-sort-by-name' onclick='changeSettings(\"sort\", \"name\", \"name-desc\");'>By Name" + sortByNameExt + "</li>" +
               "      <li id='mi-sort-by-date' onclick='changeSettings(\"sort\", \"date\", \"date-desc\");'>By Date" + sortByDateExt + "</li>" +
               "    </ul>";
    }

    if (permissions.mayCreate())
    {
        out += "    <h1 class='sh-submenu' onclick='sh.toggle_submenu(this);'>New</h1>" +
               "    <ul>" +
               "      <li id='mi-newdir' onclick='sh.menu_close(); showNewDirDialog();'>Directory</li>" +
               "      <li id='mi-newfile' onclick='sh.menu_close(); showNewFileDialog();'>File</li>" +
               "    </ul>";
    }

    if (permissions.mayCreate())
    {
        out += "    <h1 class='sh-submenu' onclick='sh.toggle_submenu(this);'>Clipboard</h1>" +
               "    <ul>" +
               "      <li id='mi-cut' onclick='sh.menu_close(); clearClipboard(function () { eachSelected(cutItem); });'>Cut</li>" +
               "      <li id='mi-copy' onclick='sh.menu_close(); clearClipboard(function () { eachSelected(copyItem); });'>Copy</li>" +
               "      <li id='mi-paste' onclick='sh.menu_close(); pasteItems();'>Paste</li>" +
               "      <li id='mi-showclipboard' onclick='sh.menu_close(); sh.push(\"clipboard-page\");'>Show</li>" +
               "    </ul>";
    }

    out += "    <h1 class='sh-submenu' onclick='sh.toggle_submenu(this);'>Action</h1>" +
           "    <ul>";

    if (permissions.mayCreate())
    {
        out += "<li id='mi-upload' onclick='sh.menu_close(); $(\"#upload\").click();'>Upload</li>";
    }

    out += "<li id='mi-download' onclick='sh.menu_close(); eachSelected(downloadItem);'>Download</li>";
    
    if (permissions.mayModify())
    {
        out += "<li id='mi-rename' onclick='sh.menu_close(); eachSelected(showNameDialog);'>Rename</li>";
    }

    if (permissions.mayDelete())
    {
        out += "<li id='mi-delete' onclick='sh.menu_close(); removeSelected();'>Delete</li>";
    }
    
    out += "    </ul>";

    out += "    <ul>" +
           "      <li id='mi-selectall' onclick='sh.menu_close(); selectAll();'>Select All</li>" +
           "      <li id='mi-unselectall' onclick='sh.menu_close(); unselectAll();'>Unselect All</li>" +
           "    </ul>";

    out += "  </div>" +
           "</div>";

    return out;
}

function makeMessageDialog()
{
    var out = "<div id='message-dialog' class='sh-popup'>" +

              "  <div class='sh-dropshadow' style='background-color: var(--color-primary-background);'>" +
              "    <header><h1 class='sh-left'></h1></header>" +
              "    <section><p></p></section>" +
              "    <footer><span class='sh-right'><a onclick='sh.popup_close(\"message-dialog\");'>OK</a></span></footer>" +
              "  </div>" +

              "</div>";

    return out;
}

function makeQuestionDialog()
{
    var out = "<div id='question-dialog' class='sh-popup'>" +

              "  <div class='sh-dropshadow' style='background-color: var(--color-primary-background);'>" +
              "    <header><h1 class='sh-left'></h1></header>" +
              "    <section><p></p></section>" +
              "    <footer>" +
              "      <span class='sh-right'>" +
              "        <a onclick='sh.popup_close(\"question-dialog\");'>Yes</a>" +
              "        <a onclick='sh.popup_close(\"question-dialog\");'>No</a>" +
              "      </span>" +
              "    </footer>" +
              "  </div>" +

              "</div>";

    return out;
}

function makeNewDirDialog()
{
    var out = "<div id='newdir-dialog' class='sh-popup'>" +
    
              "  <div class='sh-dropshadow' style='background-color: var(--color-primary-background);'>" +
              "    <header><h1 class='sh-left'>New directory</h1></header>" +

              "    <section>" +
              "      <form>" +
              "        <label>Name:</label>" +
              "        <input type='text'>" +
              "      </form>" +
              "    </section>" +

              "    <footer>" +
              "      <span class='sh-right'>" +
              "        <a>Create</a>" +
              "        <a onclick='sh.popup_close(\"newdir-dialog\");'>Cancel</a>" +
              "      </span>" +
              "    </footer>" +

              "  </div>" +

              "</div>";

    return out;
}

function makeNameDialog()
{
    var out = "<div id='name-dialog' class='sh-popup'>" +
    
              "  <div class='sh-dropshadow' style='background-color: var(--color-primary-background);'>" +
              "    <header><h1 class='sh-left'>Enter name</h1></header>" +

              "    <section>" +
              "      <form>" +
              "        <label>Name:</label>" +
              "        <input type='text'>" +
              "      </form>" +
              "    </section>" +

              "    <footer>" +
              "      <span class='sh-right'>" +
              "        <a>Accept</a>" +
              "        <a onclick='sh.popup_close(\"name-dialog\");'>Cancel</a>" +
              "      </span>" +
              "    </footer>" +

              "  </div>" +

              "</div>";

    return out;
}

function makeShareDialog()
{
    var out = "<div id='share-dialog' class='sh-popup'>" +
    
              "  <div class='sh-dropshadow' style='background-color: var(--color-primary-background);'>" +
              "    <header><h1 class='sh-left'>Setup Share</h1></header>" +

              "    <section>" +
              "      <form>" +
              "        <label>Login:</label>" +
              "        <input type='text'>" +
              "        <br>" +
              "        <label>Password:</label>" +
              "        <input type='text'>" +
              "      </form>" +
              "    </section>" +

              "    <footer>" +
              "      <span class='sh-right'>" +
              "        <a>Accept</a>" +
              "        <a onclick='sh.popup_close(\"share-dialog\");'>Cancel</a>" +
              "      </span>" +
              "    </footer>" +

              "  </div>" +

              "</div>";

    return out;
}

function makeBusyPopup()
{
    var out = "<div id='busy-popup' class='sh-popup'>" +

              "  <div style='color: var(--color-primary);" +
              "              text-align: center;" +
              "              padding: 1em;" +
              "              '>" +
              "    <span class='sh-busy-indicator' style='font-size: 200%;'></span><br><br>" +
              "    <span>Loading</span>" +
              "  </div>" +

              "</div>";

    return out;
}

function makeImagePopup()
{
    var out = "<div id='image-popup' class='sh-popup' style='background-color: rgba(0, 0, 0, 0.8);' onclick='sh.popup_close(\"image-popup\");'>" +
              "  <div class='sh-dropshadow' style='position: relative; background-color: black; overflow: hidden;'>" +
              "    <h1 class='sh-font-small' style='position: absolute; margin: 0; padding: 0; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; text-align: left; left: 0.25em; right: 0.25em; bottom: 0.25em; text-shadow: #000 0px 0px 1px; color: white;'></h1>" +
              "    <img>" +
              "  </div>" +
              "</div>";

    return out;
}

function makeMainPage(viewMode, sortMode, prefix, contentRoot, userHome, uri, path, stats, permissions, shares)
{
    var parentUri = modPath.dirname(uri);
    var isFav = permissions.mayModify() ? isFavorite(uri, contentRoot + userHome)
                                        : false;
    // FIXME: URI relative to server root is required
    var isShare = shares.isShare(path);

    var out = "<div id=\"main-page\" class=\"sh-page\">" +

              makeMoreMenu(viewMode, sortMode, permissions) +

              "  <div id=\"breadcrumbs\" class=\"sh-menu\" onclick=\"sh.menu_close();\">" +
              "    <div>";
    if (permissions.mayModify())
    {
        out += "<h1 class='sh-submenu' onclick='sh.toggle_submenu(this); event.stopPropagation();'>Favorites</h1>" +
               "<ul>" +
               (isFav ? "<li onclick='removeFavorite();'>Remove from Favorites</li>"
                      : "<li onclick='addFavorite();'>Add to Favorites</li>") +
               "  <hr/>";
        out += makeFavorites(contentRoot + userHome);
        out += "</ul>";
    }
    if (permissions.mayShare())
    {
        out += "<h1 class='sh-submenu' onclick='sh.toggle_submenu(this); event.stopPropagation();'>Public Shares</h1>" +
               "<ul>" +
               (isShare ? "<li onclick='unshare();'>Unshare This</li>"
                        : "<li onclick='showShareDialog();'>Share This</li>") +
               "  <hr/>";
        out += makeShares(userHome, shares);
        out += "</ul>";
    }
    out += makeBreadcrumbs(uri) +
              "    </div>" +
              "  </div>" +

              "  <header class=\"sh-dropshadow\">" +
              (uri !== "/" ? "<span id='upButton' class='sh-left sh-fw-icon sh-icon-arrow-up' data-url='" + parentUri + "' onclick='loadDirectory(\"" + parentUri + "\");'></span>"
                               : "") +
              "    <h1 onclick='sh.menu(this, \"breadcrumbs\");'>" + 
              (isShare ? "<span class='sh-fw-icon sh-icon-share'></span> " 
                     : "" ) +
              (isFav ? "<span class='sh-fw-icon sh-icon-star-circle'></span> " 
                     : "" ) +

              escapeHtml(decodeURI(uri)) +
              "</h1>" +
              "    <span class='sh-right sh-fw-icon sh-icon-menu' onclick='sh.menu(this, \"more-menu\");'></span>" +
              "  </header>" +

              "  <section id=\"filesbox\" data-prefix=\"" + prefix + "\" data-url=\"" + uri + "\">" +
              (viewMode === "list" ? makeFiles(uri, stats, true) : makeFilesGrid(sortMode, uri, stats, true)) +
              "  </section>" +

              "  <footer class=\"sh-dropshadow\">" +
              "  </footer>" +

              "</div>";

    return out;
}

function makeClipboardPage(clipboardStats)
{
    var out = "<div id=\"clipboard-page\" class=\"sh-page\">" +

              "  <header>" +
              "    <span class=\"sh-left sh-fw-icon sh-icon-back\" onclick=\"sh.pop();\"></span>" +
              "    <h1>Clipboard</h1>" +
              "  </header>" +

              "  <section id=\"clipboard\">" +
              makeFiles("", clipboardStats, false) +
              "  </section>" +

              "</div>";

    return out;
}

function makeViewerPage()
{
    var out = "<div id='viewer-page' class='sh-page'>" +

              "  <header>" +
              "    <span class='sh-left sh-fw-icon sh-icon-back' onclick='sh.pop();'></span>" +
              "    <h1>Viewer</h1>" +
              "  </header>" +

              "  <section>" +
              "  </section>" +

              "</div>";

    return out;
}

function makeHtml(viewMode, sortMode, prefix, contentRoot, userHome, uri, path, stats, clipboardStats, permissions, shares)
{
    var out = "<!DOCTYPE html>" +

              "<html>" +
              makeHtmlHead() +
              "<body class='sh-theme-default'>" +

              "<input id='upload' type='file' multiple style='display: none;'/>" +
              "<a id='download' data-ajax='false' href='#' download='name' style='display: none;'></a>" +
              "<audio id='audio' style='display: none;'></audio>" +

              makeMainPage(viewMode, sortMode, prefix, contentRoot, userHome, uri, path, stats, permissions, shares) +
              makeNewDirDialog() +
              makeNameDialog() +
              makeShareDialog() +
              makeMessageDialog() +
              makeQuestionDialog() +
              
              makeBusyPopup() +
              makeImagePopup() +

              makeViewerPage() +
              makeClipboardPage(clipboardStats) +

              "</body>" +
              "</html>";

    return out;
}

function createMainPage(prefix, uri, contentRoot, userHome, permissions, shares, callback)
{
    var fullPath = modUtils.uriToPath(uri, contentRoot + userHome);
    var userPath = modUtils.uriToPath(uri, userHome);

    var settings = readSettings(contentRoot + userHome);
    console.debug("Settings: " + JSON.stringify(settings));
    var viewMode = settings.view || "list";
    var sortMode = settings.sort || "name";

    console.debug("Full Path: " + fullPath + "\n" +
                  "View Mode: " + viewMode + "\n" +
                  "Sort Mode: " + sortMode);

    readStats(sortMode, fullPath, function (stats)
    {
        var html = makeMainPage(viewMode, sortMode, prefix, contentRoot, userHome, uri, userPath, stats, permissions, shares);
        callback(true, html);
    });
}
exports.createMainPage = createMainPage;

function makeIndex(prefix, uri, contentRoot, userHome, permissions, shares, callback)
{
    var fullPath = modUtils.uriToPath(uri, contentRoot + userHome);
    var userPath = modUtils.uriToPath(uri, userHome);

    var settings = readSettings(contentRoot + userHome);
    console.debug("Settings: " + JSON.stringify(settings));
    var viewMode = settings.view || "list";
    var sortMode = settings.sort || "name";

    console.debug("Full Path: " + fullPath + "\n" +
                  "View Mode: " + viewMode + "\n" +
                  "Sort Mode: " + sortMode);

    prepareClipboard(contentRoot + userHome, function ()
    {
        readStats(sortMode, fullPath, function (stats)
        {
            readStats(sortMode, modPath.join(contentRoot + userHome, ".pilvini", "clipboard"), function (clipboardStats)
            {
                var html = makeHtml(viewMode, sortMode, prefix, contentRoot, userHome, uri, userPath, stats, clipboardStats, permissions, shares);
                callback(true, html);
            });
        });
    });
}
exports.makeIndex = makeIndex;
