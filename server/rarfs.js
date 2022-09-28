const { Stream } = require("stream");

console.log(__filename);
require.main.paths.push((__dirname).replace(/\//g, "\\"));
console.log(require.main.paths);

const unrar = require("./server/node-unrar-js/index.js");

shRequire(["shellfish/core", "shellfish/core/mime"], (core, mime) =>
{
    const modStream = require("stream");

    class FileStream extends modStream.Readable
    {
        constructor(data)
        {
            super();
            this.data = data;
        }
        
        _read(size)
        {
            this.push(this.data);
            this.push(null);
        }
    }

    class File
    {
        constructor(data)
        {
            this.data = data;
        }

        async arrayBuffer()
        {
            return this.data.buffer;
        }

        stream(from, to)
        {
            return new FileStream(this.data);
        }

        text()
        {
            return this.arrayBuffer();
        }
    }

    /*
    function __awaiter(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments)).next());
        });
    }
    
    class DataReader extends rar.Reader
    {
        constructor(data)
        {
            super();
            this.data = data;
            this.size = data.length;
        }

        readBlob(length, position, blobType) {
            return __awaiter(this, void 0, void 0, function* () {
                if (! blobType) {
                    blobType = 'application/octet-stream';
                }
                const data = this.read(length, position);
                return data;
            });
        }

        open()
        {
            return Promise.resolve();
        }

        close()
        {
            return Promise.resolve();
        }

        reset()
        {
            return;
        }

        read(length, position)
        {
            return __awaiter(this, void 0, void 0, function* ()
            {
                return new Promise((resolve, reject) =>
                {
                    try
                    {
                        const buf = this.data.subarray(position, position + length);
                        const ab = new ArrayBuffer(buf.length);
                        const view = new Uint8Array(ab);
                        for (let i = 0; i < buf.length; ++i)
                        {
                            view[i] = buf[i];
                        }
                        resolve(ab);
                    }
                    catch (err)
                    {
                        reject(err);
                    }
                });
            });
        }
    }
    */


    const d = new WeakMap();

    class RarFS extends core.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
                data: null
                //archive: null
            });

            this.notifyable("data");

            this.onDestruction = () =>
            {
                this.freeSharedResource("archive-" + this.objectId);
            };
        }

        get data() { return d.get(this).data; }
        set data(dt)
        {
            if (dt !== d.get(this).data)
            {
                d.get(this).data = dt;
                this.freeSharedResource("archive-" + this.objectId);
                this.dataChanged();
            }
        }

        async openArchive()
        {
            const wait = () =>
            {
                return new Promise(async (resolve, reject) =>
                {
                    if (this.awaitSharedResource("archive-" + this.objectId, () => resolve()))
                    {
                        const archive = await unrar.createExtractorFromData({ data: d.get(this).data });
                        this.sharedResource("archive-" + this.objectId, () => archive);
                    }
                });
            };

            await wait();

            return this.sharedResource("archive-" + this.objectId);
        }

        async fileInfo(path)
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
            console.log("VFS FILE INFO: " + path);
            const files = await this.list(this.dirname(path));
            const item = files.find(item => item.path === path || "/" + item.path === path);
            return item;
        }

        async list(path)
        {
            const archive = await this.openArchive();

            //const archive = await unrar.createExtractorFromData({ data: d.get(this).data });
            console.log(archive);

            const fileList = archive.getFileList();
            const headers = [...fileList.fileHeaders];

            const items = headers
            .filter(entry => this.dirname("/" + entry.name) === path)
            .map(entry =>
            {
                return {
                    path: entry.name,
                    dir: this.dirname(entry.name),
                    name: this.filename(entry.name),
                    type: entry.flags.directory ? "d" : "f",
                    size: entry.unpSize,
                    mimetype: mime.mimeType(entry.name),
                    ctime: new Date(entry.time),
                    mtime: new Date(entry.time)
                };
            });

            //d.get(this).archive = archive;

            return items;
        }

        async read(path)
        {
            const archive = await this.openArchive();

            console.log(path);
            const extracted = archive.extract({ files: [path.substr(1)] });
            const files = [...extracted.files];
            
            if (files.length > 0)
            {
                return new File(files[0].extraction);
            }
            else
            {
                return null;
            }
        }
    }
    exports.RarFS = RarFS;

});
