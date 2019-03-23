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

function readStats(path, callback)
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
                    });

                    callback(null, r);
                }
            }; } (file));
        }
    });
}

function makeFileItem(pathUri, file, stat)
{
    var mimeType = "";
    var uri = (pathUri + "/" + encodeURIComponent(file)).replace(/'/g, "%27").replace("//", "/");
    
    if (stat.isDirectory())
    {
        mimeType = "application/x-folder";
    }
    else
    {
        mimeType = modMime.mimeType(file);
    }

    var item = {
        "uri": uri,
        "name": file,
        "mimeType": mimeType,
        "size": stat.size,
        "mtime": stat.mtime.getTime(),
        "icon": getIcon(mimeType)
    }
    return item;
}

function makeFilesJson(uri, stats)
{
    var files = [];

    for (var i = 0; i < stats.length; ++i)
    {
        var file = stats[i][0];
        var stat = stats[i][1];

        if (! stat || file === ".pilvini")
        {
            continue;
        }

        files.push(makeFileItem(uri, file, stat));
    }

    return files;
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
                    tag("div").id("pagestack")
                )
            );

    return t;
}

function makeJson(uri, contentRoot, userContext, shares, callback)
{
    var fullPath = modUtils.uriToPath(uri, contentRoot + userContext.home());

    console.debug("Full Path: " + fullPath);

    readStats(fullPath, function (err, stats)
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
                    tag("div").id("pagestack")
                )
            );

    var html = "<!DOCTYPE html>\n" + t.html();
    callback(html);
}
exports.makeLoginPage = makeLoginPage;
