shRequire(["shellfish/core", __dirname + "/pdfdocument.js", __dirname + "/folderinfo.js"], (core, pdfdoc, folderinfo) =>
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
    
    async function makeVideoThumbnail(path, size, crop)
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
        const cw = crop ? Math.min(w, h) : w;
        const ch = crop ? cw : h;
        const cx = crop ? (w - cw) / 2 : 0;
        const cy = crop ? (h - ch) / 2 : 0;
        const ratio = crop ? 1.0 : (w / h);
    
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
            const targetWidth = size;
            const targetHeight = crop ? size : size / ratio;
            ctx.drawImage(player,
                          cx, cy, cw, ch,
                          0, (size - targetHeight) / 2,
                          targetWidth, targetHeight);
    
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
    
    async function makeImageThumbnail(path, size, crop)
    {
        const load = (img, path) =>
        {
            return new Promise((resolve, reject) =>
            {
                img.onload = () =>
                {
                    img.decode().then(() =>
                    {
                        resolve();
                    });
                };
                img.onerror = () =>
                {
                    reject("failed to load image");
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
        const cw = crop ? Math.min(w, h) : w;
        const ch = crop ? cw : h;
        const cx = crop ? (w - cw) / 2 : 0;
        const cy = crop ? (h - ch) / 2 : 0;
        const ratio = crop ? 1.0 : (w / h);
    
        ctx.fillStyle = "#aaa";
        ctx.fillRect(0, 0, size, size);
    
        let blob = null;
        let error = null;
        try
        {
            const targetWidth = size;
            const targetHeight = crop ? size : size / ratio;
            ctx.drawImage(image,
                          cx, cy, cw, ch,
                          0, (size - targetHeight) / 2,
                          targetWidth, targetHeight);
    
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

    async function makeYouTubeThumbnail(fs, path, size)
    {
        console.log("GET " + path);
        let jsonBlob = await fs.read(path);
        const json = await jsonBlob.text();
        console.log(json);
        const obj = JSON.parse(json);

        const opts = {
            headers: {
                "location": obj.thumbnail
            }
        };
        response = await window.fetch("/::proxy", opts);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const imageBlob = await makeImageThumbnail(blobUrl, size, false);
        URL.revokeObjectURL(blobUrl);
        return imageBlob;
    }

    async function makeArchiveThumbnail(fs, path, size)
    {
        console.log("make archive TN " + path);

        const findImage = async(path) =>
        {
            const files = await fs.list(path);
            for (let i = 0; i < files.length; ++i)
            {
                if (files[i].mimetype.startsWith("image/"))
                {
                    return files[i];
                }
                else if (files[i].type === "d")
                {
                    return await findImage(files[i].path);
                }
            }
            return null;
        };

        const imageFile = await findImage(path);
        console.log("image: " + imageFile);
        if (! imageFile)
        {
            return null;
        }

        return makeImageThumbnail(imageFile.path, size, true);
    }

    const d = new WeakMap();

    class ThumbnailGenerator extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                capacity: 512,
                enabled: true,
                filesystem: null,
                path: "/",
                size: 160
            });

            this.notifyable("capacity");
            this.notifyable("enabled");
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

        get enabled() { return d.get(this).enabled; }
        set enabled(e)
        {
            d.get(this).enabled = e;
            this.enabledChanged();
        }

        get filesystem() { return d.get(this).filesystem; }
        set filesystem(fs)
        {
            if (d.get(this).filesystem)
            {
                d.get(this).filesystem.referenceRemove(this);
            }
            d.get(this).filesystem = fs;
            if (fs)
            {
                fs.referenceAdd(this);
            }
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

        cached(fs, file)
        {
            return new Promise(async (resolve, reject) =>
            {
                const priv = d.get(this);

                const tnName = fs.encodeName(file.path.replace(/\//g, "_") + " " + priv.size + " " + file.mtime);
                if (await priv.filesystem.exists(tnName))
                {
                    const blob = await priv.filesystem.read(tnName);
                    resolve(blob);
                }
                else
                {
                    resolve(null);
                }
            });
        }

        generate(fs, file, condition)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                if (! d.get(this).enabled)
                {
                    resolve(null);
                    return;
                }

                const next = await this.waitQueued("thumbnails");
                if (! condition())
                {
                    next();
                    return;
                }
                //console.log("check file: " + file.path + " " + file.mimetype + " " + file.name);
                if (file.mimetype.startsWith("image/") ||
                    file.mimetype === "video/mp4" ||
                    file.mimetype === "audio/mp3" ||
                    file.mimetype === "application/pdf" ||
                    file.mimetype === "application/x-youtube-link" ||
                    file.mimetype === "application/zip" ||
                    file.type === "d")
                {
                    try
                    {
                        const tnName = fs.encodeName(file.path.replace(/\//g, "_") + " " + priv.size + " " + file.mtime);

                        if (file.mimetype.startsWith("image/"))
                        {
                            const blob = await makeImageThumbnail(file.path, priv.size, true);
                            await priv.filesystem.write(tnName, blob);
                            resolve(blob);
                        }
                        else if (file.mimetype === "video/mp4")
                        {
                            const blob = await makeVideoThumbnail(file.path, priv.size, true);
                            await priv.filesystem.write(tnName, blob);
                            resolve(blob);
                        }
                        else if (file.mimetype === "audio/mp3")
                        {
                            const blob = await makeImageThumbnail(file.path + "?view=cover", priv.size, true);
                            await priv.filesystem.write(tnName, blob);
                            resolve(blob);
                        }
                        else if (file.mimetype === "application/pdf")
                        {
                            const blob = await makePdfThumbnail(file.path, priv.size);
                            await priv.filesystem.write(tnName, blob);
                            resolve(blob);
                        }
                        else if (file.mimetype === "application/x-youtube-link")
                        {
                            const blob = await makeYouTubeThumbnail(fs, file.path, 320);
                            await priv.filesystem.write(tnName, blob);
                            resolve(blob);
                        }
                        else if (file.mimetype === "application/zip" && file.size < 1024 * 1024 * 50)
                        {
                            const blob = await makeArchiveThumbnail(fs, file.path, priv.size);
                            await priv.filesystem.write(tnName, blob);
                            resolve(blob);                            
                        }
                        else if (file.type === "d" && await fs.exists(file.path + "/" + folderinfo.infoFile))
                        {
                            const info = await folderinfo.load(fs, file.path);
                            if (info.icon)
                            {
                                const url = URL.createObjectURL(info.icon);
                                const blob = await makeImageThumbnail(url, priv.size, true);
                                this.wait(500).then(() => { URL.revokeObjectURL(url); });
                                await priv.filesystem.write(tnName, blob);
                                resolve(blob);
                            }
                            else
                            {
                                resolve(null);
                            }
                        }
                    }
                    catch (err)
                    {
                        console.error(err);
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