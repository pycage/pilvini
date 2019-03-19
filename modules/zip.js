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

var zipCache = { };


function openZipFile(zipPath, callback)
{
    var now = Date.now();
    for (var key in zipCache)
    {
        if (zipCache[key][0] + 5 * 60 * 1000 < now)
        {
            delete zipCache[key];
        }
    }

    if (zipCache[zipPath])
    {
        zipCache[zipPath][0] = now;
        callback(zipCache[zipPath][1]);
    }
    else
    {
        modVfs.readFile(zipPath, function (err, buffer)
        {
            if (err)
            {
                callback(null);
                return;
            }
            
            var zipper = new JSZip();
            zipper.loadAsync(buffer).then(function (zip)
            {
                if (zip)
                {
                    zipCache[zipPath] = [now, zip];
                }
                callback(zip);
            });
        });
    }
}


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
    function handle(zip)
    {
        if (! zip)
        {
            callback("failed to open ZIP", []);
            return;
        }

        var files = [];
        var seen = { };

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
                seen[name] = true;
            }                
        }

        for (var file in zip.files)
        {
            var fileObj = zip.files[file];
            var filePath = fileObj.name.replace(/\/$/, "");
            var dir = filePath.substr(0, filePath.lastIndexOf("/"));

            if (subPath === "" || dir.startsWith(subPath))
            {
                var pos = dir.indexOf("/", subPath.length);
                if (pos !== -1)
                {
                    var subDir = dir.substr(0, pos);
                    var parts = subDir.split("/");
                    var name = parts[parts.length - 1];

                    if (! seen[name])
                    {
                        files.push(name);
                        seen[name] = true;
                    }
                }
            }
        }

        callback(null, files);
    }

    subPath = subPath.replace(/\/$/, "");
    
    console.log("readZip: " + zipPath + "#" + subPath);
    openZipFile(zipPath, handle);
};

/* Returns a stream for reading the given file in a ZIP.
 */
exports.createReadStream = function (zipPath, innerPath, callback)
{
    function handle(zip)
    {
        if (! zip)
        {
            callback("failed to open ZIP", []);
            return;
        }

        zip.file(innerPath).async("nodebuffer").then(function (b)
        {
            var readable = new modStream.Readable();
            readable._read = function () { };
            readable.push(b);
            readable.push(null);
            callback(b.length, readable);
        });
    }

    openZipFile(zipPath, handle);
};

exports.createReadStreamRanged = function (zipPath, innerPath, from, to, callback)
{
    function handle(zip)
    {
        if (! zip)
        {
            callback("failed to open ZIP", []);
            return;
        }

        zip.file(innerPath).async("nodebuffer").then(function (b)
        {
            var readable = new modStream.Readable();
            readable._read = function () { };
            readable.push(b.slice(from, to - from));
            readable.push(null);
            callback(b.length, readable);
        });
    }

    openZipFile(zipPath, handle);
};

/* Opens a file in the ZIP and passes a handle to the callback.
 */
exports.open = function (zipPath, innerPath, mode, callback)
{
    function handle(zip)
    {
        if (! zip)
        {
            callback("failed to open ZIP", null);
            return;
        }

        var fd = {
            isZip: true,
            file: zip.file(innerPath)
        };
        callback(null, fd);
    }

    openZipFile(zipPath, handle);
};

/* Reads from the given file entry of a ZIP.
 */
exports.readFile = function (file, buffer, offset, length, position, callback)
{
    file.async("nodebuffer").then(function (b)
    {
        var readable = new modStream.Readable();
        readable._read = function () { };
        readable.push(b.slice(position, length));
        readable.push(null);
        
        var data = readable.read(length);
        data.copy(buffer, offset);
        callback(null, length, buffer);
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
    function handle(zip)
    {
        if (! zip)
        {
            callback("failed to open ZIP", []);
            return;
        }

        var stats = [];

        var existsAsPrefix = false;
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
            else if (filePath.startsWith(innerPath))
            {
                existsAsPrefix = true;
            }
        }

        if (stats.length === 0 && existsAsPrefix)
        {
            stats.push({
                isDirectory: function () { return true; },
                mtime: new Date(),
                size: 0
            });
        }

        if (stats.length === 0)
        {
            callback("no such file", null);
        }
        else
        {
            callback(null, stats[0]);
        }
    }

    innerPath = innerPath.replace(/\/$/, "");

    if (innerPath === "")
    {
        modVfs.stat(zipPath, callback);
        return;
    }
    
    openZipFile(zipPath, handle);
};
