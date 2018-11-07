"use strict";

const attempt = require("./attempt.js").attempt;

const modFs = require("fs"),
      modPath = require("path"),
      modMime = require("./mime.js"),
      modThumbnail = attempt(function () { return require("./thumbnail.js"); }),
      modUtils = require("./utils.js");

const MIME_INFO = {
    "application/java-archive": { "icon": "package.png" },
    "application/pdf": { "icon": "pdf.png", "viewer": "viewPdf" },
    "application/vnd.oasis.opendocument.text": { "icon": "document.png" },
    "application/x-batch": { "icon": "text.png", "viewer": "viewText" },
    "application/x-python": { "icon": "text.png", "viewer": "viewText" },
    "application/x-shellscript": { "icon": "text.png", "viewer": "viewText" },
    "application/x-gzip": { "icon": "package.png" },
    "application/x-iso9660-image": { "icon": "optical.png" },
    "application/zip": { "icon": "package.png" },
    "audio/mp3": { "icon": "audio.png" },
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

function readSettings(home)
{
    var settingsFile = modPath.join(home, ".pilvini", "settings.json");
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

function prepareClipboard(home, callback)
{
    var path = modPath.join(home, ".pilvini", "clipboard");

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
    return "<div class='sh-left'" + /*"<img src='/::res/file-icons/empty.png'" + */
           " style='width: 80px; background-image: url(" + icon + ");" +
           " background-size: 48px;" +
           " background-repeat: no-repeat;" +
           " background-position: 50% 50%;'></div>";
}

function makeThumbnail(icon, path, file)
{
    var imageFile = modPath.join(path, file);

    return "<div class='thumbnail sh-left' data-x-thumbnail='/::thumbnail" + escapeHtml(encodeURI(imageFile)) + "'" + //"' src='/::res/file-icons/empty.png'" +
           " style='width: 80px; background-image: url(" + icon + ");" +
           " background-size: 48px;" +
           " background-repeat: no-repeat;" +
           " background-position: 50% 50%;'></div>";
}

function makeItem(path, file, stat, active)
{
    var out = "";

    var mimeType = modMime.mimeType(file);
    var mimeInfo = MIME_INFO[mimeType];
    var name = file;
    var icon = getIcon(mimeType);
    var href = "";
    var info = "";
    var action = "";
    var fileUrl = encodeURI(modPath.join(path, file));

    var iconHtml = "";

    if (active && mimeInfo && mimeInfo.viewer)
    {
        action = "onclick='" + mimeInfo.viewer +
                 "(window.location.pathname.replace(/index.html$/, \"\") + \"" + escapeHtml(encodeURIComponent(file)) + "\");'";
        href="#";
    }
    else
    {
        href = active ? encodeURIComponent(file)
                      : "";
    }

    if (stat.isDirectory())
    {
        mimeType = "application/x-folder";
        href = active ? modPath.join(encodeURIComponent(file), "index.html")
                      : "#";
        icon = "/::res/file-icons/folder.png";
        iconHtml = makeIcon(icon);
        action = "onclick='window.location.href=\"" + href + "\";'"
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
            iconHtml = makeThumbnail(icon, path, file);
        }

        info = makeInfo(file, stat);
    }
    else
    {
        info = makeInfo(file, stat);
        iconHtml = makeIcon(icon);
        if (action === "")
        {
            action = "onclick='window.location.href=\"" + escapeHtml(href) + "\";'"
        }
    }

    out += "<li class='fileitem filelink' style='height: 80px;' data-mimetype='" + mimeType + "' data-url='" + escapeHtml(fileUrl) + "' " + action + ">";
    out += iconHtml;
    out += "<div style='position: absolute; left: 80px; right: 42px; top: 1em; padding-left: 0.5em;'>";
    out += "<h1>" + escapeHtml(name) + "</h1>";
    out += "<h2 class='sh-font-small'>" + info + "</h2>";
    out += "</div>";
    
    if (active)
    {
        out += "<div class='sh-right' style='width: 42px; text-align: center; border-left: solid 1px var(--color-border);' " +
               "     onclick='event.stopPropagation(); toggleSelect(this);'>" +
               "  <span class='sh-icon-checked-circle' " +
               "        style='width: 42px; text-align: center; line-height: 80px;'>" +
               "  </span>" +
               "</div>";
    }
    out += "</li>";

    return out;
}

function makeGridItem(path, file, stat, active)
{
    var out = "";

    var mimeType = modMime.mimeType(file);
    var mimeInfo = MIME_INFO[mimeType];
    var name = file;
    var icon = getIcon(mimeType);
    var href = "";
    var info = "";
    var action = "";
    var fileUrl = modPath.join(path, file);

    var iconHtml = "";

    if (active && mimeInfo && mimeInfo.viewer)
    {
        action = "onclick='" + mimeInfo.viewer +
                 "(window.location.pathname.replace(/index.html$/, \"\") + \"" + escapeHtml(encodeURIComponent(file)) + "\");'";
        href="#";
    }
    else
    {
        href = active ? encodeURIComponent(file)
                      : "";
    }

    if (stat.isDirectory())
    {
        mimeType = "application/x-folder";
        href = active ? modPath.join(encodeURIComponent(file), "index.html")
                      : "#";
        icon = "/::res/file-icons/folder.png";
        iconHtml = makeIcon(icon);
        action = "onclick='window.location.href=\"" + href + "\";'"
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
            iconHtml = makeThumbnail(icon, path, file);
        }

        info = makeInfo(file, stat);
    }
    else
    {
        info = makeInfo(file, stat);
        iconHtml = makeIcon(icon);
        if (action === "")
        {
            action = "onclick='window.location.href=\"" + escapeHtml(href) + "\";'"
        }
    }

    out += "<div class='fileitem' style='position: relative; display: inline-block; width: 80px; height: 80px;' data-mimetype='" + mimeType + "' data-url='" + escapeHtml(fileUrl) + "'" + action + ">";
    out += iconHtml;
    out += "</div>";

    /*
    if (active)
    {
        out += "<a data-icon='check' href='#' onclick='toggleSelect($(this).parent());'></a>";
    }
    */

    return out;
}

function makeFiles(path, stats, active)
{
    var out = "";
    out += "<ul class='sh-listview'>";
    for (var i = 0; i < stats.length; ++i)
    {
        var file = stats[i][0];
        var stat = stats[i][1];

        if (! stat || file.indexOf(".") === 0)
        {
            continue;
        }

        out += makeItem(path, file, stat, active);
    }
    out += "</ul>";

    return out;
}

function makeFilesGrid(sortMode, path, stats, active)
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

    var out = "";
    out += "<p>";
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
            out += "</p>";
            out += "<h3>" + thisHeader + "</h3>";
            out += "<p>";
        }
        
        out += makeGridItem(path, file, stat, active);
        out += "&nbsp;";
    }
    out += "</p>"

    return out;
}

function makeHtmlHead()
{
    var out = "<head>" +
              "  <title></title>" +
              "  <meta http-equiv='Content-Type' content='text/html; charset=utf-8'></meta>" +
              "  <meta name='viewport' content='width=device-width, initial-scale=1'></meta>" +

              "  <link rel='icon' type='image/png' sizes='192x192' href='/::res/favicon.png'>" +
              "  <link rel='icon' type='image/png' sizes='32x32' href='/::res/favicon-32x32.png'>" +
              "  <link rel='apple-touch-icon' sizes='180x180' href='/::res/apple-touch-icon.png'>" +
              "  <link rel='stylesheet' href='/::res/shellfish/style/shellfish.css'>" +

              "  <script src='https://code.jquery.com/jquery-2.1.4.min.js'></script>" +
              "  <script src='/::res/shellfish/core/shellfish.js'></script>" +
              "  <script src='/::res/browser/index.js'></script>" +

              "  <script src='/::res/viewer/image.js'></script>" +
              "  <script src='/::res/viewer/markdown.js'></script>" +
              "  <script src='/::res/viewer/pdf.js'></script>" +
              "  <script src='/::res/viewer/text.js'></script>" +
              "  <script src='/::res/viewer/vcard.js'></script>" +
              "</head>";

    return out;
}

function makeBreadcrumbs(path)
{
    var pathParts = path.split("/");

    var out = "<ul>" +
              "  <li onclick='window.location.href=\"/index.html\";'>/</li>";

    var breadcrumbPath = "";
    for (var i = 0; i < pathParts.length; ++i)
    {
        if (pathParts[i] === "")
        {
            continue;
        }

        breadcrumbPath += "/" + pathParts[i]
        out += "  <li onclick='window.location.href=\"" + escapeHtml(encodeURI(breadcrumbPath)) + "/index.html\";'>" + escapeHtml(pathParts[i]) + "</li>";
    }

    out += "</ul>";

    return out;
}

function makeFavorites(home)
{
    var favsFile = modPath.join(home, ".pilvini", "favorites.json");
    if (! modFs.existsSync(favsFile))
    {
        return "";
    }

    try
    {
        var favs = modFs.readFileSync(favsFile, "utf8");
    }
    catch (err)
    {
        console.error("Failed to read favorites: " + err);
        return "";
    }

    try
    {
        var doc = JSON.parse(favs);
    }
    catch (err)
    {
        console.error("Invalid favorites document: " + err);
        return "";
    }

    var out = "<ul>";

    for (var i = 0; i < doc.length; ++i)
    {
        var node = doc[i];
        var href = node["href"];
        var name = node["name"];

        out += "<li onclick='window.location.href=\"" + href + "\";'>" +
               "<span class='sh-fw-icon sh-icon-star-circle'></span>" +
               name +
               "</li>";
    }

    out += "  <hr>" +
           "</ul>";

    return out;
}

function makeMoreMenu(viewMode, sortMode)
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

    var out = "<div id='more-menu' class='sh-menu' onclick='sh.menu_close();'>" +
              "  <div onclick='event.stopPropagation();'>" +

              "    <h1 class='sh-submenu' onclick='sh.toggle_submenu(this);'>View</h1>" +
              "    <ul>" +
              "      <li id='mi-listview' onclick='changeSettings(\"view\", \"list\");'>As List</li>" +
              "      <li id='mi-gridview' onclick='changeSettings(\"view\", \"grid\");'>As Grid</li>" +
              "      <li id='mi-sort-by-name' onclick='changeSettings(\"sort\", \"name\", \"name-desc\");'>By Name" + sortByNameExt + "</li>" +
              "      <li id='mi-sort-by-date' onclick='changeSettings(\"sort\", \"date\", \"date-desc\");'>By Date" + sortByDateExt + "</li>" +
              "    </ul>" +

              "    <h1 class='sh-submenu' onclick='sh.toggle_submenu(this);'>New</h1>" +
              "    <ul>" +
              "      <li id='mi-newdir' onclick='sh.menu_close(); showNewDirDialog();'>Directory</li>" +
              "      <li id='mi-newfile' onclick='sh.menu_close(); showNewFileDialog();'>File</li>" +
              "    </ul>" +

              "    <h1 class='sh-submenu' onclick='sh.toggle_submenu(this);'>Clipboard</h1>" +
              "    <ul>" +
              "      <li id='mi-cut' onclick='sh.menu_close(); clearClipboard(function () { eachSelected(cutItem); });'>Cut</li>" +
              "      <li id='mi-copy' onclick='sh.menu_close(); clearClipboard(function () { eachSelected(copyItem); });'>Copy</li>" +
              "      <li id='mi-paste' onclick='sh.menu_close(); pasteItems();'>Paste</li>" +
              "      <li id='mi-showclipboard' onclick='sh.menu_close(); sh.push(\"clipboard-page\");'>Show</li>" +
              "    </ul>" +

              "    <h1 class='sh-submenu' onclick='sh.toggle_submenu(this);'>Action</h1>" +
              "    <ul>" +
              "      <li id='mi-upload' onclick='sh.menu_close(); $(\"#upload\").click();'>Upload</li>" +
              "      <li id='mi-download' onclick='sh.menu_close(); eachSelected(downloadItem);'>Download</li>" +
              "      <li id='mi-rename' onclick='sh.menu_close(); eachSelected(showNameDialog);'>Rename</li>" +
              "      <li id='mi-delete' onclick='sh.menu_close(); eachSelected(removeItem);'>Delete</li>" +
              "    </ul>" +

              "    <ul>" +
              "      <li id='mi-selectall' onclick='sh.menu_close(); selectAll();'>Select All</li>" +
              "      <li id='mi-unselectall' onclick='sh.menu_close(); unselectAll();'>Unselect All</li>" +
              "    </ul>" +

              "  </div>" +
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
              "  <div class='sh-dropshadow' style='position: relative; background-color: black;'>" +
              "    <h1 class='sh-font-small' style='position: absolute; margin: 0; padding: 0; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; text-align: left; left: 0.25em; right: 0.25em; bottom: 0.25em; text-shadow: #000 0px 0px 1px; color: white;'></h1>" +
              "    <img>" +
              "  </div>" +
              "</div>";

    return out;
}

function makeMainPage(viewMode, sortMode, home, path, stats)
{
    var parentDir = escapeHtml(encodeURI(modPath.dirname(path) + "/index.html").replace("//", "/"));

    var out = "<div id='main-page' class='sh-page'>" +

              makeMoreMenu(viewMode, sortMode) +

              "  <div id='breadcrumbs' class='sh-menu' onclick='sh.menu_close();'>" +
              "    <div>" +
              makeFavorites(home) +
              makeBreadcrumbs(path) +
              "    </div>" +
              "  </div>" +

              "  <header class='sh-dropshadow'>" +
              (path !== "/" ? "<span id='upButton' class='sh-left sh-fw-icon sh-icon-arrow-up' data-url='" + parentDir + "' onclick='window.location.href=\"" + parentDir + "\"'></span>"
                            : "") +
              "    <h1 onclick='sh.menu(this, \"breadcrumbs\");'>" + escapeHtml(path) + "</h1>" +
              "    <span class='sh-right sh-fw-icon sh-icon-menu' onclick='sh.menu(this, \"more-menu\");'></span>" +
              "  </header>" +

              "  <section id='filesbox'>" +
              (viewMode === "list" ? makeFiles(path, stats, true) : makeFilesGrid(sortMode, path, stats, true)) +
              "  </section>" +

              "</div>";

    return out;
}

function makeClipboardPage(clipboardStats)
{
    var out = "<div id='clipboard-page' class='sh-page'>" +

              "  <header>" +
              "    <span class='sh-left sh-fw-icon sh-icon-back' onclick='sh.pop();'></span>" +
              "    <h1>Clipboard</h1>" +
              "  </header>" +

              "  <section id='clipboard'>" +
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

function makeHtml(viewMode, sortMode, home, path, stats, clipboardStats)
{
    var out = "<!DOCTYPE html>" +

              "<html>" +
              makeHtmlHead() +
              "<body class='sh-theme-default'>" +

              "<input id='upload' type='file' multiple style='display: none;'/>" +
              "<a id='download' data-ajax='false' href='#' download='name' style='display: none;'></a>" +

              makeMainPage(viewMode, sortMode, home, path, stats) +
              makeNewDirDialog() +
              makeNameDialog() +
              makeMessageDialog() +
              
              makeBusyPopup() +
              makeImagePopup() +

              makeViewerPage() +
              makeClipboardPage(clipboardStats) +

              
              "</body>" +
              "</html>";

    return out;
}

function makeIndex(href, home, callback)
{
    var path = decodeURI(href);
    var fullPath = modPath.join(home, decodeURI(href));

    var settings = readSettings(home);
    console.debug("Settings: " + JSON.stringify(settings));
    var viewMode = settings.view || "list";
    var sortMode = settings.sort || "name";

    console.debug("User Path: " + path + "\n" +
                  "Full Path: " + fullPath + "\n" +
                  "View Mode: " + viewMode + "\n" +
                  "Sort Mode: " + sortMode);

    prepareClipboard(home, function ()
    {
        readStats(sortMode, fullPath, function (stats)
        {
            readStats(sortMode, modPath.join(home, ".pilvini", "clipboard"), function (clipboardStats)
            {
                var html = makeHtml(viewMode, sortMode, home, path, stats, clipboardStats);
                callback(true, html);
            });
        });
    });
}
exports.makeIndex = makeIndex;
