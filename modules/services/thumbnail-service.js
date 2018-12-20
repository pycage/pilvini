"use strict";

const attempt = require("../attempt.js").attempt;

const modCrypto = require("crypto"),
      modFs = require("fs"),
      modPath = require("path"),
      modUrl = require("url");

const modMime = require("../mime.js"),
      modUtils = require("../utils.js"),
      modThumbnail = attempt(function () {return require("../thumbnail.js"); });

var Service = function (contentRoot)
{
    var m_contentRoot = contentRoot;
    var m_thumbDir = modPath.join(contentRoot, ".pilvini", "thumbnails");

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);
        var href = urlObj.pathname.substr(12);
        var targetFile = modUtils.uriToPath(href, m_contentRoot + userContext.home());

        console.log("HREF: " + href + ", contentRoot: " + m_contentRoot + ", userHome: " + userContext.home());
        console.log("Thumbnail target file: " + targetFile);

        var hash = modCrypto.createHash("md5");
        hash.update(targetFile);
        var thumbFile = modPath.join(m_thumbDir, hash.digest("hex"));

        modFs.stat(targetFile, function (err, targetStats)
        {
            modFs.stat(thumbFile, function (err, thumbnailStats)
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
                    modUtils.mkdirs(m_thumbDir, function (err)
                    {
                        modThumbnail.makeThumbnail(modMime.mimeType(targetFile), targetFile, thumbFile, function (err)
                        {
                            if (err)
                            {
                                console.error(err);
                                response.writeHeadLogged(500, "Internal Server Error");
                                response.end();
                                callback();
                            }
                            else
                            {
                                modUtils.getFile(response, thumbFile);
                            }
                            modUtils.limitFiles(m_thumbDir, 1000);
                            callback();
                        });
                    });
                }
            });
        });
    };

};
exports.Service = Service;