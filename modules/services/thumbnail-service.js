"use strict";

const attempt = require("../attempt.js").attempt;

const modCrypto = require("crypto"),
      modPath = require("path"),
      modUrl = require("url");

const modMime = require("../mime.js"),
      modUtils = require("../utils.js"),
      modThumbnail = attempt(function () {return require("../thumbnail.js"); }),
      modVfs = require("../vfs.js");


function loadOrCreateThumbnail(targetFile, thumbDir, thumbFile, maxWidth, maxHeight, response, callback)
{
    modVfs.stat(targetFile, function (err, targetStats)
    {
        modVfs.stat(thumbFile, function (err, thumbnailStats)
        {
            console.debug("Thumbnail mtime: " +
                          (thumbnailStats ? thumbnailStats.mtime : "<unavailable>") +
                          ", target mtime: " +
                          (targetStats ? targetStats.mtime : "<unavailable>"));
            if (! err && thumbnailStats && targetStats && targetStats.mtime < thumbnailStats.mtime)
            {
                // thumbnail exists and is not outdated
                modUtils.getFile(response, thumbFile);
                callback();
            }
            else
            {
                // generate thumbnail
                modUtils.mkdirs(thumbDir, function (err)
                {
                    modThumbnail.makeThumbnail(modMime.mimeType(targetFile), targetFile, thumbFile, maxWidth, maxHeight, function (err)
                    {
                        if (err)
                        {
                            console.error(err);
                            if (err === "<clientside>")
                            {
                                response.writeHeadLogged(204, "Client Side");
                            }
                            else
                            {
                                response.writeHeadLogged(500, "Internal Server Error");
                            }
                            response.end();
                            callback();
                        }
                        else
                        {
                            modUtils.getFile(response, thumbFile);
                        }
                        callback();
                    });
                });
            }
        });
    });
}

function writeThumbnail(thumbDir, thumbFile, stream, response, callback)
{
    modUtils.mkdirs(thumbDir, function (err)
    {
        modVfs.open(thumbFile, "w", function(err, fd)
        {
            if (err)
            {
                console.error(err);
                response.writeHeadLogged(409, "Conflict");
                callback();
                return;
            }
           
            var writeStream = modVfs.createWriteStreamFd(fd);
            
            stream.on("data", function(data)
            {
                writeStream.write(data);
            });
            
            stream.on("end", function()
            {
                writeStream.end();
            });
            
            writeStream.on("finish", function()
            {
                response.writeHeadLogged(200, "OK");
                response.end();
                callback();
            });
        });
    });
}


var Service = function (contentRoot)
{
    var m_contentRoot = contentRoot;
    var m_thumbDir = modPath.join(contentRoot, ".pilvini", "thumbnails");

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);
        var href = urlObj.pathname.substr(12);
        var targetFile = modUtils.uriToPath(href, m_contentRoot + userContext.home());

        var maxWidth = request.headers["x-pilvini-width"] || 10;
        var maxHeight = request.headers["x-pilvini-height"] || 10;

        console.log("HREF: " + href + ", contentRoot: " + m_contentRoot + ", userHome: " + userContext.home());
        console.log("Thumbnail target file: " + targetFile);

        var hash = modCrypto.createHash("md5");
        hash.update(targetFile + "-" + maxWidth + "x" + maxHeight);
        var thumbFile = modPath.join(m_thumbDir, hash.digest("hex"));

        if (request.method === "GET")
        {
            console.log("thumbfile: " + thumbFile);
            loadOrCreateThumbnail(targetFile, m_thumbDir, thumbFile, maxWidth, maxHeight, response, function ()
            {
                modUtils.limitFiles(m_thumbDir, 10000);
                callback();
            });
        }
        else if (request.method === "PUT")
        {
            writeThumbnail(m_thumbDir, thumbFile, request, response, function ()
            {
                modUtils.limitFiles(m_thumbDir, 10000);
                callback();
            });
        }
    };
};
exports.Service = Service;
