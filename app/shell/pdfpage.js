shRequire(["shellfish/html"], (html) =>
{

    const d = new WeakMap();

    /**
     * Class for rendering a page of a PDF document.
     * 
     * Multiple PDFPage instances referencing the same PDF document may be used
     * to display multiple pages of a document at the same time.
     * 
     * @extends html.Canvas
     * @memberof pdf
     * 
     * @property {pdf.PDFDocument} document - (default: `null`) The PDF document to render.
     * @property {number} page - (default: `0`) The number of the page to render.
     * @property {number} pageWidth - [readonly] The unscaled width of the current page in pixels.
     * @property {number} pageHeight - [readonly] The unscaled height of the current page in pixels.
     * @property {number} scale - (default: `1.0`) The scale for rendering.
     * @property {string} status - [readonly] The current status. One of: `empty|loading|error|success`
     */
    class PDFPage extends html.Canvas
    {
        constructor()
        {
            super();
            d.set(this, {
                pdf: null,
                status: "empty",
                page: 0,
                pageWidth: 0,
                pageHeight: 0,
                scale: 1.0
            });

            this.notifyable("document");
            this.notifyable("page");
            this.notifyable("pageWidth");
            this.notifyable("pageHeight");
            this.notifyable("scale");
            this.notifyable("status");
        }

        get status() { return d.get(this).status; }

        get document() { return d.get(this).pdf; }
        set document(p)
        {
            const priv = d.get(this);

            if (priv.pdf)
            {
                priv.pdf.disconnect("statusChanged", this);
                priv.pdf.referenceRemove(this);
            }

            
            priv.pdf = p;

            if (p)
            {
                p.referenceAdd(this);
                p.connect("statusChanged", this, this.safeCallback(() =>
                {
                    if (p.status === "success")
                    {
                        this.render();
                    }
                }));
                this.render();
            }
            else
            {
                priv.status = "empty";
                this.statusChanged();
            }

            this.documentChanged();
        }

        get scale() { return d.get(this).scale; }
        set scale(s)
        {
            d.get(this).scale = s;
            this.render();
            this.scaleChanged();
        }

        get page() { return d.get(this).page; }
        set page(n)
        {
            d.get(this).page = n;
            this.render();
            this.pageChanged();
        }

        get pageWidth() { return d.get(this).pageWidth; }
        get pageHeight() { return d.get(this).pageHeight; }

        /**
         * Renders the currently selected page.
         * @private
         */
        render()
        {
            const priv = d.get(this);

            if (! priv.pdf || priv.pdf.status !== "success")
            {
                return;
            }

            priv.status = "loading";
            this.statusChanged();
            
            const n = Math.max(0, Math.min(priv.pdf.pages - 1, priv.page));

            priv.pdf.getPage(n)
            .then(page =>
            {
                let viewport = page.getViewport({ scale: 1.0 });
                if (priv.scale > 0.0)
                {
                    viewport = page.getViewport({ scale: priv.scale });
                }
                else
                {
                    const fitScale = this.width > 0 ? this.width / viewport.width
                                                    : 1.0;
                    viewport = page.getViewport({ scale: fitScale });
                }

                this.originalWidth = viewport.width;
                this.originalHeight = viewport.height;
                priv.pageWidth = viewport.viewBox[2];
                priv.pageHeight = viewport.viewBox[3];
                this.pageWidthChanged();
                this.pageHeightChanged();

                page.render({ canvasContext: this.context2d, viewport }).promise
                .then(() =>
                {
                    priv.status = "success";
                    this.statusChanged();

                    //page.cleanup();
                });
            })
            .catch(err =>
            {
                console.error("Failed to render page " + n + ": " + err);
                priv.status = "error";
                this.statusChanged();
            });
        }
    }
    exports.PDFPage = PDFPage;

});