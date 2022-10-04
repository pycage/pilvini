shRequire(["shellfish/core", "shellfish/core/mime"], (core, mime) =>
{
    const modStream = require("stream");
    const unrar = require("./server/node-unrar-js/index.js");

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


    const d = new WeakMap();

    class RarFS extends core.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
                data: null
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
            const files = await this.list(this.dirname(path));
            const item = files.find(item => item.path === path || "/" + item.path === path);
            return item;
        }

        async list(path)
        {
            const archive = await this.openArchive();

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

            return items;
        }

        async read(path)
        {
            const archive = await this.openArchive();

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
