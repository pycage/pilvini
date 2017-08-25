const modLwip = require("lwip");

exports.makeImageThumbnail = function (imageFile, thumbFile, callback)
{
    modLwip.open(imageFile, function (err, image)
    {
        if (! err)
        {
            var scale = Math.max(80 / image.width(), 80 / image.height());

            var begin = Date.now();
            image.batch().scale(scale).writeFile(thumbFile, function (err)
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
