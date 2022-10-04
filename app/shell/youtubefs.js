shRequire(["shellfish/core"], (core) =>
{
    function findNodes(node, name)
    {
        let result = [];

        if (typeof node.indexOf === "function" /* array */)
        {
            for (let i = 0; i < node.length; ++i)
            {
                if (typeof node[i] === "object")
                {
                    result = result.concat(findNodes(node[i], name));
                }
            }
        }
        else
        {
            if (node[name] !== undefined)
            {
                result.push(node[name]);
            }

            for (let key in node)
            {
                if (typeof node[key] === "object")
                {
                    result = result.concat(findNodes(node[key], name));
                }
            }
        }

        return result;
    }


    const d = new WeakMap();

    /**
     * Class representing a model of YouTube search results.
     */
    class YouTubeFS extends core.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
                cache: new Map()
            });
        }

        async list(path)
        {
            return [];
        }

        async search(query)
        {
            try
            {
                const opts = {
                    headers: {
                        "location": "https://www.youtube.com/results?q=" + encodeURI(query) + "&hl=en"
                    }
                };
                const response = await fetch("/::proxy", opts);
                const html = await response.text();
                //console.log(html);
    
                // find the JSON document buried in the HTML
                const findBegin = html.indexOf("var ytInitialData");
                const jsonBegin = html.indexOf("{", findBegin);
                const jsonEnd = html.indexOf("</script>", findBegin) - 1;
                const json = html.substring(jsonBegin, jsonEnd);
                console.log(JSON.stringify(JSON.parse(json), null, 4));
                const ytData = JSON.parse(json);
        
                // find the video entries
                const itemSectionRenderers = findNodes(ytData, "itemSectionRenderer");
                const videoRenderers = findNodes(itemSectionRenderers, "videoRenderer");
        
                const items = videoRenderers.map(videoRenderer =>
                {
                    const name = findNodes(findNodes(videoRenderer, "title"), "text")[0];
                    const videoId = videoRenderer.videoId;

                    d.get(this).cache.set(videoId, {
                        thumbnails: videoRenderer.thumbnail.thumbnails
                    });

                    return {
                        path: "/video/" + videoId,
                        dir: "/video",
                        name: name,
                        type: "f",
                        size: 0,
                        mimetype: "application/x-youtube-link",
                        ctime: 0,
                        mtime: 0
                    };
                });
    
                return items;
            }
            catch (err)
            {
                console.error(err);
            }
            return [];
        }

        async read(path)
        {
            const parts = path.split("/").filter(p => p !== "");
            if (parts.length < 2)
            {
                return null;
            }
            else if (parts[0] === "video")
            {
                const videoId = parts[1];

                const obj = {
                    videoId,
                    thumbnail: d.get(this).cache.get(videoId).thumbnails[0].url
                };

                return new Blob([JSON.stringify(obj, null, 2)]);
            }
            return null;
        }

    }
    exports.YouTubeFS = YouTubeFS;

});