"use strict";

const attempt = require("../attempt.js").attempt;

const modFs = require("fs"),
      modLwip = attempt(function () {return require("lwip"); });

const modId3Tags = require("./id3tags"),
      modVfs = require("./vfs.js");

exports.makeThumbnail = function (mimeType, file, thumbFile, maxWidth, maxHeight, callback)
{
    try
    {
        if (mimeType.startsWith("image/"))
        {
            makeImageThumbnail(file, thumbFile, maxWidth, maxHeight, callback);
        }
        else if (mimeType.startsWith("audio/"))
        {
            makeAudioThumbnail(file, thumbFile, maxWidth, maxHeight, callback);
        }
        else if (mimeType.startsWith("video/"))
        {
            makeVideoThumbnail(file, thumbFile, maxWidth, maxHeight, callback);
        }
        else
        {
            callback(null);
        }
    }
    catch (err)
    {
        callback(err);
    }
};

function makeAudioThumbnail(file, thumbFile, maxWidth, maxHeight, callback)
{
    if (! modLwip)
    {
        callback("<clientside>");
        return;
    }

    var tagParser = new modId3Tags.Tags(file);
    tagParser.read(function (err)
    {
        if (err)
        {
            callback(err);
            return;
        }

        if (tagParser.has("PICTURE"))
        {
            var apic = tagParser.get("PICTURE");
            if (! apic.data)
            {
                callback("No data");
                return;
            }

            console.log("mimetype: " + apic.mimeType);
            var imageData = new Buffer(apic.data, "binary");
            var imageType = {
                "image/png": "png",
                "image/jpeg": "jpg",
                "PNG": "png",
                "JPG": "jpg"
            }[apic.mimeType];

            try
            {
                modLwip.open(imageData, imageType, function (err, image)
                {
                    if (! err)
                    {
                        var scale = Math.max(maxWidth / image.width(), maxHeight / image.height());
    
                        var begin = Date.now();
                        image.batch().scale(scale).writeFile(thumbFile, imageType, function (err)
                        {
                            console.debug("Thumbnailing " + file + " -> " + thumbFile +
                                          " took " + (Date.now() - begin) + " ms");
                            callback(err);
                        });
                    }
                    else
                    {
                        callback(err);
                    }
                });
            }
            catch (err)
            {
                callback(err);
            }
        }
        else
        {
            callback(err);
        }
    });
}

function makeImageThumbnail(imageFile, thumbFile, maxWidth, maxHeight, callback)
{
    if (! modLwip)
    {
        callback("<clientside>");
        return;
    }
    
    if (imageFile.toLowerCase().endsWith(".svg"))
    {
        modVfs.createReadStream(imageFile, function (reader)
        {
            reader.on("end", function ()
            {
                callback(null);
            });
            reader.pipe(modFs.createWriteStream(thumbFile));    
        });
    }
    else
    {
        modVfs.readFile(imageFile, function (err, buffer)
        {
            if (err)
            {
                callback(err);
                return;
            }
            
            var type = "";
            if (imageFile.toLowerCase().endsWith(".gif"))
            {
                type = "gif";
            }
            else if (imageFile.toLowerCase().endsWith(".png"))
            {
                type = "png";
            }
            else if (imageFile.toLowerCase().endsWith(".jpg"))
            {
                type = "jpg";
            }
            else if (imageFile.toLowerCase().endsWith(".jpeg"))
            {
                type = "jpg";
            }
            else
            {
                callback("Unsupported image type");
            }

            modLwip.open(buffer, type, function (err, image)
            {
                if (! err)
                {
                    var scale = Math.max(maxWidth / image.width(), maxHeight / image.height());
    
                    var begin = Date.now();
                    image.batch().scale(scale).writeFile(thumbFile, "jpg", function (err)
                    {
                        console.debug("Thumbnailing " + imageFile + " -> " + thumbFile +
                                      " took " + (Date.now() - begin) + " ms");
                        callback(err);
                    });
                }
                else
                {
                    callback(err);
                }
            });
        });
    }
}

function makeVideoThumbnail(videoFile, thumbFile, maxWidth, maxHeight, callback)
{
    // I cannot create video thumbnails, but the client can do and send me
    callback("<clientside>");
}
