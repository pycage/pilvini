"use strict";

const JSZip = require("jszip"),
      modFs = require("fs"),
      modPath = require("path"),
      modStream = require("stream");

const modVfs = require("./vfs.js");

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
};

exports.readZip = function(zipPath, subPath, callback)
{
    subPath = subPath.replace(/\/$/, "");
    
    console.log("readZip: " + zipPath + "#" + subPath);

    modVfs.readFile(zipPath, function (err, buffer)
    {
        if (err)
        {
            callback(err, []);
            return;
        }
        
        var zipper = new JSZip();
        zipper.loadAsync(buffer).then(function (zip)
        {
            var files = [];

            for (var file in zip.files)
            {
                var fileObj = zip.files[file];
                var filePath = fileObj.name.replace(/\/$/, "");
                var dir = filePath.substr(0, filePath.lastIndexOf("/"));

                if (dir === subPath)
                {
                    var parts = filePath.split("/");
                    var name = parts[parts.length - 1];
                    files.push(name);
                }                
            }

            callback(null, files);
        });

    });
};

/* Returns a stream for reading the given file in a ZIP.
 */
exports.createReadStream = function (zipPath, innerPath, callback)
{
    modVfs.readFile(zipPath, function (err, buffer)
    {
        if (err)
        {
            callback(err, []);
            return;
        }
        var zipper = new JSZip();
        zipper.loadAsync(buffer).then(function (zip)
        {
            zip.file(innerPath).async("nodebuffer").then(function (b)
            {
                var readable = new modStream.Readable();
                readable._read = function () { };
                readable.push(b);
                readable.push(null);
                callback(b.length, readable);
            });
        });
    });
};

exports.createReadStreamRanged = function (zipPath, innerPath, from, to, callback)
{
    modVfs.readFile(zipPath, function (err, buffer)
    {
        if (err)
        {
            callback(err, []);
            return;
        }
        var zipper = new JSZip();
        zipper.loadAsync(buffer).then(function (zip)
        {
            zip.file(innerPath).async("nodebuffer").then(function (b)
            {
                var readable = new modStream.Readable();
                readable._read = function () { };
                readable.push(b.slice(from, to - from));
                readable.push(null);
                callback(b.length, readable);
            });
        });
    });
};

/* Opens a file in the ZIP and passes a handle to the callback.
 */
exports.open = function (zipPath, innerPath, mode, callback)
{
    modVfs.readFile(zipPath, function (err, buffer)
    {
        if (err)
        {
            callback(err, null);
            return;
        }
        var zipper = new JSZip();
        zipper.loadAsync(buffer).then(function (zip)
        {
            var fd = {
                isZip: true,
                file: zip.file(innerPath)
            };
            callback(null, fd);
        });
    });
};

/* Closes the given handle.
 */
exports.close = function (fd, callback)
{
    callback(null);
};

exports.stat = function (zipPath, innerPath, callback)
{
    innerPath = innerPath.replace(/\/$/, "");

    if (innerPath === "")
    {
        modVfs.stat(zipPath, callback);
        return;
    }
    
    modVfs.readFile(zipPath, function (err, buffer)
    {
        if (err)
        {
            callback(err, []);
            return;
        }
        
        var zipper = new JSZip();
        zipper.loadAsync(buffer).then(function (zip)
        {
            var stats = [];

            for (var file in zip.files)
            {
                var fileObj = zip.files[file];
                var filePath = fileObj.name.replace(/\/$/, "");
                var dir = filePath.substr(0, filePath.lastIndexOf("/"));

                if (filePath === innerPath)
                {
                    var parts = filePath.split("/");
                    var name = parts[parts.length - 1];
                    var isDir = fileObj.dir;
                    stats.push({
                        isDirectory: function (isDir) { return function () { return isDir; }; }(isDir),
                        mtime: new Date(fileObj.date),
                        size: fileObj._data.uncompressedSize 
                    });
                }                
            }

            if (stats.length === 0)
            {
                callback("no such file", null);
            }
            else
            {
                callback(null, stats[0]);
            }
        });

    });
};
