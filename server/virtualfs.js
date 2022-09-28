shRequire(["shellfish/core", "shellfish/core/mime"], (core, mime) =>
{

    const d = new WeakMap();

    /**
     * Class for combining multiple filesystem implementations into one.
     * This allows, e.g., to handle archive files just like directories.
     * 
     * The virtual filesystem uses a base filesystem as its entry and a number
     * of child filesystems for handling selected MIME types.
     * 
     * Attach the property `vfsMimeTypes` to the child filesystems to assign
     * filesystems to MIME types.
     * 
     * Each child filesystem must support the `data` property for loading a
     * file.
     * 
     * @extends core.Filesystem
     * 
     * @property {core.Filesystem} filesystem - The base file system.
     */
    class VirtualFS extends core.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
                filesystem: null,
                dataCache: new Map(),
                cachedPaths: []
            });

            this.notifyable("filesystem");
        }

        get filesystem() { return d.get(this).filesystem; }
        set filesystem(f)
        {
            d.get(this).filesystem = f;
            this.filesystemChanged();
        }

        /**
         * Analyzes the given path to find the innermost virtual filesystem, if
         * any, and splits the path into the external and internal components.
         * 
         * @private
         * 
         * @param {string} path - The path to analyze.
         * @returns {object} - The info object. 
         */
        analyzePath(path)
        {
            const parts = path.split("/");
            //console.log("ANALYZE " + JSON.stringify(parts));
            let idx = -1;
            let mimeType = "";
            let fs = null;

            for (let i = parts.length - 2; i >= 0; --i)
            {
                mimeType = mime.mimeType(parts[i]);
                fs = this.filesystemFor(mimeType);
                if (fs)
                {
                    idx = i;
                    break;
                }
            }

            if (idx != -1)
            {
                const outerPath = parts.slice(0, idx + 1).join("/");
                const innerPath = parts.slice(idx + 1).join("/");

                return {
                    fs: fs,
                    path1: outerPath,
                    path2: innerPath[0] !== "/" ? "/" + innerPath : innerPath
                };
            }
            else
            {
                return {
                    fs: null,
                    path1: path,
                    path2: ""
                };
            }
        }

        /**
         * Returns the child filesystem to be used for the given MIME type, or
         * `null` if no child filesystems handles that type.
         * 
         * @private
         * 
         * @param {string} mimeType - The MIME type.
         * @returns {core.Filesystem} The filesystem handling the given MIME type.
         */
        filesystemFor(mimeType)
        {
            return this.children.find(c => c.vfsMimeTypes.includes(mimeType));
        }

        /**
         * Reads data from the given path by recursively resolving the stacked
         * filesystems.
         * 
         * @private
         * 
         * @param {string} dataPath - The path to read.
         * @returns {ArrayBuffer} - The data.
         */
        async readData(dataPath)
        {
            const priv = d.get(this);

            if (priv.dataCache.has(dataPath))
            {
                if (priv.dataCache.size > 3)
                {
                    // LRU cache
                    const toDelete = priv.cachedPaths.shift();
                    priv.dataCache.delete(toDelete);
                }

                console.log("From cache: " + dataPath);
                return priv.dataCache.get(dataPath);
            }

            const pathInfo = this.analyzePath(dataPath);
            let data = null;
            if (! pathInfo.fs)
            {
                const blob = await priv.filesystem.read(dataPath);
                data = await blob.arrayBuffer();
            }
            else
            {
                const data = await this.readData(pathInfo.path1);
                pathInfo.fs.data = data;
                const blob = await pathInfo.fs.read(pathInfo.path2);
                data = await blob.arrayBuffer();
            }
            priv.dataCache.set(dataPath, data);
            priv.cachedPaths.push(dataPath);
            return data;
        }

        async fileInfo(path)
        {
            //console.log("FILE INFO: " + path);

            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return [];
            }

            const pathInfo = this.analyzePath(path);
            //console.log(JSON.stringify(pathInfo));
            if (! pathInfo.fs)
            {
                const finfo = await priv.filesystem.fileInfo(path);
                if (this.filesystemFor(finfo.mimetype))
                {
                    console.log("IS A VFS: " + path);
                    finfo.type = "d";
                }
                return finfo;
            }
            else
            {
                //console.log("READ DATA FOR " + pathInfo.path1);
                const data = await this.readData(pathInfo.path1);
                //console.log("SIZE: " + data.length);
                pathInfo.fs.data = data;
                const finfo = await pathInfo.fs.fileInfo(pathInfo.path2);
                if (this.filesystemFor(finfo.mimetype))
                {
                    console.log("IS A VFS: " + path);
                    finfo.type = "d";
                }
                console.log(JSON.stringify(finfo));
                return finfo;
            }
        }

        async list(path)
        {
            //console.log("LIST " + path);

            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return [];
            }

            const mimeType = mime.mimeType(path);
            if (this.filesystemFor(mimeType))
            {
                path += "/";
            }

            const pathInfo = this.analyzePath(path);
            //console.log(JSON.stringify(pathInfo));
            if (! pathInfo.fs)
            {
                return await priv.filesystem.list(path);
            }
            else
            {
                const data = await this.readData(pathInfo.path1);
                pathInfo.fs.data = data;
                const items = await pathInfo.fs.list(pathInfo.path2);
                items.forEach(item =>
                {
                    item.path = this.pathJoin(pathInfo.path1, item.path);
                    item.dir = this.pathJoin(pathInfo.path1, item.dir);
                });
                return items;
            }
        }

        async mkdir(path, name)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.mkdir(path, name);
            }
            else
            {
                throw "Not supported";
                /*
                const data = await this.readData(pathInfo.path1);
                pathInfo.fs.data = data;
                const result = await pathInfo.fs.mkdir(pathInfo.path2, name);
                this.writeData(pathInfo.path1, pathInfo.fs.data);
                */
            }
        }

        async move(sourcePath, destPath)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(sourcePath);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.move(sourcePath, destPath);
            }
            else
            {
                throw "Not supported";
            }
        }

        async copy(sourcePath, destPath)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(sourcePath);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.copy(sourcePath, destPath);
            }
            else
            {
                throw "Not supported";
            }
        }

        async remove(path)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.remove(path);
            }
            else
            {
                throw "Not supported";
            }
        }

        async read(path)
        {
            console.log("READ " + path);

            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return [];
            }

            const mimeType = mime.mimeType(path);
            if (this.filesystemFor(mimeType))
            {
                path += "/";
            }

            const pathInfo = this.analyzePath(path);
            //console.log(JSON.stringify(pathInfo));
            if (! pathInfo.fs)
            {
                return await priv.filesystem.read(path);
            }
            else
            {
                const data = await this.readData(pathInfo.path1);
                pathInfo.fs.data = data;
                return await pathInfo.fs.read(pathInfo.path2);
            }
        }

        async write(path, stream)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.write(path, stream);
            }
            else
            {
                throw "Not supported";
            }
        }
    }
    exports.VirtualFS = VirtualFS;

});
