async function write(fs, path, mediaPosition, name)
{
    const filename = fs.filename(path);
    const obj = { path: filename, mediaPosition: mediaPosition, name: name };
    const data = JSON.stringify(obj);
    const dirname = fs.dirname(path);

    await fs.write(dirname + "/.pilvini-media.bookmark", fs.makeFileData(data));
};
exports.write = write;

async function read(fs, dirPath)
{
    const bookmarkFile = dirPath + "/.pilvini-media.bookmark";

    if (await fs.exists(bookmarkFile))
    {
        const fileData = await fs.read(bookmarkFile);
        const data = await fileData.text();
        if (data !== "")
        {
            const obj = JSON.parse(data);
            obj.path = fs.pathJoin(dirPath, obj.path);
            return obj;
        }
    }
    return null;
}
exports.read = read;

async function remove(fs, dirPath)
{
    const bookmarkFile = dirPath + "/.pilvini-media.bookmark";

    if (await fs.exists(bookmarkFile))
    {
        await fs.remove(bookmarkFile);
    }
}
exports.remove = remove;