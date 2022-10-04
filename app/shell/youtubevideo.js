shRequire(["shellfish/low", "shellfish/html"], (low, ui) =>
{

    const d = new WeakMap();

    /**
     * Class representing an embedded YouTube video.
     */
    class YouTubeVideo extends ui.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                videoId: "",
                item: low.createElementTree(
                    low.tag("iframe")
                    .attr("title", "YouTube video player")
                    .attr("frameborder", "0")
                    .attr("sandbox", "allow-scripts allow-same-origin allow-presentation")
                    .attr("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope")
                    .html()
                )
            });

            this.notifyable("videoId");
        }

        get videoId() { return d.get(this).videoId; }
        set videoId(v)
        {
            d.get(this).videoId = v;
            this.videoIdChanged();

            if (v !== "")
            {
                d.get(this).item.src = "https://www.youtube.com/embed/" + v + "?autoplay=1";
                //d.get(this).item.src = "https://yewtu.be/embed/" + v + "?autoplay=1";
            }
            else
            {
                d.get(this).item.src = "";
            }
        }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.YouTubeVideo = YouTubeVideo;

});