"use strict";

const modPath = require("path"),
      modHtml = require("./html.js"),
      modMime = require("./mime.js"),
      modUtils = require("./utils.js"),
      modVfs = require("./vfs.js");

const MIME_INFO = {
    "application/java-archive": { "icon": "package.png" },
    "application/ogg": { "icon": "audio.png" },
    "application/pdf": { "icon": "pdf.png" },
    "application/vnd.oasis.opendocument.text": { "icon": "document.png" },
    "application/x-batch": { "icon": "text.png" },
    "application/x-folder": {"icon": "folder.png" },
    "application/x-json": { "icon": "text.png" },
    "application/x-python": { "icon": "text.png" },
    "application/x-shellscript": { "icon": "text.png" },
    "application/x-gzip": { "icon": "package.png" },
    "application/x-iso9660-image": { "icon": "optical.png" },
    "application/zip": { "icon": "package.png" },
    "audio/flac": { "icon": "audio.png" },
    "audio/mp3": { "icon": "audio.png" },
    "image/gif": { "icon": "image.png" },
    "image/jpeg": { "icon": "image.png" },
    "image/png": { "icon": "image.png" },
    "image/svg+xml": { "icon": "image.png" },
    "text/html": { "icon": "html.png" },
    "text/plain": { "icon": "text.png" },
    "text/rtf": { "icon": "document.png" },
    "text/vcard": { "icon": "contacts.png" },
    "text/xml": { "icon": "text.png" },
    "text/x-markdown": { "icon": "document.png" },
    "video/mp4": { "icon": "video.png" },
    "video/mpeg": { "icon": "video.png" },
    "video/webm": { "icon": "video.png" },
    "video/x-flv": { "icon": "video.png" },
    "video/x-msvideo": { "icon": "video.png" }
};

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

function readStats(sortMode, path, callback)
{
    modVfs.readdir(path, function (err, files)
    {
        if (err)
        {
            callback(err, []);
            return;
        }
        else if (files.length === 0)
        {
            callback(null, []);
            return;
        }

        var result = [];
        for (var i = 0; i < files.length; ++i)
        {
            var file = files[i];
            modVfs.stat(modPath.join(path, file), function (file) { return function (err, stat)
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

                    callback(null, r);
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

function makeFileItem(pathUri, file, stat, active, callback)
{
    var mimeType = modMime.mimeType(file);
    var info = "";
    var uri = (pathUri + "/" + encodeURIComponent(file)).replace(/'/g, "%27").replace("//", "/");

    if (stat.isDirectory())
    {
        mimeType = "application/x-folder";
    }
    else if (mimeType.startsWith("image/") ||
             mimeType.startsWith("audio/") ||
             mimeType === "video/mp4" ||
             mimeType === "video/webm")
    {
        info = makeInfo(file, stat);
    }
    else
    {
        info = makeInfo(file, stat);
    }

    return callback(uri, info, mimeType);
}

function makeFilesJson(uri, stats, active)
{
    var files = [];

    for (var i = 0; i < stats.length; ++i)
    {
        var file = stats[i][0];
        var stat = stats[i][1];

        if (! stat || file.indexOf(".") === 0)
        {
            continue;
        }

        makeFileItem(uri, file, stat, active, function (uri, info, mimeType)
        {
            files.push({
                "uri": uri,
                "name": file,
                "info": info,
                "mimeType": mimeType,
                "icon": getIcon(mimeType)
            });
        });
    }

    return files;
}

/*
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
        
        currentP.content(makeFileItem(uri, file, stat, active, function (uri, info, mimeType, iconHtml)
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

            if (active)
            {
                t = t.on("click", "viewFile(this);");
            }

            return t;
        }))
        .content("&nbsp;");
    }

    return t;
}
*/

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
                tag("script").attr("src", "/::res/webshell/index.js")
            )
            .content(
                tag("script")
                .content("$(document).ready(" + initFunction + ");")
            );

    return t;
}

function makeSharesJson(userHome, shares)
{
    var result = [];

    shares.shares().forEach(function (shareId)
    {
        var shareRoot = shares.info(shareId).root;
        if (shareRoot.substr(0, userHome.length) === userHome)
        {
            // this share is within reach of the user
            var uri = shareRoot.substr(userHome.length);
            result.push({
                "share": shareId,
                "uri": uri
            });
        }
    });

    return result;
}

function makeStatusBox()
{
    var tag = modHtml.tag;

    var t = tag("div").id("statusbox").class("sh-dropshadow")
            .style("position", "fixed")
            .style("bottom", "0")
            .style("right", "0")
            .style("max-width", "60vw")
            .style("width", "auto")
            .style("height", "auto")
            .style("border", "solid 1px var(--color-border)")
            .style("background-color", "var(--color-primary-background)");

    return t;
}

function makeHtml()
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
                    tag("div").id("pagelayer")
                )
                .content(
                    makeStatusBox()
                )
            );

    return t;
}

function makeJson(uri, contentRoot, userContext, shares, callback)
{
    var fullPath = modUtils.uriToPath(uri, contentRoot + userContext.home());

    console.debug("Full Path: " + fullPath + "\n" +
                  "View Mode: " + viewMode + "\n" +
                  "Sort Mode: " + sortMode);

    readStats(sortMode, fullPath, function (err, stats)
    {
        if (err)
        {
            callback(false, "");
            return;
        }

        var obj = {
            "uri": uri,
            "permissions": userContext.permissions(),
            "files": makeFilesJson(uri, stats, true),
            "shares": makeSharesJson(userContext.home(), shares)
        };

        var json = JSON.stringify(obj, 4);
        console.log(json);
        callback(true, json);
    });

}
exports.makeJson = makeJson;


function makeIndex(callback)
{
    var html = "<!DOCTYPE html>\n" + makeHtml().html();
    callback(true, html);
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
                        .content("&copy; 2017 - 2019 Martin Grimme - https://github.com/pycage/pilvini")
                    )
                    .content(
                        tag("p").class("sh-font-small")
                        .style("position", "absolute")
                        .style("bottom", "3em")
                        .style("right", "1em")
                        .style("color", "#fff")
                        .style("text-shadow", "#000 0px 0px 1px")
                        .content("Background image by bing.com")
                    )
                )
            );

    var html = "<!DOCTYPE html>\n" + t.html();
    callback(html);
}
exports.makeLoginPage = makeLoginPage;
