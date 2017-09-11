const modFs = require("fs"),
      modLwip = require("lwip"),
      modId3Tags = require("./id3tags");

exports.makeThumbnail = function (mimeType, file, thumbFile, callback)
{
    try
    {
        if (mimeType.startsWith("image/"))
        {
            makeImageThumbnail(file, thumbFile, callback);
        }
        else if (mimeType.startsWith("audio/"))
        {
            makeAudioThumbnail(file, thumbFile, callback);
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

function makeAudioThumbnail(file, thumbFile, callback)
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
            var imageData = new Buffer(apic.data, "binary");
            var imageType = {
                "image/png": "png",
                "image/jpeg": "jpg"
            }[apic.mimeType];

            modLwip.open(imageData, "jpg", function (err, image)
            {
                if (! err)
                {
                    var scale = Math.max(80 / image.width(), 80 / image.height());

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
        else
        {
            callback(err);
        }
    });
}

function makeImageThumbnail(imageFile, thumbFile, callback)
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
                var scale = Math.max(80 / image.width(), 80 / image.height());

                var begin = Date.now();
                image.batch().scale(scale).writeFile(thumbFile, "png", function (err)
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
