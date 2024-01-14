const [ core ] = await shRequire(["shellfish/core"]);

const d = new WeakMap();

class BookmarkService extends core.Object
{
    constructor()
    {
        super();
        d.set(this, {
            filesystem: null,
            path: "",
            bookmarks: [],
            synced: false
        });

        this.notifyable("filesystem");
        this.notifyable("path");
    }

    get filesystem() { return d.get(this).filesystem; }
    set filesystem(fs)
    {
        const priv = d.get(this);

        if (priv.filesystem)
        {
            priv.filesystem.referenceRemove(this);
        }

        priv.filesystem = fs;
        fs.referenceAdd(this);
        d.get(this).synced = false;
        this.filesystemChanged();
    }

    get path() { return d.get(this).path; }
    set path(p)
    {
        d.get(this).path = p;
        d.get(this).synced = false;
        this.pathChanged();
    }

    async read()
    {
        const priv = d.get(this);

        if (! priv.filesystem || priv.path === "")
        {
            return;
        }

        if (await priv.filesystem.exists(priv.path))
        {
            const data = await priv.filesystem.read(priv.path);
            const json = await data.text();
            console.log("READ");
            console.log(json);
            priv.bookmarks = json.length > 0 ? JSON.parse(json) : [];
        }
        else
        {
            priv.bookmarks = [];
        }
        priv.synced = true;
    }

    async write()
    {
        const priv = d.get(this);

        if (! priv.filesystem || priv.path === "")
        {
            return;
        }

        await priv.filesystem.write(priv.path, new core.FileData(JSON.stringify(priv.bookmarks)));
    }

    async bookmarks()
    {
        const priv = d.get(this);

        if (! priv.filesystem || priv.path === "")
        {
            return [];
        }

        if (! priv.synced)
        {
            await this.read();
        }

        return priv.bookmarks.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    }

    async addBookmark(name, path)
    {
        const priv = d.get(this);

        if (! priv.filesystem || priv.path === "")
        {
            return;
        }

        if (! priv.synced)
        {
            await this.read();
        }

        priv.bookmarks.push({ name, path });
        await this.write();
    }

    async removeBookmark(path)
    {
        const priv = d.get(this);

        if (! priv.filesystem || priv.path === "")
        {
            return;
        }

        if (! priv.synced)
        {
            await this.read();
        }

        priv.bookmarks = priv.bookmarks.filter(item => item.path !== path);
        await this.write();
    }
}
exports.BookmarkService = BookmarkService;
