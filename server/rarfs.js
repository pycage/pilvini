shRequire(["shellfish/core", "shellfish/core/mime"], (core, mime) =>
{
    const modStream = require("stream");
    const unrar = require("./server/node-unrar-js/index.js");


    const d = new WeakMap();

    class RarFS extends core.Filesystem
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
            const archive = await unrar.createExtractorFromData({ data: await vfsData.arrayBuffer() });
            
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

        async vfsRead(vfsData, path)
        {
            const archive = await unrar.createExtractorFromData({ data: await vfsData.arrayBuffer() });

            const extracted = archive.extract({ files: [path.substr(1)] });
            const files = [...extracted.files];
            
            if (files.length > 0)
            {
                return new core.FileData(files[0].extraction.buffer);
            }
            else
            {
                return null;
            }
        }
    }
    exports.RarFS = RarFS;

});
