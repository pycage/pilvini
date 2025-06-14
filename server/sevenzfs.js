const [core, mime] = await shRequire(["shellfish/core", "shellfish/core/mime"]);
const modChildProcess = require("node:child_process");
const modStream = shRequire.environment === "node" ? require("node:stream") : null;

/* A readable stream that only opens its source when it's actually being read.
 */
class LazyReadable extends modStream.Transform
{
    constructor(f, options)
    {
        super(options);
        this.f = f;
    }

    _read(size)
    {
        if (this.f)
        {
            const readable = this.f();
            readable.pipe(this);
            this.f = null;    
        }
        super._read(size);
    }

    _transform(data, encoding, callback)
    {
        this.push(data);
        callback();
    }
}

function spawn(cmd, args)
{
    return new Promise((resolve, reject) =>
    {
        const proc = modChildProcess.spawn(cmd, args);
        const chunks = [];

        proc.stdout.on("data", chunk =>
        {
            chunks.push(Buffer.from(chunk, "binary"));
        });

        proc.stderr.on("data", chunk =>
        {
            console.log("error: " + chunk.toString());
        });

        proc.on("error", err =>
        {
            reject(err);
        });

        proc.on("close", code =>
        {
            if (code === 0)
            {
                resolve(Buffer.concat(chunks));
            }
            else
            {
                reject("Failed to execute: " + cmd + " " + JSON.stringify(args) + ": " + code);
            }
        });
    });
}

function spawnStream(cmd, args)
{
    const proc = modChildProcess.spawn(cmd, args);
    return proc.stdout;
}


const d = new WeakMap();

/**
 * Virtual filesystem class for accessing archives readable by 7zip.
 * 
 * @extends core.Filesystem
 */
class SevenZFS extends core.Filesystem
{
    constructor()
    {
        super();

        d.set(this, {
            cache: []
        });
    }

    async vfsFileInfo(vfsData, path)
    {
        if (path === "" || path === "/")
        {
            return {
                path: "/",
                dir: "/",
                name: "",
                type: "d",
                size: 0,
                mimetype: "application/x-folder",
                ctime: new Date(),
                mtime: new Date()
            };
        }

        const files = await this.vfsList(vfsData, this.dirname(path));
        const item = files.find(item => item.path === path || "/" + item.path === path);
        return item;
    }

    async vfsList(vfsData, path)
    {
        let info = "";

        try
        {
            const vfsPath = await vfsData.materialized();
            info = await spawn("7zz", ["l", vfsPath]);
        }
        catch (err)
        {
            console.log(err);
        }

        let inToc = false;
        const lines = info.toString().split("\n").filter(line =>
        {
            if (line.startsWith("------------------- ----- "))
            {
                inToc = ! inToc;
                return false;
            }
            else
            {
                return inToc;
            }
        })
        .filter(line =>
        {
            let itemPath = line.substring(53);
            if (! itemPath.startsWith("/"))
            {
                itemPath = "/" + itemPath;
            }
            return itemPath !== path && itemPath.startsWith(path);
        });

        const toc = [];
        const tocSet = new Set();

        lines.forEach(line =>
        {
            const date = line.substring(0, 19);
            const attrs = line.substring(20, 25);
            const size = Number.parseInt(line.substring(26, 38));
            let itemPath = line.substring(53);
            if (! itemPath.startsWith("/"))
            {
                itemPath = "/" + itemPath;
            }
    
            // subtract prefix
            itemPath = itemPath.substring(path.length);
            if (! itemPath.startsWith("/"))
            {
                itemPath = "/" + itemPath;
            }

            const parts = itemPath.split("/");
            const filename = parts[1];

            if (tocSet.has(filename))
            {
                return;
            }

            const isDir = parts.length > 2 || attrs[0] === "D";
            const filePath = path.endsWith("/") ? path + filename : path + "/" + filename;

            toc.push({
                path: filePath,
                dir: this.dirname(filePath),
                name: filename,
                type: isDir ? "d" : "f",
                size: size,
                mimetype: isDir ? "application/x-folder" : mime.mimeType(filename),
                ctime: new Date(date),
                mtime: new Date(date)
            });
            tocSet.add(filename);
        });

        return toc;
    }

    async vfsRead(vfsData, path)
    {
        if (path[0] === "/")
        {
            path = path.substring(1);
        }

        const vfsPath = await vfsData.materialized();

        const stream = new LazyReadable(() =>
        {
            return spawnStream("7zz", ["x", "-so", vfsPath, path]);
        });
        return new core.FileData(stream, path);
    }
}
exports.SevenZFS = SevenZFS;
