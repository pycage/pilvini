"use strict";

const modFs = require("fs"),
      modPath = require("path");

/* Creates a hierarchy of directories recursively.
 */
function mkdirs(path, callback)
{
    var dir = modPath.dirname(path);
    var name = modPath.basename(path);

    modFs.exists(dir, function (ok)
    {
        console.debug("mkdir " + path);
        if (ok)
        {
            modFs.mkdir(path, function (err)
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
