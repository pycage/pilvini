shRequire(["shellfish/core", "shellfish/core/mime", __dirname + "/jszip.min.js"], (core, mime, jszip) =>
{
    class File
    {
        constructor(fileInZip)
        {
            this.fileInZip = fileInZip;
        }

        async arrayBuffer()
        {
            return await this.fileInZip.async("nodebuffer");
        }

        stream(from, to)
        {
            if (to !== undefined)
            {
                return this.fileInZip.nodeStream();
            }
            else
            {
                return this.fileInZip.nodeStream();
            }
        }

        text()
        {
            return this.arrayBuffer();
        }
    }


    const d = new WeakMap();

    class ZipFS extends core.Filesystem
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
                        const archive = await jszip.loadAsync(d.get(this).data);
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
            const zip = await this.openArchive();
            //console.log(zip.files);

            const seen = new Set();
            const implicitDirectories = Object.values(zip.files)
            .map(fileObj => fileObj.name[0] !== "/" ? "/" + fileObj.name : fileObj.name)
            .filter(p => this.dirname(this.dirname(p)) === path)
            .map(p => this.dirname(p))
            .filter(p => p !== "/");

            const items = Object.values(zip.files)
            .filter(fileObj => ! fileObj.dir)
            .filter(fileObj => this.dirname("/" + fileObj.name) === path)
            .map(fileObj =>
            {
                seen.add(fileObj.name);
                return {
                    path: fileObj.name,
                    dir: this.dirname("/" + fileObj.name),
                    name: this.filename(fileObj.name),
                    type: fileObj.dir ? "d" : "f",
                    size: fileObj?._data?.uncompressedSize || -1,
                    mimetype: fileObj.dir ? "application/x-folder" : mime.mimeType(fileObj.name),
                    ctime: new Date(fileObj.date),
                    mtime: new Date(fileObj.date)
                };
            });

            implicitDirectories.forEach(p =>
            {
                if (! seen.has(p))
                {
                    items.push({
                        path: p,
                        dir: this.dirname(p),
                        name: this.filename(p),
                        type: "d",
                        size: 0,
                        mimetype: "application/x-folder",
                        ctime: new Date(),
                        mtime: new Date()
                    });
                    seen.add(p);
                }
            });

            return items;
        }

        async read(path)
        {
            const zip = await this.openArchive();

            if (zip.files[path])
            {
                return new File(zip.file(path));
            }
            else
            {
                // strip the leading "/"
                return new File(zip.file(path.substr(1)));
            }

        }
    }
    exports.ZipFS = ZipFS;

});
