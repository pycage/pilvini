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
    "application/x-json": { "icon": "text.png", "viewer": "viewText" },
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
    "text/xml": { "icon": "text.png", "viewer": "viewText" },
    "text/x-markdown": { "icon": "document.png", "viewer": "viewMarkdown" },
    "video/mp4": { "icon": "video.png", "viewer": "viewVideo" },
    "video/x-flv": { "icon": "video.png", "viewer": "viewVideo" },
    "video/x-msvideo": { "icon": "video.png", "viewer": "viewVideo" }
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
                        .style("right", "42px")
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

    return t;
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

    return t;
}

function makeHtmlHead(initFunction)
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
                tag("script").attr("src", "/::res/browser/html.js")
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
            )
            .content(
                tag("script").attr("src", "/::res/viewer/video.js")
            )
            .content(
                tag("script")
                .content("$(document).ready(" + initFunction + ");")
            );

    return t;
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
    }

    return t;
}

function makeFavorites(userRoot)
{
    var tag = modHtml.tag;
    var t = tag("");

    var favsFile = modPath.join(userRoot, ".pilvini", "favorites.json");
    if (! modFs.existsSync(favsFile))
    {
        return t;
    }

    try
    {
        var favs = modFs.readFileSync(favsFile, "utf8");
    }
    catch (err)
    {
        console.error("Failed to read favorites: " + err);
        return t;
    }

    try
    {
        var doc = JSON.parse(favs);
    }
    catch (err)
    {
        console.error("Invalid favorites document: " + err);
        return t;
    }

    if (doc.length === 0)
    {
        return t;
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

    return t;
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

    return t;
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

function makeMoreMenu(viewMode, sortMode, userContext)
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

    var tag = modHtml.tag;
    var t = tag("div").id("more-menu").class("sh-menu")
            .on("click", "sh.menu_close();")
            .content(
                tag("div")
                .on("click", "event.stopPropagation();")
            );

    if (userContext.mayModify())
    {
        t.child(0)
        .content(
            tag("h1").class("sh-submenu")
            .on("click", "sh.toggle_submenu(this);")
            .content("View")
        )
        .content(
            tag("ul")
            .content(
                tag("li").id("mi-listview")
                .on("click", "changeSettings(\"view\", \"list\");")
                .content("As List")
            )
            .content(
                tag("li").id("mi-gridview")
                .on("click", "changeSettings(\"view\", \"grid\");")
                .content("As Grid")
            )
            .content(
                tag("li").id("mi-sort-by-name")
                .on("click", "changeSettings(\"sort\", \"name\", \"name-desc\");")
                .content("By Name" + sortByNameExt)
            )
            .content(
                tag("li").id("mi-sort-by-date")
                .on("click", "changeSettings(\"sort\", \"date\", \"date-desc\");")
                .content("By Date" + sortByDateExt)
            )
        );
    }

    if (userContext.mayCreate())
    {
        t.child(0)
        .content(
            tag("h1").class("sh-submenu")
            .on("click", "sh.toggle_submenu(this);")
            .content("New")
        )
        .content(
            tag("ul")
            .content(
                tag("li").id("mi-newdir")
                .on("click", "sh.menu_close(); showNewDirDialog();")
                .content("Directory")
            )
            .content(
                tag("li").id("mi-newfile")
                .on("click", "sh.menu_close(); showNewFileDialog();")
                .content("File")
            )
        );
    }

    if (userContext.mayCreate())
    {
        t.child(0)
        .content(
            tag("h1").class("sh-submenu")
            .on("click", "sh.toggle_submenu(this);")
            .content("Clipboard")
        )
        .content(
            tag("ul")
            .content(
                tag("li").id("mi-cut")
                .on("click", "sh.menu_close(); clearClipboard(function () { eachSelected(cutItem); });")
                .content("Cut")
            )
            .content(
                tag("li").id("mi-copy")
                .on("click", "sh.menu_close(); clearClipboard(function () { eachSelected(copyItem); });")
                .content("Copy")
            )
            .content(
                tag("li").id("mi-paste")
                .on("click", "sh.menu_close(); pasteItems();")
                .content("Paste")
            )
            .content(
                tag("li").id("mi-showclipboard")
                .on("click", "sh.menu_close(); sh.push(\"clipboard-page\");")
                .content("Show")
            )
        );
    }

    t.child(0)
    .content(
        tag("h1").class("sh-submenu")
        .on("click", "sh.toggle_submenu(this);")
        .content("Action")
    );

    var ul = tag("ul");
    t.child(0).content(ul);

    if (userContext.mayCreate())
    {
        ul.content(
            tag("li").id("mi-upload")
            .on("click", "sh.menu_close(); $(\"#upload\").click();")
            .content("Upload")
        );
    }

    ul.content(
        tag("li").id("mi-download")
        .on("click", "sh.menu_close(); eachSelected(downloadItem);")
        .content("Download")
    );
    
    if (userContext.mayModify())
    {
        ul.content(
            tag("li").id("mi-rename")
            .on("click", "sh.menu_close(); eachSelected(showNameDialog);")
            .content("Rename")
        );
    }

    if (userContext.mayDelete())
    {
        ul.content(
            tag("li").id("mi-delete")
            .on("click", "sh.menu_close(); removeSelected();")
            .content("Delete")
        );
    }

    t.child(0)
    .content(
        tag("ul")
        .content(
            tag("li").id("mi-selectall")
            .on("click", "sh.menu_close(); selectAll();")
            .content("Select All")
        )
        .content(
            tag("li").id("mi-unselectall")
            .on("click", "sh.menu_close(); unselectAll();")
            .content("Unselect All")
        )
        .content(
            tag("hr")
        )
        .content(
            tag("li")
            .on("click", "logout();")
            .content("Logout")
        )
    );

    return t;
}

function makeMessageDialog()
{
    var tag = modHtml.tag;

    var t = tag("div").id("message-dialog").class("sh-popup")
            .content(
                tag("div").class("sh-dropshadow")
                .style("background-color", "var(--color-primary-background)")
                .content(
                    tag("header")
                    .content(
                        tag("h1").class("sh-left")
                    )
                )
                .content(
                    tag("section")
                    .content(
                        tag("p")
                    )
                )
                .content(
                    tag("footer")
                    .content(
                        tag("span").class("sh-right")
                        .content(
                            tag("a").on("click", "sh.popup_close(\"message-dialog\");").content("OK")
                        )
                    )
                )
            );

    return t;
}

function makeQuestionDialog()
{
    var tag = modHtml.tag;

    var t = tag("div").id("question-dialog").class("sh-popup")
            .content(
                tag("div").class("sh-dropshadow")
                .style("background-color", "var(--color-primary-background)")
                .content(
                    tag("header")
                    .content(
                        tag("h1").class("sh-left")
                    )
                )
                .content(
                    tag("section")
                    .content(
                        tag("p")
                    )
                )
                .content(
                    tag("footer")
                    .content(
                        tag("span").class("sh-right")
                        .content(
                            tag("a").on("click", "sh.popup_close(\"question-dialog\");").content("Yes")
                        )
                        .content(
                            tag("a").on("click", "sh.popup_close(\"question-dialog\");").content("No")
                        )
                    )
                )
            );

    return t;
}

function makeNewDirDialog()
{
    var tag = modHtml.tag;

    var t = tag("div").id("newdir-dialog").class("sh-popup")
            .content(
                tag("div").class("sh-dropshadow")
                .style("background-color", "var(--color-primary-background)")
                .content(
                    tag("header")
                    .content(
                        tag("h1").class("sh-left").content("New Directory")
                    )
                )
                .content(
                    tag("section")
                    .content(
                        tag("form")
                        .content(
                            tag("label").content("Name:")
                        )
                        .content(
                            tag("input").attr("type", "text")
                        )
                    )
                )
                .content(
                    tag("footer")
                    .content(
                        tag("span").class("sh-right")
                        .content(
                            tag("a").content("Create")
                        )
                        .content(
                            tag("a").on("click", "sh.popup_close(\"newdir-dialog\");").content("Cancel")
                        )
                    )
                )
            );

    return t;
}

function makeNameDialog()
{
    var tag = modHtml.tag;

    var t = tag("div").id("name-dialog").class("sh-popup")
            .content(
                tag("div").class("sh-dropshadow")
                .style("background-color", "var(--color-primary-background)")
                .content(
                    tag("header")
                    .content(
                        tag("h1").class("sh-left").content("Enter Name")
                    )
                )
                .content(
                    tag("section")
                    .content(
                        tag("form")
                        .content(
                            tag("label").content("Name:")
                        )
                        .content(
                            tag("input").attr("type", "text")
                        )
                    )
                )
                .content(
                    tag("footer")
                    .content(
                        tag("span").class("sh-right")
                        .content(
                            tag("a").content("Accept")
                        )
                        .content(
                            tag("a").on("click", "sh.popup_close(\"name-dialog\");").content("Cancel")
                        )
                    )
                )
            );

    return t;
}

function makeShareDialog()
{
    var tag = modHtml.tag;

    var t = tag("div").id("share-dialog").class("sh-popup")
            .content(
                tag("div").class("sh-dropshadow")
                .style("background-color", "var(--color-primary-background)")
                .content(
                    tag("header")
                    .content(
                        tag("h1").class("sh-left").content("Setup Share")
                    )
                )
                .content(
                    tag("section")
                    .content(
                        tag("form")
                        .content(
                            tag("label").content("Login:")
                            .style("display", "inline-block")
                            .style("width", "6em")
                        )
                        .content(
                            tag("input").attr("type", "text")
                        )
                        .content(tag("br"))
                        .content(
                            tag("label").content("Password:")
                            .style("display", "inline-block")
                            .style("width", "6em")
                        )
                        .content(
                            tag("input").attr("type", "text")
                        )
                    )
                )
                .content(
                    tag("footer")
                    .content(
                        tag("span").class("sh-right")
                        .content(
                            tag("a").content("Accept")
                        )
                        .content(
                            tag("a").on("click", "sh.popup_close(\"share-dialog\");").content("Cancel")
                        )
                    )
                )
            );

    return t;
}

function makeLoginDialog()
{
    var tag = modHtml.tag;

    var t = tag("div").id("login-dialog").class("sh-popup")
            .content(
                tag("div").class("sh-dropshadow")
                .style("background-color", "var(--color-primary-background)")
                .content(
                    tag("header")
                    .content(
                        tag("h1").class("sh-left").content("Welcome")
                    )
                )
                .content(
                    tag("section")
                    .content(
                        tag("form")
                        .content(
                            tag("label").content("Login:")
                            .style("display", "inline-block")
                            .style("width", "6em")
                        )
                        .content(
                            tag("input").attr("type", "text")
                        )
                        .content(tag("br"))
                        .content(
                            tag("label").content("Password:")
                            .style("display", "inline-block")
                            .style("width", "6em")
                        )
                        .content(
                            tag("input").attr("type", "password")
                        )
                    )
                )
                .content(
                    tag("footer")
                    .content(
                        tag("span").class("sh-right")
                        .content(
                            tag("a").content("Login")
                        )
                    )
                )
            );

    return t;
}

function makeBusyPopup()
{
    var tag = modHtml.tag;
    
    var t = tag("div").id("busy-popup").class("sh-popup")
            .content(
                tag("div")
                .style("color", "var(--color-primary)")
                .style("text-align", "center")
                .style("padding", "1em")
                .content(
                    tag("span").class("sh-busy-indicator")
                    .style("font-size", "200%")
                )
                .content(tag("br"))
                .content(tag("br"))
                .content(
                    tag("span").content("Loading")
                )
            );

    return t;
}

function makePreviewPopup()
{
    var tag = modHtml.tag;

    var t = tag("div").id("preview-popup").class("sh-popup")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .on("click", "sh.popup_close(\"preview-popup\");")
            .content(
                tag("div").class("sh-dropshadow")
                .style("position", "relative")
                .style("background-color", "black")
                .style("overflow", "hidden")
            );

    return t;
}

function makeMainPage(viewMode, sortMode, prefix, contentRoot, uri, path, stats, userContext, shares)
{
    var parentUri = modPath.dirname(uri);
    var isFav = userContext.mayModify() ? isFavorite(uri, contentRoot + userContext.home())
                                        : false;
    var isShare = shares.isShare(path);

    var tag = modHtml.tag;
    var t = tag("div").id("main-page").class("sh-page")
            .content(
                makeMoreMenu(viewMode, sortMode, userContext)
            )
            .content(
                tag("div").id("breadcrumbs").class("sh-menu")
                .on("click", "sh.menu_close();")
                .content(
                    tag("div")
                )
            );

    if (userContext.mayModify())
    {
        t.child(-1).child(-1)
        .content(
            tag("h1").class("sh-submenu")
            .on("click", "sh.toggle_submenu(this); event.stopPropagation();")
            .content("Favorites")
        )
        .content(
            tag("ul")
            .content(
                isFav ? tag("li").on("click", "removeFavorite();").content("Remove from Favorites")
                      : tag("li").on("click", "addFavorite();").content("Add to Favorites")
            )
            .content(
                tag("hr")
            )
            .content(
                makeFavorites(contentRoot + userContext.home())
            )
        );
    }

    if (userContext.mayShare())
    {
        t.child(-1).child(-1)
        .content(
            tag("h1").class("sh-submenu")
            .on("click", "sh.toggle_submenu(this); event.stopPropagation();")
            .content("Shared Places")
        )
        .content(
            tag("ul")
            .content(
                isShare ? tag("li").on("click", "unshare();").content("Unshare This")
                        : tag("li").on("click", "showShareDialog();").content("Share This")
            )
            .content(
                tag("hr")
            )
            .content(
                makeShares(userContext.home(), shares)
            )
        );
    }

    t.child(-1).child(-1)
    .content(
        makeBreadcrumbs(uri)
    );

    t.content(
        tag("header").class("sh-dropshadow")
        .content(
            uri !== "/" ? tag("span").id("upButton").class("sh-left sh-fw-icon sh-icon-arrow-up")
                          .data("url", parentUri)
                          .on("click", "loadDirectory(\"" + parentUri + "\");")
                        : ""
        )
        .content(
            tag("h1")
            .on("click", "sh.menu(this, \"breadcrumbs\");")
            .content(
                isShare ? tag("span").class("sh-fw-icon sh-icon-share")
                        : ""
            )
            .content(
                isFav ? tag("span").class("sh-fw-icon sh-icon-star-circle")
                      : ""
            )
            .content(
                escapeHtml(decodeURI(uri))
            )
        )
        .content(
            tag("span").class("sh-right sh-fw-icon sh-icon-menu")
            .on("click", "sh.menu(this, \"more-menu\");")
        )
    )
    .content(
        tag("section").id("filesbox")
        .data("prefix", prefix)
        .data("url", uri)
        .content(
            viewMode === "list" ? makeFiles(uri, stats, true)
                                : makeFilesGrid(sortMode, uri, stats, true)
        )
    )
    .content(
        tag("footer").class("sh-dropshadow")
    );

    return t;
}

function makeClipboardPage(clipboardStats)
{
    var tag = modHtml.tag;

    var t = tag("div").id("clipboard-page").class("sh-page")
            .content(
                tag("header")
                .content(
                    tag("span").class("sh-left sh-fw-icon sh-icon-back")
                    .on("click", "sh.pop();")
                )
                .content(
                    tag("h1").content("Clipboard")
                )
            )
            .content(
                tag("section").id("clipboard")
                .content(
                    makeFiles("", clipboardStats, false)
                )
            );

    return t;
}

function makeViewerPage()
{
    var tag = modHtml.tag;

    var t = tag("div").id("viewer-page").class("sh-page")
            .content(
                tag("header")
                .content(
                    tag("span").class("sh-left sh-fw-icon sh-icon-back")
                    .on("click", "sh.pop();")
                )
                .content(
                    tag("h1").content("Viewer")
                )
            )
            .content(
                tag("section")
            );

    return t;
}

function makeHtml(viewMode, sortMode, prefix, contentRoot, uri, path, stats, clipboardStats, userContext, shares)
{
    var tag = modHtml.tag;
    var t = tag("html")
            .content(
                makeHtmlHead("init")
            )
            .content(
                tag("body").class("sh-theme-default")
                .content(
                    tag("input").id("upload").attr("type", "file").attr("multiple", "").style("display", "none")
                )
                .content(
                    tag("a").id("download").data("ajax", "false").attr("href", "#").attr("download", "name").style("display", "none")
                )
                .content(
                    tag("audio").id("audio").style("display", "none")
                )
                .content(
                    makeMainPage(viewMode, sortMode, prefix, contentRoot, uri, path, stats, userContext, shares)
                )
                .content(
                    makeNewDirDialog()
                )
                .content(
                    makeNameDialog()
                )
                .content(
                    makeShareDialog()
                )
                .content(
                    makeMessageDialog()
                )
                .content(
                    makeQuestionDialog()
                )
                .content(
                    makeBusyPopup()
                )
                .content(
                    makePreviewPopup()
                )
                .content(
                    makeViewerPage()
                )
                .content(
                    makeClipboardPage(clipboardStats)
                )
            );

    return t;
}

function createMainPage(prefix, uri, contentRoot, userContext, shares, callback)
{
    var fullPath = modUtils.uriToPath(uri, contentRoot + userContext.home());
    var userPath = modUtils.uriToPath(uri, userContext.home());

    var settings = readSettings(contentRoot + userContext.home());
    console.debug("Settings: " + JSON.stringify(settings));
    var viewMode = settings.view || "list";
    var sortMode = settings.sort || "name";

    console.debug("Full Path: " + fullPath + "\n" +
                  "View Mode: " + viewMode + "\n" +
                  "Sort Mode: " + sortMode);

    readStats(sortMode, fullPath, function (stats)
    {
        var html = makeMainPage(viewMode, sortMode, prefix, contentRoot, uri, userPath, stats, userContext, shares).html();
        callback(true, html);
    });
}
exports.createMainPage = createMainPage;

function makeIndex(prefix, uri, contentRoot, userContext, shares, callback)
{
    var fullPath = modUtils.uriToPath(uri, contentRoot + userContext.home());
    var userPath = modUtils.uriToPath(uri, userContext.home());

    var settings = readSettings(contentRoot + userContext.home());
    console.debug("Settings: " + JSON.stringify(settings));
    var viewMode = settings.view || "list";
    var sortMode = settings.sort || "name";

    console.debug("Full Path: " + fullPath + "\n" +
                  "View Mode: " + viewMode + "\n" +
                  "Sort Mode: " + sortMode);

    prepareClipboard(contentRoot + userContext.home(), function ()
    {
        readStats(sortMode, fullPath, function (stats)
        {
            readStats(sortMode, modPath.join(contentRoot + userContext.home(), ".pilvini", "clipboard"), function (clipboardStats)
            {
                var html = "<!DOCTYPE html>\n" + makeHtml(viewMode, sortMode, prefix, contentRoot, uri, userPath, stats, clipboardStats, userContext, shares).html();
                callback(true, html);
            });
        });
    });
}
exports.makeIndex = makeIndex;

function makeLoginPage(callback)
{
    var tag = modHtml.tag;
    var t = tag("html")
            .content(
                makeHtmlHead("initLogin")
            )
            .content(
                tag("body").class("sh-theme-default")
                .content(
                    makeLoginDialog()
                )
                .content(
                    makeMessageDialog()
                )
                .content(
                    tag("div").id("main-page").class("sh-page")
                    .style("background-image", "url('/::image-of-the-day/')")
                    .style("background-size", "cover")
                    .style("background-repeat", "no-repeat")
                    .content(
                        tag("header").class("sh-dropshadow")
                        .content(
                            tag("h1")
                            .content("Pilvini Secure Cloud Drive")
                        )
                    )
                    .content(
                        tag("footer")
                        .class("sh-font-small")
                        .style("visibility", "visible")
                        .content("&copy; 2017, 2018 Martin Grimme - Want your own cloud? Get pilvini at https://github.com/pycage/pilvini")
                    )
                    .content(
                        tag("p").class("sh-font-small")
                        .style("position", "absolute")
                        .style("bottom", "3em")
                        .style("right", "1em")
                        .style("color", "#fff")
                        .style("text-shadow", "#000 0px 0px 1px")
                        .content("Background powered by bing.com")
                        )
                )
            );

    var html = "<!DOCTYPE html>\n" + t.html();
    callback(html);
}
exports.makeLoginPage = makeLoginPage;
