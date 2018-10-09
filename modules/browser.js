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
    "application/x-gzip": { "icon": "package.png" },
    "application/x-iso9660-image": { "icon": "optical.png" },
    "application/zip": { "icon": "package.png" },
    "audio/mp3": { "icon": "audio.png" },
    "image/gif": { "icon": "image.png", "viewer": "viewImage" },
    "image/jpeg": { "icon": "image.png", "viewer": "viewImage" },
    "image/png": { "icon": "image.png", "viewer": "viewImage" },
    "image/svg+xml": { "icon": "image.png", "viewer": "viewImage" },
    "text/html": { "icon": "html.png" },
    "text/plain": { "icon": "text.png" },
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
                    result.sort(function (a, b)
                    {
                        if (! a[1] || ! b[1])
                        {
                            return 0;
                        }
                        else if (a[1].isDirectory() && ! b[1].isDirectory())
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

                    callback(result);
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
    return "<img src='/::res/file-icons/empty.png'" +
           " style='width: 80px; background-image: url(" + icon + ");" +
           " background-size: 48px;" +
           " background-repeat: no-repeat;" +
           " background-position: 50% 50%;'/>";
}

function makeThumbnail(icon, path, file)
{
    var imageFile = modPath.join(path, file);

    return "<img data-x-thumbnail='/::thumbnail" + escapeHtml(encodeURI(imageFile)) + "' src='/::res/file-icons/empty.png'" +
           " style='width: 80px; background-image: url(" + icon + ");" +
           " background-size: 48px;" +
           " background-repeat: no-repeat;" +
           " background-position: 50% 50%;'/>";
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
    var ajaxMode = "";
    var action = "";

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
        ajaxMode = "data-ajax='false'";
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
        ajaxMode = "data-ajax='false'";
    }
    else
    {
        info = makeInfo(file, stat);
        ajaxMode = "data-ajax='false'";
        iconHtml = makeIcon(icon);
    }

    out += "<a data-mimetype='" + mimeType + "' href='" + escapeHtml(href) + "' "+ ajaxMode + " " + action + ">";
    out += iconHtml;
    out += "<h2>" + escapeHtml(name) + "</h2>";
    out += "<p>" + info + "</p>";
    out += "</a>";
    if (active)
    {
        out += "<a data-icon='check' href='#' onclick='toggleSelect($(this).parent());'></a>";
    }

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
    var ajaxMode = "";
    var action = "";

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
        ajaxMode = "data-ajax='false'";
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
        ajaxMode = "data-ajax='false'";
    }
    else
    {
        info = makeInfo(file, stat);
        ajaxMode = "data-ajax='false'";
        iconHtml = makeIcon(icon);
    }

    out += "<a data-mimetype='" + mimeType + "' href='" + escapeHtml(href) + "' "+ ajaxMode + " " + action + ">";
    out += iconHtml;
    out += "</a>";
    if (active)
    {
        out += "<a data-icon='check' href='#' onclick='toggleSelect($(this).parent());'></a>";
    }

    return out;
}

function makeFiles(path, stats, active)
{
    var out = "";
    out += "<ul data-role='listview'>";
    for (var i = 0; i < stats.length; ++i)
    {
        var file = stats[i][0];
        var stat = stats[i][1];

        if (! stat || file.indexOf(".") === 0)
        {
            continue;
        }

        out += "<li data-icon='false' class='fileitem'>";
        out += makeItem(path, file, stat, active);
        out += "</li>";
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

        out += "<div style='display: inline' class='fileitem'>";
        out += makeGridItem(path, file, stat, active);
        out += "</div>&nbsp;";
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
              "  <link rel='stylesheet' href='https://code.jquery.com/mobile/1.4.5/jquery.mobile-1.4.5.min.css'>" +
              "  <script src='https://code.jquery.com/jquery-2.1.4.min.js'></script>" +
              "  <script src='https://code.jquery.com/mobile/1.4.5/jquery.mobile-1.4.5.min.js'></script>" +
              "  <script src='/::res/browser/index.js'></script>" +
              "  <script src='/::res/viewer/image.js'></script>" +
              "  <script src='/::res/viewer/markdown.js'></script>" +
              "  <script src='/::res/viewer/pdf.js'></script>" +
              "  <script src='/::res/viewer/vcard.js'></script>" +
              "</head>";

    return out;
}

function makeBreadcrumbs(path)
{
    var pathParts = path.split("/");

    var out = "<ul data-role='listview'>" +
              "  <li data-icon='false'><a href='/index.html' data-ajax='false''>/</a></li>";

    var breadcrumbPath = "";
    for (var i = 0; i < pathParts.length; ++i)
    {
        if (pathParts[i] === "")
        {
            continue;
        }

        breadcrumbPath += "/" + pathParts[i]
        out += "  <li data-icon='false'><a href='" + escapeHtml(encodeURI(breadcrumbPath)) + "/index.html' data-ajax='false'>" + escapeHtml(pathParts[i]) + "</a></li>";
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

    var out = "<ul data-role='listview'>";

    for (var i = 0; i < doc.length; ++i)
    {
        var node = doc[i];
        var href = node["href"];
        var name = node["name"];

        out += "<li data-icon='star'>" +
               "<a href='" + href + "' data-ajax='false'>" +
               name +
               "</a></li>";
    }

    out += "  <li data-role='list-divider'></li>" +
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

    var out = "<div id='more-menu' data-role='popup' data-arrow='t'>" +

              "  <div data-role='collapsible-set'>" +
              "  <div data-role='collapsible'>" +
              "    <h2>View</h2>" +
              "    <ul data-role='listview'>" +
              "      <li id='mi-listview' data-icon='false'><a href='#' onclick='changeSettings(\"view\", \"list\");'>As List</a></li>" +
              "      <li id='mi-gridview' data-icon='false'><a href='#' onclick='changeSettings(\"view\", \"grid\");'>As Grid</a></li>" +
              "      <li id='mi-sort-by-name' data-icon='false'><a href='#' onclick='changeSettings(\"sort\", \"name\", \"name-desc\");'>By Name" + sortByNameExt + "</a></li>" +
              "      <li id='mi-sort-by-date' data-icon='false'><a href='#' onclick='changeSettings(\"sort\", \"date\", \"date-desc\");'>By Date" + sortByDateExt + "</a></li>" +
              "    </ul>" +
              "  </div>" +

              "  <div data-role='collapsible'>" +
              "    <h2>New</h2>" +
              "    <ul data-role='listview'>" +
              "      <li id='mi-newdir' data-icon='false'><a href='#' onclick='closeMoreMenu(showNewDirDialog);'>Directory</a></li>" +
              "      <li id='mi-newfile' data-icon='false'><a href='#' onclick='closeMoreMenu(showNewFileDialog);'>File</a></li>" +
              "    </ul>" +
              "  </div>" +

              "  <div data-role='collapsible'>" +
              "    <h2>Clipboard</h2>" +
              "    <ul data-role='listview'>" +
              "      <li id='mi-cut' data-icon='false'><a href='#' onclick='closeMoreMenu(function () { clearClipboard(function () { eachSelected(cutItem); }); });'>Cut</a></li>" +
              "      <li id='mi-copy' data-icon='false'><a href='#' onclick='closeMoreMenu(function () { clearClipboard(function () { eachSelected(copyItem); }); });'>Copy</a></li>" +
              "      <li id='mi-paste' data-icon='false'><a href='#' onclick='closeMoreMenu(pasteItems());'>Paste</a></li>" +
              "      <li id='mi-showclipboard' data-icon='false'><a href='#clipboard-page'>Show</a></li>" +
              "    </ul>" +
              "  </div>" +

              "  <div data-role='collapsible'>" +
              "    <h2>Action</h2>" +
              "    <ul data-role='listview'>" +
              "    <li id='mi-upload' data-icon='false'><a href='#' onclick='closeMoreMenu(); $(\"#upload\").click();'>Upload</a></li>" +
              "    <li id='mi-download' data-icon='false'><a href='#' onclick='closeMoreMenu(function () { eachSelected(downloadItem) });'>Download</a></li>" +
              "    <li id='mi-rename' data-icon='false'><a href='#' onclick='closeMoreMenu(function () { eachSelected(showNameDialog); });'>Rename</a></li>" +
              "    <li id='mi-delete' data-icon='false'><a href='#' onclick='closeMoreMenu(function () { eachSelected(removeItem); });'>Delete</a></li>" +
              "    </ul>" +
              "  </div>" +

              "  <ul data-role='listview'>" +
              "    <li data-role='list-divider'></li>" +
              "    <li id='mi-selectall' data-icon='false'><a href='#' onclick='closeMoreMenu(selectAll);'>Select All</a></li>" +
              "    <li id='mi-unselectall' data-icon='false'><a href='#' onclick='closeMoreMenu(unselectAll);'>Unselect All</a></li>" +
              "  </ul>" +
            "  </div>" +
              "</div>";
    return out;
}

function makeMessageDialog()
{
    var out = "<div id='message-dialog' data-role='popup' data-dismissible='false'>" +

              "  <div data-role='header'><h1 class='page-title'></h1></div>" +

              "  <div class='ui-content'>" +
              "    <p></p>" +

              "    <a class='accept-btn ui-btn ui-btn-inline ui-corner-all ui-shadow' data-rel='back' href='#'>OK</a>" +
              "  </div>" +

              "</div>";
    return out;
}

function makeNewDirDialog()
{
    var out = "<div id='newdir-dialog' data-role='popup' data-dismissible='false'>" +

              "  <div data-role='header'><h1 class='page-title'>New directory</h1></div>" +

              "  <div class='ui-content'>" +
              "    <form>" +
              "      <label>Name:</label>" +
              "      <input type='text'>" +
              "    </form>" +

              "    <a class='accept-btn ui-btn ui-btn-inline ui-corner-all ui-shadow' href='#'>Create</a>" +
              "    <a class='cancel-btn ui-btn ui-btn-inline ui-corner-all ui-shadow' data-rel='back' href='#'>Cancel</a>" +
              "  </div>" +

              "</div>";

    return out;
}

function makeNameDialog()
{
    var out = "<div id='name-dialog' data-role='popup' data-dismissible='false'>" +

              "  <div data-role='header'><h1 class='page-title'>Enter name</h1></div>" +

              "  <div class='ui-content'>" +
              "    <form>" +
              "      <label>Name:</label>" +
              "      <input type='text'>" +
              "    </form>" +

              "    <a class='accept-btn ui-btn ui-btn-inline ui-corner-all ui-shadow' href='#'>Accept</a>" +
              "    <a class='cancel-btn ui-btn ui-btn-inline ui-corner-all ui-shadow' data-rel='back' href='#'>Cancel</a>" +
              "  </div>" +

              "</div>";

    return out;
}

function makeImagePopup()
{
    var out = "<div id='image-popup' data-role='popup' data-dismissable='true' data-theme='b' data-overlay-theme='b' data-corners='false'>" +
              "  <a href='#' data-rel='back' class='ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right'></a>" +
              "  <img>" +
              "</div>";

    return out;
}

function makeMainPage(viewMode, sortMode, home, path, stats)
{
    var out = "<div id='main-page' data-role='page'>" +

              makeMoreMenu(viewMode, sortMode) +

              "  <div id='breadcrumbs' data-role='popup' data-arrow='t'>" +
              makeFavorites(home) +
              makeBreadcrumbs(path) +
              "  </div>" +

              makeMessageDialog() +
              makeNewDirDialog() +
              makeNameDialog() +
              makeImagePopup() +

              "  <div data-role='header' data-position='fixed' data-tap-toggle='false'>" +
              "    <h1 onclick='$(\"#breadcrumbs\").popup(\"open\", { positionTo: this });'>" + escapeHtml(path) + "</h1>" +
              (path !== "/" ? "    <a class='ui-btn ui-btn-icon-left ui-icon-back ui-corner-all' href='" + escapeHtml(encodeURI(modPath.dirname(path) + "/index.html").replace("//", "/")) + "' data-ajax='false'>Up</a>" : "") +
              "    <a class='ui-btn ui-btn-icon-right ui-btn-right ui-icon-bars ui-corner-all' href='#more-menu' data-rel='popup'>More</a>" +
              "  </div>" +

              "  <div id='filesbox' class='ui-content'>" +
              (viewMode === "list" ? makeFiles(path, stats, true) : makeFilesGrid(sortMode, path, stats, true)) +
              "  </div>" +

              "</div>";

    return out;
}

function makeClipboardPage(clipboardStats)
{
    var out = "<div data-role='page' id='clipboard-page'>" +

              "  <div data-role='header' data-position='fixed' data-tap-toggle='false'>" +
              "    <h1>Clipboard</h1>" +
              "    <a class='ui-btn ui-btn-icon-left ui-icon-back ui-corner-all' href='#main-page'>Back</a>" +
              "  </div>" +

              "  <div id='clipboard' class='ui-content'>" +
              makeFiles("", clipboardStats, false) +
              "  </div>" +

              "</div>";

    return out;
}

function makeViewerPage()
{
    var out = "<div data-role='page' id='viewer-page'>" +

              "  <div data-role='header' data-position='fixed' data-tap-toggle='false'>" +
              "    <h1></h1>" +
              "    <a class='ui-btn ui-btn-icon-left ui-icon-back ui-corner-all' href='#' data-rel='back'>Back</a>" +
              "  </div>" +

              "  <div class='ui-content'>" +
              "  </div>" +

              "</div>";

    return out;
}

function makeHtml(viewMode, sortMode, home, path, stats, clipboardStats)
{
    var out = "<!DOCTYPE html>" +

              "<html>" +
              makeHtmlHead() +
              "<body>" +

              "<input id='upload' type='file' multiple style='display: none;'/>" +
              "<a id='download' data-ajax='false' href='#' download='name' style='display: none;'></a>" +

              makeMainPage(viewMode, sortMode, home, path, stats) +
              makeViewerPage() +
              makeClipboardPage(clipboardStats) +

              "</body>" +
              "</html>";

    return out;
}

function makeIndex(href, home, callback)
{
    var path = decodeURIComponent(href);
    var fullPath = modPath.join(home, decodeURIComponent(href));

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
