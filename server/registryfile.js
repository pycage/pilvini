const [ core ] = await shRequire(["shellfish/core"]);

/**
 * Returns the directory part of the given path.
 * 
 * @param {string} path - The path.
 * @returns {string} The directory part of the path.
 */
function dirname(path)
{
    const pos = path.lastIndexOf("/");
    if (pos !== -1)
    {
        return path.substring(0, pos) || "/"
    }
    else
    {
        return "/";
    }
}

/**
 * Returns the file part of the given path.
 * 
 * @param {string} path - The path.
 * @returns {string} The file part of the path.
 */
function filename(path)
{
    const pos = path.lastIndexOf("/");
    if (pos !== -1)
    {
        return path.substring(pos + 1);
    }
    else
    {
        return path;
    }
}

const d = new WeakMap();

/**
 * Class representing a registry database file.
 * 
 * @extends core.Object
 * @memberof core
 * 
 * @property {core.Filesystem} filesystem - (default: `null`) The filesystem to write to.
 * @property {string} path - (default: `""`) The path of the registry file.
 */
class RegistryFile extends core.Object
{
    constructor()
    {
        super();
        d.set(this, {
            fs: null,
            path: "",
            ready: false,
            modified: false,
            registry: {
                "version": 1,
                "/": { "type": "folder", "items": [] }
            }
        });

        this.notifyable("filesystem");
        this.notifyable("modified");
        this.notifyable("path");
        this.notifyable("ready");

        this.registerEvent("changeValue");

        this.onModifiedChanged = () =>
        {
            if (d.get(this).modified)
            {
                this.defer(() => { this.writeRegistry(); }, "writeRegistry");
            }
        };

        this.onDestruction = () =>
        {
            if (d.get(this).modified)
            {
                this.writeRegistry();
            }
        };
    }

    get filesystem() { return d.get(this).filesystem; }
    set filesystem(fs)
    {
        d.get(this).fs = fs;
        this.filesystemChanged();
        this.defer(() => { this.readRegistry(); }, "readRegistry");
    }

    get path() { return d.get(this).path; }
    set path(p)
    {
        d.get(this).path = p;
        this.pathChanged();
        this.defer(() => { this.readRegistry(); }, "readRegistry");
    }

    get ready() { return d.get(this).ready; }

    get modified() { return d.get(this).modified; }

    readRegistry()
    {
        const priv = d.get(this);
        if (priv.fs !== null && priv.path !== "")
        {
            priv.fs.read(priv.path)
            .then(async fileData =>
            {
                const data = await fileData.text();
                console.log("READ " + fileData.sourceType + " " + priv.path);
                console.log(data);
                const reg = JSON.parse(data);
                if (reg.version === 1)
                {
                    priv.registry = reg;
                }
                priv.ready = true;
                this.readyChanged();
            })
            .catch(err =>
            {
                priv.ready = true;
                this.readyChanged();
            });
        }
    }

    writeRegistry()
    {
        const priv = d.get(this);

        if (! priv.ready)
        {
            return;
        }

        if (priv.fs !== null && priv.path !== "")
        {
            let blob = null;
            console.log("Saving Registry File: " + priv.path);
            console.log(JSON.stringify(priv.registry));
            if (shRequire.environment === "web")
            {
                blob = new Blob([JSON.stringify(priv.registry, null, 2)], { type: "application/json" });
            }
            else
            {
                blob = JSON.stringify(priv.registry, null, 2);
            }

            priv.fs.write(priv.path, new core.FileData(blob))
            .then(() =>
            {
                priv.modified = false;
                this.modifiedChanged();
            })
            .catch(err =>
            {
                console.error(this.objectType + "@" + this.objectLocation +
                                ": Failed to save file '" + priv.path + "'");
            });
        }
    }

    /**
     * Reads the given key. Returns the `defaultValue` if the key was not found.
     * 
     * @param {string} key - The key to read.
     * @param {any} defaultValue - The default value to return if the key was not found.
     * @returns {any} The key's value.
     */
    read(key, defaultValue)
    {
        const reg = d.get(this).registry;
        
        const obj = reg[key];
        if (obj)
        {
            if (obj.type === "folder")
            {
                return obj.items;
            }
            else
            {
                return obj.value;
            }
        }
        else
        {
            return defaultValue;
        }
    }

    /**
     * Writes the given key.
     * 
     * @param {string} key - The key.
     * @param {any} value - The value to write.
     */
    write(key, value)
    {
        const priv = d.get(this);
        const reg = priv.registry;

        if (! reg[key])
        {
            this.create(key, value);
        }
        else
        {
            const obj = reg[key];
            if (obj && obj.type !== "folder")
            {
                obj.value = value;
                this.changeValue(key);
            }
        }

        if (! priv.modified)
        {
            priv.modified = true;
            this.modifiedChanged();
        }
    }

    /**
     * Removes the given key.
     * 
     * @param {string} key - The key to remove.
     */
    remove(key)
    {
        const priv = d.get(this);
        const reg = priv.registry;

        if (reg[key])
        {
            const obj = reg[key];
            if (obj.type === "folder")
            {
                obj.items.forEach(childKey =>
                {
                    this.remove(key + "/" + childKey);
                });
            }

            delete reg[key];

            const parentKey = dirname(key);
            const name = filename(key);
            reg[parentKey].items = reg[parentKey].items.filter(n => n !== name);

            this.changeValue(key);

            if (! priv.modified)
            {
                priv.modified = true;
                this.modifiedChanged();
            }
        }
    }

    create(key, value)
    {
        const priv = d.get(this);
        const reg = priv.registry;

        const folderKey = dirname(key);
        const name = filename(key);

        if (! reg[folderKey])
        {
            this.mkdir(folderKey);
        }
        
        const obj = reg[folderKey];
        if (obj.type === "folder")
        {
            obj.items.push(name);

            const newObj = {
                "type": typeof value,
                "description": "",
                "value": value
            };
            if (folderKey !== "/")
            {
                reg[folderKey + "/" + name] = newObj;
            }
            else
            {
                reg["/" + name] = newObj;
            }

            if (! priv.modified)
            {
                priv.modified = true;
                this.modifiedChanged();
            }
        }
    }

    mkdir(key)
    {
        const priv = d.get(this);
        const reg = priv.registry;

        const folderKey = dirname(key);
        const name = filename(key);

        if (! reg[folderKey])
        {
            this.mkdir(folderKey);
        }

        const obj = reg[folderKey];
        if (obj.type === "folder")
        {
            obj.items.push(name);

            const newObj = {
                "type": "folder",
                "items": []
            };
            if (folderKey !== "/")
            {
                reg[folderKey + "/" + name] = newObj;
            }
            else
            {
                reg["/" + name] = newObj;
            }

            if (! priv.modified)
            {
                priv.modified = true;
                this.modifiedChanged();
            }
        }
    }

    /**
     * Lists the contents of the given folder key.
     * 
     * @param {string} folderKey - The key to list the contents of.
     * @returns {string[]} The names of the folders.
     */
    list(folderKey)
    {
        const reg = d.get(this).registry;

        const obj = reg[folderKey];
        if (obj && obj.type === "folder")
        {
            return obj.items.slice();
        }
        else
        {
            return [];
        }
    }

}
exports.RegistryFile = RegistryFile;
