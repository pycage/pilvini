shRequire(["shellfish/core", "shellfish/core/mime", __dirname + "/jszip.min.js"], (core, mime, jszip) =>
{
    const d = new WeakMap();

    class ZipFS extends core.Filesystem
    {
        constructor()
        {
            super();

            d.set(this, {
                cachedItem: null,
                cachedPath: ""
            });
        }

        async openZip(vfsData)
        {
            if (d.get(this).cachedPath === vfsData.path)
            {
                // nothing to do
            }
            else
            {
                const zip = await jszip.loadAsync(await vfsData.arrayBuffer());
                d.get(this).cachedPath = vfsData.path;
                d.get(this).cachedItem = zip;
            }
            return d.get(this).cachedItem;
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
            const zip = await this.openZip(vfsData);

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

        async vfsRead(vfsData, path)
        {
            const zip = await this.openZip(vfsData);

            if (zip.files[path])
            {
                const zf = zip.file(path);
                return new core.FileData(zf.nodeStream());
            }
            else
            {
               const zf = zip.file(path.substr(1));
               return new core.FileData(zf.nodeStream());
            }
        }
    }
    exports.ZipFS = ZipFS;

});
