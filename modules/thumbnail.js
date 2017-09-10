const modFs = require("fs"),
      modLwip = require("lwip");

exports.makeImageThumbnail = function (imageFile, thumbFile, callback)
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
        try
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
        catch (err)
        {
            callback(err);
        }
    }
}
