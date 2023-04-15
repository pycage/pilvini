shRequire(["shellfish/core", "shellfish/core/mime"], (core, mime) =>
{
    const VERSION = 1;

    const BLOCK_SIZE = 4096;

    const d = new WeakMap();

    function newBlock(self)
    {
        const priv = d.get(self);
        
        if (priv.freeBlocks.length > 0)
        {
            return priv.freeBlocks.pop();
        }
        else
        {
            const block = priv.maxFree;
            ++priv.maxFree;

            if (priv.data.byteLength < block * BLOCK_SIZE + BLOCK_SIZE)
            {
                const newSize = Math.min(priv.data.byteLength + BLOCK_SIZE * 100,
                                         priv.data.byteLength * 2);
                //console.log("resize data buffer to " + 2 * newSize + " for block " + block);
                const newBuffer = new ArrayBuffer(newSize);
                new BigUint64Array(newBuffer).set(new BigUint64Array(priv.data));
                priv.data = newBuffer;
            }

            return block;
        }
    }

    function freeBlock(self, block)
    {
        const priv = d.get(self);

        priv.freeBlocks.push(block);
    }

    function getBlock(self, block)
    {
        const priv = d.get(self);
        
        const view = new Uint8Array(priv.data, block * BLOCK_SIZE, BLOCK_SIZE);
        return view;
    }

    function readFile(self, block)
    {
        const firstBlock = getBlock(self, block);
        let block32 = new Uint32Array(firstBlock.buffer, firstBlock.byteOffset, firstBlock.byteLength / 4);
        const size = block32.at(0);
        let nextBlock = block32.at(-1);
        let remaining = size;

        const buffer = new ArrayBuffer(size);
        const buffer8 = new Uint8Array(buffer);

        let chunkSize = Math.min(remaining, BLOCK_SIZE - 8);
        buffer8.set(firstBlock.subarray(4, 4 + chunkSize), 0, chunkSize);
        remaining -= chunkSize;

        while (remaining > 0 && nextBlock > 0)
        {
            const block8 = getBlock(self, nextBlock);
            block32 = new Uint32Array(block8.buffer, block8.byteOffset, block8.byteLength / 4);
            nextBlock = block32.at(-1);
            
            chunkSize = Math.min(remaining, BLOCK_SIZE - 4);
            buffer8.set(block8.subarray(0, chunkSize), size - remaining, chunkSize);
            remaining -= chunkSize;
        }

        return buffer;
    }

    function writeFile(self, data)
    {
        const size = data.byteLength;
        let remaining = size;

        const firstBlockId = newBlock(self);
        let blockId = firstBlockId;
        const firstBlock = getBlock(self, blockId);
        let block32 = new Uint32Array(firstBlock.buffer, firstBlock.byteOffset, firstBlock.byteLength / 4);
        block32.set([size]);
        block32.set([0], block32.length - 1);

        const data8 = new Uint8Array(data);

        let chunkSize = Math.min(remaining, BLOCK_SIZE - 8);
        firstBlock.set(data8.subarray(0, chunkSize), 4);
        remaining -= chunkSize;
        
        while (remaining > 0)
        {
            const prevBlockId = blockId;
            blockId = newBlock(self);
            
            const prevBlock8 = getBlock(self, prevBlockId);
            block32 = new Uint32Array(prevBlock8.buffer, prevBlock8.byteOffset, prevBlock8.byteLength / 4);
            block32.set([blockId], block32.length - 1);

            const block8 = getBlock(self, blockId);
            block32 = new Uint32Array(block8.buffer, block8.byteOffset, block8.byteLength / 4);
            block32.set([0], block32.length - 1);

            chunkSize = Math.min(remaining, BLOCK_SIZE - 4);
            block8.set(data8.subarray(size - remaining, size - remaining + chunkSize));
            remaining -= chunkSize;
        }

        return firstBlockId;
    }

    function eraseFile(self, blockId)
    {
        const firstBlock = getBlock(self, blockId);
        let block32 = new Uint32Array(firstBlock.buffer, firstBlock.byteOffset, firstBlock.byteLength / 4);
        let nextBlockId = block32.at(-1);
        freeBlock(self, blockId);

        while (nextBlockId > 0)
        {
            blockId = nextBlockId;
            const block8 = getBlock(self, blockId);
            block32 = new Uint32Array(block8.buffer, block8.byteOffset, block8.byteLength / 4);
            nextBlockId = block32.at(-1);
            freeBlock(self, blockId);
        }
    }

    function getIndexNode(self, path)
    {
        const priv = d.get(self);
        
        const pathParts = path.split("/").filter(p => p !== "");
        let node = priv.index;

        pathParts.forEach(p =>
        {
            if (node === null || node.type !== "d")
            {
                node = null;
                return;
            }

            node = node.children[p] || null;
        });

        return node;
    }

    function load(self)
    {
        const priv = d.get(self);

        return new Promise(async (resolve, reject) =>
        {
            if (! priv.filesystem || priv.path === "")
            {
                priv.index = { name: "/", type: "d", children: { } };
                priv.data = new ArrayBuffer(BLOCK_SIZE),
                priv.freeBlocks = [];
                priv.maxFree = 0;
                resolve();
                return;
            }

            if (! await priv.filesystem.exists(priv.path))
            {
                priv.index = { name: "/", type: "d", children: { } };
                priv.data = new ArrayBuffer(BLOCK_SIZE),
                priv.freeBlocks = [];
                priv.maxFree = 0;
                resolve();
                return;
            }

            console.log("Opening File FS from " + priv.path);
            const blob = await priv.filesystem.read(priv.path);
            const buffer = await blob.arrayBuffer();

            const buffer32 = new Uint32Array(buffer, 0, 16);
            const version = buffer32.at(0);

            if (version > VERSION)
            {
                console.error("Cannot handle File FS version " + version);
                reject();
                return;
            }

            const dataSize = buffer32.at(1);
            const jsonSize = buffer32.at(2);
            
            const data8 = new Uint8Array(buffer, 16, dataSize);
            const json8 = new Uint8Array(buffer, 16 + dataSize, jsonSize);

            const dataBuffer = new ArrayBuffer(dataSize);
            new Uint8Array(dataBuffer).set(data8);

            const jsonBuffer = new ArrayBuffer(jsonSize);
            new Uint8Array(jsonBuffer).set(json8);
            const jsonBlob = new Blob([jsonBuffer]);
            const json = await jsonBlob.text();
            const obj = JSON.parse(json);
            
            priv.data = dataBuffer;
            priv.index = obj.index;
            priv.freeBlocks = obj.freeBlocks;
            priv.maxFree = buffer32.at(3);

            resolve();
        });
    }


    /**
     * Class representing a virtual filesystem within a single data file.
     * The virtual filesystem is held in RAM and synchronized to its data file.
     * 
     * @extends core.Filesystem
     * 
     * @property {core.Filesystem} filesystem - The filesystem to write to.
     * @property {string} path - The path of the data file.
     */
    class FileFS extends core.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
                filesystem: null,
                path: "",
                dirty: false,
                index: { name: "/", type: "d", children: { } },
                data: new ArrayBuffer(BLOCK_SIZE),
                freeBlocks: [],
                maxFree: 0
            });

            this.notifyable("filesystem");
            this.notifyable("path");
        }

        get filesystem() { return d.get(this).filesystem; }
        set filesystem(fs)
        {
            this.sync();
            d.get(this).filesystem = fs;
            load(this);
            this.filesystemChanged();
        }

        get path() { return d.get(this).path; }
        set path(p)
        {
            this.sync();
            d.get(this).path = p;
            load(this);
            this.pathChanged();
        }

        /**
         * Synchronizes the filesystem with its data file by writing unsaved
         * changes.
         * 
         * @returns {Promise} A promise object that resolves when finished.
         */
        sync()
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                if (! priv.filesystem || priv.path === "" || ! priv.dirty)
                {
                    resolve();
                    return;
                }

                // make a deep copy, so we may fire and forget
                const obj = { };
                d.set(obj, {
                    filesystem: priv.filesystem,
                    path: priv.path,
                    dirty: priv.dirty,
                    index: JSON.parse(JSON.stringify(priv.index)),
                    data: priv.data.slice(),
                    freeBlocks: priv.freeBlocks.slice(),
                    maxFree: priv.maxFree
                });
    
                priv.dirty = false;

                const ppriv = d.get(obj);

                const json = JSON.stringify({ index: ppriv.index, freeBlocks: ppriv.freeBlocks });
                const jsonBlob = new Blob([json]);
                const jsonBuffer = await jsonBlob.arrayBuffer();

                const outBuffer = new ArrayBuffer(4 + 4 + 4 + 4 +
                                                  ppriv.data.byteLength +
                                                  jsonBuffer.byteLength);
                const out32 = new Uint32Array(outBuffer, 0, 16);
                out32.set([
                    VERSION,
                    ppriv.data.byteLength,
                    jsonBuffer.byteLength,
                    ppriv.maxFree
                ], 0);

                const out8 = new Uint8Array(outBuffer, 16);
                out8.set(new Uint8Array(ppriv.data));
                out8.set(new Uint8Array(jsonBuffer), ppriv.data.byteLength);

                const blob = new Blob([outBuffer]);
                console.log("WRITE " + ppriv.path);
                await ppriv.filesystem.write(ppriv.path, blob);

                resolve();
            });
        }

        list(path)
        {
            return new Promise((resolve, reject) =>
            {
                path = this.normalizePath(path);
                let node = getIndexNode(this, path);

                if (node && node.type === "d")
                {
                    const items = Object.keys(node.children).map(key =>
                    {
                        const child = node.children[key];
                        return {
                            name: child.name,
                            path: this.pathJoin(path, child.name),
                            dir: path,
                            name: child.name,
                            type: child.type,
                            size: child.type === "d" ? 0 : child.size,
                            mimetype: child.type == "d" ? "application/x-folder" : mime.mimeType(child.name),
                            ctime: 0,
                            mtime: 0
                        };
                    });
                    resolve(items);
                }
                else if (node && node.type === "f")
                {
                    resolve([{
                        name: node.name,
                        path: url,
                        dir: this.dirname(path),
                        name: node.name,
                        type: node.type,
                        size: node.size,
                        mimetype: mime.mimeType(node.name),
                        ctime: 0,
                        mtime: 0
                    }]);
                }
                else
                {
                    resolve([]);
                }
            });
        }

        mkdir(path, name)
        {
            const priv = d.get(this);

            return new Promise((resolve, reject) =>
            {
                path = this.normalizePath(path);
                const node = getIndexNode(this, path);
                if (! node || node.type !== "d")
                {
                    reject();
                    return;
                }

                const newNode = { type: "d", name: name, children: { } };
                node.children[name] = newNode;
                priv.dirty = true;

                resolve();
                this.fsChange(path);
            });
        }

        move(sourcePath, destPath)
        {
            const priv = d.get(this);

            return new Promise((resolve, reject) =>
            {
                sourcePath = this.normalizePath(sourcePath);
                destPath = this.normalizePath(destPath);
                const parentSourcePath = this.dirname(sourcePath);
                const parentDestPath = this.dirname(destPath);
                const newName = this.filename(destPath);

                const node = getIndexNode(this, sourcePath);
                const parentSourceNode = getIndexNode(this, parentSourcePath);
                const parentDestNode = getIndexNode(this, parentDestPath);

                if (! node || ! parentSourceNode || ! parentDestNode ||
                    parentSourceNode.type !== "d" || parentDestNode.type !== "d")
                {
                    reject();
                    return;
                }

                delete parentSourceNode.children[node.name];
                node.name = newName;
                parentDestNode.children[node.name] = node;
                priv.dirty = true;

                resolve();
                this.fsChange(sourcePath);
                this.fsChange(destPath);
                this.fsChange(this.dirname(sourcePath));
                this.fsChange(this.dirname(destPath));
            });
        }

        copy(sourcePath, destPath)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                sourcePath = this.normalizePath(sourcePath);
                destPath = this.normalizePath(destPath);

                const blob = await this.read(sourcePath);
                await this.write(destPath, blob);
                priv.dirty = true;

                resolve();
                this.fsChange(destPath);
                this.fsChange(this.dirname(destPath));
            });
        }

        remove(path)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                path = this.normalizePath(path);
                const node = getIndexNode(this, path);

                if (! node)
                {
                    resolve();
                }

                const parentPath = this.dirname(path);
                const parentNode = getIndexNode(this, parentPath);

                if (! parentNode || parentNode.type !== "d")
                {
                    reject();
                }

                delete parentNode.children[node.name];
                if (node.type === "f")
                {
                    eraseFile(this, node.block);
                }
                priv.dirty = true;

                resolve();
                this.fsChange(path);
                this.fsChange(this.dirname(path));
            });
        }

        read(path)
        {
            return new Promise((resolve, reject) =>
            {
                path = this.normalizePath(path);
                const node = getIndexNode(this, path);

                if (! node || node.type !== "f")
                {
                    reject();
                }

                const buffer = readFile(this, node.block);
                const blob = new Blob([buffer]);
                resolve(blob);
            });
        }

        write(path, blob)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                path = this.normalizePath(path);
                const prevNode = getIndexNode(this, path);
                if (prevNode && prevNode.type === "f")
                {
                    eraseFile(this, prevNode.block);
                }

                const parentPath = this.dirname(path);
                const name = this.filename(path);
                const node = getIndexNode(this, parentPath);

                if (! node || node.type !== "d")
                {
                    reject();
                }

                const buffer = await blob.arrayBuffer();
                const block = writeFile(this, buffer);

                const fileNode = {
                    type: "f",
                    name: name,
                    size: buffer.byteLength,
                    block: block
                };
                node.children[name] = fileNode;
                priv.dirty = true;

                resolve();
                this.fsChange(path);
                this.fsChange(parentPath);
            });
        }
    }
    exports.FileFS = FileFS;
});