shRequire(["shellfish/server", __dirname + "/id3tags.js"], (server, tags) =>
{
    const d = new WeakMap();

    function readTags(fileObj)
    {
        return new Promise((resolve, reject) =>
        {
            tags.readTags(fileObj)
            .then(resolve)
            .catch(reject);
        });
    }

    class ViewsDAVSession extends server.DAVSession
    {
        constructor()
        {
            super();
        }

        async readFile(path, finfo, ev)
        {
            if (ev.url.parameters.view === "cover")
            {
                const fileObj = await this.filesystem.read(path);
                const idTags = await readTags(fileObj);
                console.log(Object.keys(idTags));
                if (idTags["PICTURE"])
                {
                    console.log("HAVE COVER ART " + path);
                    const apic = idTags["PICTURE"];
                    if (apic.data)
                    {
                        finfo.size = apic.data.length;
                        finfo.mimetype = apic.mimetype;
                        return new server.File(finfo, apic.data);
                        //return this.filesystem.read(path);
                    }
                }
            }
            console.log("VIEW " + path + " " + finfo.mimetype + " " + JSON.stringify(ev.url.parameters));
            return this.filesystem.read(path);
        }
    }
    exports.ViewsDAVSession = ViewsDAVSession;

});