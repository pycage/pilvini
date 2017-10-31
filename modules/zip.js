"use strict";

const JSZip = require("jszip"),
      modFs = require("fs"),
      modPath = require("path");

var CountToken = function (count, callback)
{
    this.decrease = function ()
    {
        --count;
        if (count === 0)
        {
            callback();
        }
    };

    if (count === 0)
    {
        callback();
    }
};

function addFileSync(zip, path)
{
    var stats = modFs.statSync(path);
    if (stats.isDirectory())
    {
        var zipFolder = zip.folder(modPath.basename(path));
        var files = modFs.readdirSync(path);
        for (var i = 0; i < files.length; ++i)
        {
            addFileSync(zipFolder, modPath.join(path, files[i]));
        }
    }
    else
    {
        zip.file(modPath.basename(path), modFs.readFileSync(path));
    }
}

function addFile(zip, path, callback)
{
    modFs.stat(path, function (err, stats)
    {
        if (err)
        {
            callback(err);
            return;
        }

        if (stats.isDirectory())
        {
            var zipFolder = zip.folder(modPath.basename(path));
            modFs.readdir(path, function (err, files)
            {
                if (err)
                {
                    callback(err);
                    return;
                }

                var token = new CountToken(files.length, function ()
                {
                    callback(null);
                });

                for (var i = 0; i < files.length; ++i)
                {
                    addFile(zipFolder, modPath.join(path, files[i]), function ()
                    {
                        token.decrease();
                    });
                }
            });
        }
        else
        {
            var stream = modFs.createReadStream(path);
            zip.file(modPath.basename(path), stream);
            callback(null);
        }
    });
}

exports.makeZip = function(path, callback)
{
    var zip = new JSZip();

    addFile(zip, path, function (err)
    {
        callback(err, zip.generateNodeStream({ streamFiles:true }));
    });
}
