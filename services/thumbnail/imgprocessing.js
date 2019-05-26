"use strict";

/* Wrapper for image processing stuff. */

const modSharp = require("sharp");
//const modJimp = require("jimp");
//const modLwip = require("lwip");

exports.scale = function (buffer, mimeType, width, height, callback)
{
    modSharp(buffer).resize(width, height).png().toBuffer(function (err, buffer)
    {
        callback(err, buffer);
    });
};

exports.scaleJimp = function (buffer, mimeType, width, height, callback)
{
    modJimp.read(buffer)
    .then(function (image)
    {
        image.scaleToFit(width, height).getBuffer(mimeType, function (err, buffer)
        {
            callback(err, buffer);
        });
    })
    .catch(function (err)
    {
        callback(err, null);
    });
};

exports.scaleLwip = function (buffer, mimeType, width, height, callback)
{
    var imageType = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "PNG": "png",
        "JPG": "jpg",
        "GIF": "gif"
    }[mimeType];

    modLwip.open(buffer, imageType, function (err, image)
    {
        if (! err)
        {
            var scale = Max.max(width / image.width(), height / image.height());
            image.batch().scale(scale).toBuffer(imageType, function (err, buffer)
            {
                callback(err, buffer);
            });
        }
        else
        {
            callback(err, null);
        }
    });
};

