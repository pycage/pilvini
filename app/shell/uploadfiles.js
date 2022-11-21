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
        fileItem.file(resolve, reject);
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
            await uploadRecursive(entry, fs, path, progressCallback);
        });
    }
    else
    {
        //console.log("uploading " + file.name + " -> " + path);
        progressCallback(file.name, 0.0);
        await fs.write(path, await openFile(file));
        progressCallback(file.name, 1.0);
        //console.log("ok");
    }
}
exports.uploadRecursive = uploadRecursive;
