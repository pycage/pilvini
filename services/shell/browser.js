"use strict";

var requireShared = require.main.exports.requireShared;

const modPath = require("path"),
      modHtml = requireShared("html"),
      modMime = requireShared("mime"),
      modUtils = requireShared("utils"),
      modVfs = requireShared("vfs");

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
        return "/::res/shell/file-icons/" + info.icon;
    }
    else
    {
        return "/::res/shell/file-icons/text.png"
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
        var count = files.length;
        for (var i = 0; i < files.length; ++i)
        {
            var file = files[i];
            modVfs.stat(modPath.join(path, file), function (file) { return function (err, stat)
            {
                --count;
                if (! err)
                {
                    result.push([file, stat]);
                }
                else
                {
                    var fakeStat = {
                        isDirectory: function () { return false; },
                        mtime: new Date(),
                        size: -1
                    };
                    result.push([file, fakeStat]);
                }
                if (count === 0)
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


function makeHtmlHead(initFunction, extensions)
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
                .attr("href", "/::res/shell/favicon.png")
            )
            .content(
                tag("link")
                .attr("rel", "icon")
                .attr("type", "image/png")
                .attr("sizes", "32x32")
                .attr("href", "/::res/shell/favicon-32x32.png")
            )
            .content(
                tag("link")
                .attr("rel", "apple-touch-icon")
                .attr("type", "image/png")
                .attr("sizes", "180x180")
                .attr("href", "/::res/shell/apple-touch-icon.png")
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
            var uri = encodeURI(shareRoot.substr(userHome.length));
            result.push({
                "share": shareId,
                "uri": uri
            });
        }
    });

    return result;
}

function makeHtml(extensions)
{
    var tag = modHtml.tag;
    var t = tag("html")
            .content(
                makeHtmlHead("init", extensions)
                .content(
                    tag("script")
                    .attr("src", "/::res/shellfish/require.js")
                    .attr("data-main", "/::res/shell/index.js")
                    .attr("data-bundle", "/::jsbundle/")
                )
            )
            .content(
                tag("body").class("sh-theme-default")
                .attr("data-extensions", JSON.stringify(extensions))
                .content(
                    tag("input").id("upload").attr("type", "file").attr("multiple", "multiple").style("display", "none")
                )
                .content(
                    tag("a").id("download").data("ajax", "false").attr("href", "#").attr("download", "name").style("display", "none")
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
        var obj = {
            "uri": uri,
            "permissions": userContext.permissions(),
            "files": err ? [] : makeFilesJson(uri, stats),
            "shares": makeSharesJson(userContext.home(), shares),
            "ok": err ? false : true
        };

        var json = JSON.stringify(obj, 4);
        callback(true, json);
    });

}
exports.makeJson = makeJson;


function makeIndex(extensions, callback)
{
    var html = "<!DOCTYPE html>\n" + makeHtml(extensions).html();
    callback(true, html);
}
exports.makeIndex = makeIndex;


function makeLoginPage(callback)
{
    var tag = modHtml.tag;
    var t = tag("html")
            .content(
                makeHtmlHead("initLogin", [])
                .content(
                    tag("script")
                    .attr("src", "/::res/shellfish/require.js")
                    .attr("data-main", "/::res/shell/login.js")
                    .attr("data-bundle", "/::jsbundle/")
                )
            )
            .content(
                tag("body").class("sh-theme-default")
            );

    var html = "<!DOCTYPE html>\n" + t.html();
    callback(html);
}
exports.makeLoginPage = makeLoginPage;
