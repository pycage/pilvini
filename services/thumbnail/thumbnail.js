"use strict";

var requireShared = require.main.exports.requireShared;

const modFs = require("fs");

const modId3Tags = requireShared("id3tags"),
      modVfs = requireShared("vfs");

const modImgProcessing = require("./imgprocessing.js");


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
    if (! modImgProcessing)
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

            var begin = Date.now();
            modImgProcessing.scale(imageData, apic.mimeType, maxWidth, maxHeight, function (err, image)
            {
                if (err)
                {
                    callback(err);
                }
                else
                {
                    modFs.writeFile(thumbFile, image, function (err)
                    {
                        console.debug("Thumbnailing " + file + " -> " + thumbFile +
                                    " took " + (Date.now() - begin) + " ms");
                        callback(err);
                    });
                }
            });
        }
        else
        {
            callback(err);
        }
    });
}

function makeImageThumbnail(imageFile, thumbFile, maxWidth, maxHeight, callback)
{
    if (! modImgProcessing)
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
                type = "image/gif";
            }
            else if (imageFile.toLowerCase().endsWith(".png"))
            {
                type = "image/png";
            }
            else if (imageFile.toLowerCase().endsWith(".jpg"))
            {
                type = "image/jpeg";
            }
            else if (imageFile.toLowerCase().endsWith(".jpeg"))
            {
                type = "image/jpeg";
            }
            else
            {
                callback("Unsupported image type");
            }

            var begin = Date.now();
            modImgProcessing.scale(buffer, type, maxWidth, maxHeight, function (err, image)
            {
                if (err)
                {
                    callback(err);
                }
                else
                {
                    modFs.writeFile(thumbFile, image, function (err)
                    {
                        console.debug("Thumbnailing " + imageFile + " -> " + thumbFile +
                                    " took " + (Date.now() - begin) + " ms");
                        callback(err);
                    });
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
