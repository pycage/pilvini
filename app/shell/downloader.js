shRequire(["shellfish/core", "shellfish/low"], (core, low) =>
{
    const d = new WeakMap();

    class Downloader extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                item: low.createElementTree(
                    low.tag("a")
                    .style("display", "none")
                    .html()
                )
            });
        }

        download(href, name)
        {
            const item = d.get(this).item;
            item.href = href;
            item.download = name;
            item.click();
            window.location.hash = "";
        }
    }
    exports.Downloader = Downloader;

});