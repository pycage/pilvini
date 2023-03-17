const infoFile = ".pilvini-folder.info";
exports.infoFile = infoFile;

async function blobToBase64(blob)
{
    const data = await blob.arrayBuffer();
    const view = new Uint8Array(data);
    const out = [];
    for (let i = 0; i < view.byteLength; ++i)
    {
        out.push(String.fromCharCode(view[i]));
    }
    return btoa(out.join(""));
}

function base64ToBlob(data)
{
    const arr = Uint8Array.from(atob(data).split("").map(c => c.charCodeAt(0)));
    return new Blob([arr]);
}

class FolderInfo
{
    constructor(data)
    {
        this.obj = JSON.parse(data);
        console.log(this.obj);
        this.ready = true;
    }

    get background()
    {
        if (this.obj.background)
        {
            return base64ToBlob(this.obj.background);
        }
        else
        {
            return null;
        }
    }

    set background(blob)
    {
        this.ready = false;
        blobToBase64(blob)
        .then(data =>
        {
            this.obj.background = data;
        })
        .catch(err => { console.error(err); })
        .finally(() =>
        {
            this.ready = true;
        });
    }

    get icon()
    {
        if (this.obj.icon)
        {
            return base64ToBlob(this.obj.icon);
        }
        else
        {
            return null;
        }
    }

    set icon(blob)
    {
        this.ready = false;
        blobToBase64(blob)
        .then(data =>
        {
            this.obj.icon = data;
        })
        .catch(err => { console.error(err); })
        .finally(() =>
        {
            this.ready = true;
        });
    }

    get description()
    {
        if (this.obj.description)
        {
            return this.obj.description;
        }
        else
        {
            return null;
        }
    }

    set description(text)
    {
        this.obj.description = text;
    }

    get extensions()
    {
        if (this.obj.extensions)
        {
            return this.obj.extensions.slice();
        }
        else
        {
            return [];
        }
    }

    sync()
    {
        return new Promise((resolve, reject) =>
        {
            const f = () =>
            {
                if (this.ready)
                {
                    resolve();
                }
                else
                {
                    setTimeout(f, 10);
                }
            }
            f();
        });
    }

    blob()
    {
        return new Blob([JSON.stringify(this.obj)]);
    }
}

async function load(fs, dirPath)
{
    try
    {
        const infoPath = dirPath + "/" + infoFile;
        if (await fs.exists(dirPath))
        {
            const blob = await fs.read(infoPath);
            const data = await blob.text();
            return new FolderInfo(data);
        }
        else
        {
            return new FolderInfo("{ }");
        }
    }
    catch (err)
    {
        console.error(err);
        return new FolderInfo("{ }");
    }
}
exports.load = load;

async function save(fs, dirPath, infoObj)
{
    try
    {
        await infoObj.sync();
        const infoPath = dirPath + "/" + infoFile;
        await fs.write(infoPath, infoObj.blob());
    }
    catch (err)
    {

    }
}
exports.save = save;
