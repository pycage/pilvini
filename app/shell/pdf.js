shRequire(["shellfish/low", "shellfish/core", "shellfish/html"], (low, core, html) =>
{

    const d = new WeakMap();

    class Pdf extends html.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                source: "",
                item: low.createElementTree(
                    low.tag("object")
                    .attr("type", "application/pdf")

                    .html()
                )
            });

            this.notifyable("source");
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            if (s === undefined)
            {
                s = "";
            }

            d.get(this).source = s;
            this.sourceChanged();

            d.get(this).item.data = shRequire.resource(s);
        }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.Pdf = Pdf;

});