"use strict";

const modFs = require("fs");

const modZip = require("./zip.js");


/* Returns the chain of virtual file systems used in the given path.
 */
function vfsChain(path)
{
    var chain = ["fs"];

    var parts = path.split("/");
    parts.slice(0, parts.length - 1).forEach(function (p)
    {
        var lcpath = p.toLowerCase();
        var type = "";
        if (lcpath.endsWith(".zip"))
        {
            type = "zip";
        }
        else if (lcpath.endsWith(".tgz"))
        {
            type = "tgz";
        }

        if (type !== "" && type !== chain[chain.length - 1])
        {
            chain.push(type);
        }
    });

    return chain;
}

/* Returns the last (innermost) virtual file system in the given path.
 */
function lastVfs(path)
{
    var chain = vfsChain(path);
    return chain[chain.length - 1];
}

/* Splits the given path up into the path leading to the innermost filesystem and the innermost path.
 */
function splitPath(path)
{
    var parts = path.split("/");
    var idx = -1;
    for (var i = parts.length - 2; i >= 0; --i)
    {
        var lcpath = parts[i].toLowerCase();
        if (lcpath.endsWith(".zip") ||
            lcpath.endsWith(".tgz"))
        {
            idx = i;
            break;
        }
    }
    
    if (idx != -1)
    {
        var outerPath = parts.slice(0, idx + 1).join("/");
        var innerPath = parts.slice(idx + 1).join("/");
        //console.log("vfs.splitPath: " + path + " -> " + outerPath + "#" + innerPath);
        return [outerPath, innerPath];
    }
    else
    {
        return ["", ""];
    }
};


exports.close = function (fd, callback)
{
    //console.log("vfs.close");

    if (fd.isZip)
    {
        modZip.close(fd, callback);
    }
    else
    {
        modFs.close(fd, callback);
    }
};

exports.createReadStream = function (path, callback)
{
    //console.log("vfs.createReadStream");

    switch (lastVfs(path))
    {
    case "zip":
        var parts = splitPath(path);
        modZip.createReadStream(parts[0], parts[1], function (size, stream)
        {
            callback(stream);
        });
        break;
    default:
        try
        {
            callback(modFs.createReadStream(path));
        }
        catch (err)
        {
            console.log(err);
            callback(null);
        }
        break;
    }
};

exports.createReadStreamRanged = function (path, from, to, callback)
{
    //console.log("vfs.createReadStream");

    switch (lastVfs(path))
    {
    case "zip":
        var parts = splitPath(path);
        modZip.createReadStreamRanged(parts[0], parts[1], from, to, function (size, stream)
        {
            callback(stream);
        });
        break;
    default:
        callback(modFs.createReadStream(path, { start: from, end: to}));
        break;
    }
};

exports.createWriteStream = function (path, callback)
{
    //console.log("vfs.createWriteStream");
    try
    {
        callback(modFs.createWriteStream(path));
    }
    catch (err)
    {
        console.log(err);
        callback(null);
    }
};

exports.createWriteStreamFd = function (fd, callback)
{
    //console.log("vfs.createWriteStreamFd");
    try
    {
        callback(modFs.createWriteStream("", { "fd": fd }));
    }
    catch (err)
    {
        console.log(err);
        callback(null);
    }
};

exports.fstat = function (fd, callback)
{
    modFs.fstat(fd, callback);
};

exports.mkdir = function (path, callback)
{
    modFs.mkdir(path, callback);
};

exports.open = function (path, mode, callback)
{
    //console.log("vfs.open");

    switch (lastVfs(path))
    {
    case "zip":
        var parts = splitPath(path);
        modZip.open(parts[0], parts[1], mode, callback);
        break;
    default:
        modFs.open(path, mode, callback);
        break;
    }
};

exports.read = function (fd, buffer, offset, length, position, callback)
{
    //console.log("vfs.read");

    if (fd.isZip)
    {
        modZip.readFile(fd.file, buffer, offset, length, position, callback);
    }
    else
    {
        modFs.read(fd, buffer, offset, length, position, callback);
    }
};

exports.readdir = function (path, callback)
{
    //console.log("vfs.readdir");

    if (! path.endsWith("/"))
    {
        path += "/";
    }

    switch (lastVfs(path))
    {
    case "zip":
        var parts = splitPath(path);
        modZip.readZip(parts[0], parts[1], callback);
        break;
    default:
        modFs.readdir(path, callback);
        break;
    }
};

exports.readFile = function (path, callback)
{
    //console.log("vfs.readFile");

    switch (lastVfs(path))
    {
    case "zip":
        var parts = splitPath(path);
        modZip.createReadStream(parts[0], parts[1], function (size, stream)
        {
            callback(null, stream.read());
        });
        break;
    default:
        modFs.readFile(path, callback);
        break;
    }
};

exports.rename = function (path, newPath, callback)
{
    modFs.rename(path, newPath, callback);
};

exports.rmdir = function (path, callback)
{
    modFs.rmdir(path, callback);
};

exports.stat = function (path, callback)
{
    //console.log("vfs.stat");

    switch (lastVfs(path))
    {
    case "zip":
        var parts = splitPath(path);
        modZip.stat(parts[0], parts[1], callback);
        break;
    default:
        modFs.stat(path, callback);
        break;
    }
};

exports.unlink = function (path, callback)
{
    modFs.unlink(path, callback);
};

exports.writeFile = function (path, data, callback)
{
    modFs.writeFile(path, data, callback);
};
