shRequire(["shellfish/core", __dirname + "/pdfdocument.js"], (core, pdfdoc) =>
{
    function waitForPlayer(player)
    {
        return new Promise((resolve, reject) =>
        {
            player.oncanplay = () =>
            {
                player.oncanplay = null;
                player.onerror = null;
                resolve();
            };
    
            player.onerror = err =>
            {
                player.oncanplay = null;
                player.onerror = null;
                reject(err);
            };
        });
    };
    
    function seek(player, position)
    {
        return new Promise((resolve, reject) =>
        {
            player.currentTime = position;
            player.onseeked = () =>
            {
                player.onseeked = null;
                player.onerror = null;
                resolve();
            };
            player.onerror = err =>
            {
                player.onseeked = null;
                player.onerror = null;
                reject(err);
            };
        });
    }
    
    async function makeVideoThumbnail(path, size)
    {
        const player = document.createElement("video");
        player.autoplay = true;
        player.muted = true;
        player.src = path;
        player.load();
    
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
    
        const ctx = canvas.getContext("2d");
    
        await waitForPlayer(player);
        await seek(player, player.duration * 0.2);
    
        const w = player.videoWidth;
        const h = player.videoHeight;
    
        // crop viewport
        const cw = Math.min(w, h);
        const ch = cw;
        const cx = (w - cw) / 2;
        const cy = (h - ch) / 2;
    
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, size, size);
    
        // capturing the image can go wrong and we don't want to receive a
        // broken thumbnail in these cases
        //  - Mobile Firefox does not allow capturing at all
        //  - Silk on Fire TV treats mp4 as copy-protected and captures all black
        //    (webm is fine, though)
        let blob = null;
        let error = null;
        try
        {
            ctx.drawImage(player, cx, cy, cw, ch, 0, 0, size, size);
    
            // prettify
    
            ctx.fillStyle = "#666";
            ctx.fillRect(0, 0, 10, size);
            ctx.fillRect(size - 10, 0, 16, size);
    
            ctx.fillStyle = "#fff";
            for (let y = 0; y < size; y += 10)
            {
                ctx.fillRect(2, y + 3, 6, 4);
                ctx.fillRect(size - 8, y + 3, 6, 4);
            }
    
            // get JPEG data
            const dataUrl = canvas.toDataURL("image/jpeg");
            const response = await fetch(dataUrl);
            blob = response.blob();
        }
        catch (err)
        {
            error = err;
        }
    
        player.src = "";
        player.load();
        player.remove();
        canvas.remove();
    
        if (error)
        {
            throw(error);
        }
        return blob;
    }
    
    async function makeImageThumbnail(path, size)
    {
        const load = (img, path) =>
        {
            return new Promise((resolve, reject) =>
            {
                img.onload = () =>
                {
                    resolve();
                };
                img.onerror = () =>
                {
                    reject();
                };
                img.src = path;
            });
        }
    
        const image = new Image();
        await load(image, path);
    
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
    
        const ctx = canvas.getContext("2d");
    
        const w = image.naturalWidth;
        const h = image.naturalHeight;
    
        // crop viewport
        const cw = Math.min(w, h);
        const ch = cw;
        const cx = (w - cw) / 2;
        const cy = (h - ch) / 2;
    
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, size, size);
    
        let blob = null;
        let error = null;
        try
        {
            ctx.drawImage(image, cx, cy, cw, ch, 0, 0, size, size);
    
            // get JPEG data
            const dataUrl = canvas.toDataURL("image/jpeg");
            const response = await fetch(dataUrl);
            blob = response.blob();
        }
        catch (err)
        {
            error = err;
        }
    
        image.remove();
        canvas.remove();
    
        if (error)
        {
            throw(error);
        }
        return blob;
    }

    async function makePdfThumbnail(path, size)
    {
        const load = (doc, path) =>
        {
            return new Promise((resolve, reject) =>
            {
                doc.onStatusChanged = () =>
                {
                    if (doc.status === "success")
                    {
                        resolve();
                    }
                    else if (doc.status === "error")
                    {
                        reject();
                    }
                };
                doc.source = path;
            });
        };

        const doc = new pdfdoc.PDFDocument();
        await load(doc, path);
        
        const page = await doc.getPage(0);

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
    
        const ctx = canvas.getContext("2d");
    
        let viewport = page.getViewport({ scale: 1.0 });
        const w = viewport.width;
        const h = viewport.height;

        // crop viewport
        const cw = Math.min(w, h);
        const ch = cw;
        const cx = (w - cw) / 2;
        const cy = (h - ch) / 2;
    
        const fitScale = size / cw;
        viewport = page.getViewport({ scale: fitScale });

        let blob = null;
        let error = null;
        try
        {
            await page.render({ canvasContext: ctx, viewport }).promise;
    
            // get JPEG data
            const dataUrl = canvas.toDataURL("image/jpeg");
            const response = await fetch(dataUrl);
            blob = response.blob();
        }
        catch (err)
        {
            error = err;
        }

        doc.destroy();
        canvas.remove();
    
        if (error)
        {
            throw(error);
        }
        return blob;
    }

    const d = new WeakMap();

    class ThumbnailGenerator extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                capacity: 512,
                filesystem: null,
                path: "/",
                size: 160
            });

            this.notifyable("capacity");
            this.notifyable("filesystem");
            this.notifyable("path");
            this.notifyable("size");
        }

        get capacity() { return d.get(this).capacity; }
        set capacity(c)
        {
            d.get(this).capacity = c;
            this.capacityChanged();
            this.cleanup();
        }

        get filesystem() { return d.get(this).filesystem; }
        set filesystem(fs)
        {
            d.get(this).filesystem = fs;
            this.filesystemChanged();
            this.cleanup();
        }

        get path() { return d.get(this).path; }
        set path(p)
        {
            d.get(this).path = p;
            this.pathChanged();
            this.cleanup();
        }

        get size() { return d.get(this).size; }
        set size(s)
        {
            d.get(this).size = s;
            this.sizeChanged();
        }

        cancel()
        {
            this.clearQueue("thumbnails");
        }

        cleanup()
        {
            const priv = d.get(this);
            if (! priv.filesystem)
            {
                return;
            }

            priv.filesystem.list(priv.path)
            .then(files =>
            {
                if (files.length > priv.capacity && priv.filesystem)
                {
                    files.sort((a, b) => b.mtime - a.mtime);
                    while (files.length > priv.capacity)
                    {
                        console.log("clear thumbnail: " + files[files.length - 1].path);
                        priv.filesystem.remove(files.pop().path);
                    }
                }
            })
            .catch(err => { });
        }

        generate(fs, file, condition)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                const tnPath = fs.encodeName(file.path + " " + priv.size + " " + file.mtime);
                if (await priv.filesystem.exists(tnPath))
                {
                    const blob = await priv.filesystem.read(tnPath);
                    resolve(blob);
                    return;
                }

                const next = await this.waitQueued("thumbnails");
                if (! condition())
                {
                    next();
                    return;
                }
                if (file.mimetype.startsWith("image/") ||
                    file.mimetype === "video/mp4" ||
                    file.mimetype === "application/pdf" ||
                    file.type === "d")
                {
                    try
                    {
                        if (file.mimetype.startsWith("image/"))
                        {
                            const blob = await makeImageThumbnail(file.path, priv.size);
                            await priv.filesystem.write(tnPath, blob);
                            resolve(blob);
                        }
                        else if (file.mimetype === "video/mp4")
                        {
                            const blob = await makeVideoThumbnail(file.path, priv.size);
                            await priv.filesystem.write(tnPath, blob);
                            resolve(blob);
                        }
                        else if (file.mimetype === "application/pdf")
                        {
                            const blob = await makePdfThumbnail(file.path, priv.size);
                            await priv.filesystem.write(tnPath, blob);
                            resolve(blob);
                        }
                        else if (file.type === "d" && await fs.exists(file.path + "/cover.jpg"))
                        {
                            const blob = await makeImageThumbnail(file.path + "/cover.jpg", priv.size);
                            await priv.filesystem.write(tnPath, blob);
                            resolve(blob);
                        }
                    }
                    catch (err)
                    {
                        reject(err);
                    }
                }
                else
                {
                    resolve(null);
                }
                next();
                this.cleanup();
            });
        }
    }
    exports.ThumbnailGenerator = ThumbnailGenerator;

});