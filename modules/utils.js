"use strict";

const modFs = require("fs"),
      modPath = require("path"),
      modMime = require("./mime.js"),
      modVfs = require("./vfs.js");

/* Creates a hierarchy of directories recursively.
 */
function mkdirs(path, callback)
{
    var dir = modPath.dirname(path);
    var name = modPath.basename(path);

    modVfs.stat(dir, function (err, stat)
    {
        console.debug("mkdir " + path);
        if (! err)
        {
            modVfs.mkdir(path, function (err)
            {
                callback(err);
            });
        }
        else
        {
            mkdirs(dir, function (err)
            {
                callback(err);
            });
        }
    });
}
exports.mkdirs = mkdirs;


function uriToPath(uri, contentRoot)
{
    return modPath.join(contentRoot, decodeURIComponent(uri).replace(/\//g, modPath.sep));
}
exports.uriToPath = uriToPath;


/* Limits the files in the given directory to a certain amount by removing
 * the oldest files.
 */
function limitFiles(path, amount)
{
    modFs.readdir(path, function (err, files)
    {
        if (err)
        {
            return;
        }

        var result = [];
        for (var i = 0; i < files.length; ++i)
        {
            var filePath = modPath.join(path, files[i]);
            modFs.stat(filePath, function (file) { return function (err, stat)
            {
                result.push([file, stat]);
                if (result.length === files.length)
                {
                    result.sort(function (a, b)
                    {
                        if (! a[1] || ! b[1])
                        {
                            return 0;
                        }
                        else
                        {
                            return a[1].mtime - b[1].mtime;
                        } 
                    });

                    while (result.length > amount)
                    {
                        var path = result[0][0];
                        console.debug("Clearing old file: " + path + " (" + result[0][1].mtime + ")");
                        result.shift();
                        modFs.unlink(path, function (err) { });
                    }
                }
            }; } (filePath));
        }
    });
}
exports.limitFiles = limitFiles;


/* Retrieves the given file via HTTP.
 */
function getFile(response, path)
{
    modVfs.readFile(path, function (err, data)
    {
        if (err)
        {
            response.writeHeadLogged(404, "Not found");
            response.end();
        }
        else
        {
            response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
            response.setHeader("Content-Type", modMime.mimeType(path));
            response.writeHeadLogged(200, "OK");
            response.write(data);
            response.end();
        }
    });
}
exports.getFile = getFile;
