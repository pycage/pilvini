const [core] = await shRequire(["shellfish/core"]);
const modChildProcess = require("node:child_process");
const modFs = require("node:fs");

function spawn(cmd, args, stdinData)
{
    return new Promise((resolve, reject) =>
    {
        const proc = modChildProcess.spawn(cmd, args);
        proc.stdin.write(new Uint8Array(stdinData));
        proc.stdin.end();

        const chunks = [];

        proc.stdout.on("data", chunk =>
        {
            chunks.push(Buffer.from(chunk, "binary"));
        });

        proc.stderr.on("data", chunk =>
        {
            console.error(chunk.toString());
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
                reject("Failed to execute: " + cmd);
            }
        });
    });
}

function readFile(path)
{
    return new Promise((resolve, reject) =>
    {
        const chunks = [];
        const stream = modFs.createReadStream(path, { encoding: "binary" });
        stream.on("data", chunk =>
        {
            chunks.push(Buffer.from(chunk, "binary"));
        });
        stream.on("end", () =>
        {
            const buffer = Buffer.concat(chunks);
            resolve(buffer.buffer);
        });
        stream.on("error", err =>
        {
            reject(err);
        });
    });
}

function formatInt(n, digits)
{
    let s = "" + n;
    while (s.length < digits)
    {
        s = "0" + s;
    }
    return s;
}


const d = new WeakMap();

/**
 * Filesystem implementation that treats PDF files as read-only filesystems.
 * 
 * Currently only works on Unix-like systems with the tools `pdfinfo` and
 * `pdftoppm` (from `poppler-utils`).
 */
class PdfFS extends core.Filesystem
{
    constructor()
    {
        super();
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
        console.log("LIST PDF CONTENTS " + path);
        const files = [];

        try
        {
            const filePath = await vfsData.materialized();
            let info = null;
            console.log("pdfinfo " + filePath);
            info = await spawn("pdfinfo", [filePath]);

            console.log(info.toString());

            const lines = info.toString().split("\n").filter(l => l.startsWith("Pages:"));
            if (lines)
            {
                const pagesEntry = lines[0];
                const pages = Number.parseInt(pagesEntry.split(":")[1].trim());
                const digits = ("" + pages).length;

                for (let i = 0; i < pages; ++i)
                {
                    const path = "/" + formatInt(i + 1, digits) + ".jpg";
                    files.push({
                        path: path,
                        dir: this.dirname(path),
                        name: this.filename(path),
                        type: "f",
                        size: 0,
                        mimetype: "image/jpeg",
                        ctime: new Date(),
                        mtime: new Date()
                    });
                }
            }
        }
        catch (err)
        {
            console.log(err);
        }

        return files;
    }

    async vfsRead(vfsData, path)
    {
        const page = this.filename(path).split(".")[0];

        try
        {
            const pdfPath = await vfsData.materialized();
            const tmpFile = core.temporaryFilePath();
    
            await spawn("pdftoppm", ["-singlefile", "-scale-to", "3960", "-jpeg", "-jpegopt", "quality=90,progressive=n", "-f", page, pdfPath, tmpFile], pdfPath);

            const data = await readFile(tmpFile + ".jpg");
            modFs.unlink(tmpFile + ".jpg", () => { });

            return new core.FileData(data);
        }
        catch (err)
        {
            console.log(err);
            return null;
        }
    }
}
exports.PdfFS = PdfFS;
