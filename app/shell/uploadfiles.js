function forEachFile(dirItem, f)
{
    return new Promise((resolve, reject) =>
    {
        try
        {
            const reader = dirItem.createReader();
    
            reader.readEntries(async entries =>
            {
                for (let i = 0; i < entries.length; ++i)
                {
                    const entry = entries[i];
                    await f(entry);
                }
                resolve();
            });
        }
        catch (err)
        {
            reject(err);
        }
    });
}

function openFile(fileItem)
{
    return new Promise((resolve, reject) =>
    {
        return fileItem.file(resolve, reject);
    });
}

async function uploadRecursive(file, fs, targetPath, progressCallback)
{
    // file is a webkitFileEntry

    const path = fs.pathJoin(targetPath, fs.encodeName(file.name));

    if (file.isDirectory)
    {
        await fs.mkdir(targetPath, file.name);
        //console.log("mkdir " + targetPath + "/" + file.name);

        await forEachFile(file, async entry =>
        {
            await uploadRecursive(entry, fs, path, (name, p) => { progressCallback(name, p); });
        });
    }
    else
    {
        //console.log("uploading " + file.name + " -> " + path);
        await fs.write(path, await openFile(file), p => { progressCallback(file.name, p); });
        //console.log("ok");
    }
}
exports.uploadRecursive = uploadRecursive;
