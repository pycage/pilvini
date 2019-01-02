const modFs = require("fs"),
      modLwip = require("lwip"),
      modId3Tags = require("./id3tags");

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
    if (imageFile.toLowerCase().endsWith(".svg"))
    {
        var reader = modFs.createReadStream(imageFile);
        reader.on("end", function ()
        {
            callback(null);
        });
        reader.pipe(modFs.createWriteStream(thumbFile));
    }
    else
    {
        modLwip.open(imageFile, function (err, image)
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
    }
}

function makeVideoThumbnail(videoFile, thumbFile, maxWidth, maxHeight, callback)
{
    // I cannot create video thumbnails, but the client can do and send me
    callback("<clientside>");
}
