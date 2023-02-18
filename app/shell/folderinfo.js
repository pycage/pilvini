const infoFile = ".pilvini-folder.info";
exports.infoFile = infoFile;

class FolderInfo
{
    constructor(fs, data)
    {
        console.log(data);
        this.obj = JSON.parse(data);
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

    get cover()
    {
        if (this.obj.cover)
        {
            return new Blob([atob(this.obj.cover)]);
        }
        else
        {
            return null;
        }
    }
}

async function load(fs, dirPath)
{
    try
    {
        const blob = await fs.read(dirPath + "/" + infoFile);
        const data = await blob.text();
        return new FolderInfo(fs, data);
    }
    catch (err)
    {
        return new FolderInfo(fs, "");
    }

}
exports.load = load;