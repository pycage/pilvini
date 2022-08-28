shRequire(["shellfish/core", __dirname + "/pdf.min.js"], (core, pdfjs) =>
{

    const d = new WeakMap();

    let thePdfJs = null;

    /**
     * Class representing a PDF document. The pages of the document may be
     * rendered using the {@link pdf.PDFPage} class.
     * 
     * This class uses Mozilla's pdfjs library for parsing and rendering
     * PDF documents (https://mozilla.github.io/pdf.js/).
     * 
     * @extends core.Object
     * @memberof pdf
     * 
     * @property {object} metadata - [readonly] The meta data of the document.
     * @property {number} pages - [readonly] The number of pages in the document.
     * @property {number} progress - [readonly] The current loading progress as a value between `0.0` and `1.0`.
     * @property {string} source - The image source URL.
     * @property {string} status - [readonly] The current status. One of: `empty|loading|error|success`
     */
    class PDFDocument extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                status: "empty",
                source: "",
                pages: 0,
                progress: 0.0,
                doc: null,
                metadata: { }
            });

            this.notifyable("metadata");
            this.notifyable("pages");
            this.notifyable("progress");
            this.notifyable("source");
            this.notifyable("status");

            this.onDestruction = () =>
            {
                const priv = d.get(this);
                if (priv.doc)
                {
                    priv.doc.destroy();
                    priv.doc = null;
                }
            };

            if (! thePdfJs)
            {
                pdfjs.GlobalWorkerOptions.workerSrc = __dirname + "/pdf.worker.min.js";
                thePdfJs = pdfjs;
            }
        }

        get status() { return d.get(this).status; }

        get pages() { return d.get(this).pages; }

        get metadata() { return d.get(this).metadata; }

        get progress() { return d.get(this).progress; }

        get source() { return d.get(this).source; }
        set source(s)
        {
            const priv = d.get(this);

            if (s === undefined)
            {
                s = "";
            }

            if (s !== "")
            {
                priv.status = "loading";
            }
            else
            {
                priv.status = "empty";
            }
            this.statusChanged();

            priv.pages = 0;
            this.pagesChanged();
            
            if (priv.doc)
            {
                priv.metadata = { };
                this.metadataChanged();

                priv.doc.cleanup();
                priv.doc = null;
            }

            if (s === "")
            {
                return;
            }

            const loadingTask = thePdfJs.getDocument(shRequire.resource(s));

            console.log(loadingTask);
            loadingTask.onProgress = (progress) =>
            {
                priv.progress = progress.loaded / progress.total;
                this.progressChanged();
            };

            loadingTask.promise
            .then(this.safeCallback(doc =>
            {
                priv.doc = doc;
                priv.pages = doc.numPages;
                this.pagesChanged();
                console.log(doc);

                priv.status = "success";
                this.statusChanged();

                this.loadMetadata();
            }))
            .catch(err =>
            {
                console.error("Failed to load PDF document: " + err);
                priv.status = "error";
                this.statusChanged();
            });

            this.sourceChanged();
        }

        /**
         * Loads the document's metadata.
         * 
         * @private
         */
        loadMetadata()
        {
            const priv = d.get(this);
            if (! priv.doc)
            {
                return;
            }

            priv.doc.getMetadata()
            .then(this.safeCallback(md =>
            {
                priv.metadata = {
                    contentLength: md.contentLength,
                    author: md.info.author || "",
                    creator: md.info.Creator || "",
                    creationDate: md.info.CreationDate || "",
                    modDate: md.info.ModDate || "",
                    language: md.info.Language || "",
                    keywords: md.info.keywords || "",
                    pdfVersion: md.info.PDFFormatVersion || "0.0",
                    producer: md.info.Producer || "",
                    subject: md.info.Subject || "",
                    title: md.info.Title || ""
                };
                this.metadataChanged();
            }))
            .catch(err =>
            {
                console.error("Failed to retrieve metadata");
            });
        }

        /**
         * Returns a pdfjs promise object for the given page.
         * 
         * @param {number} n - The page number.
         * @returns {Promise<pdfjs.PDFPageProxy>} The page promise object.
         */
        getPage(n)
        {
            const priv = d.get(this);
            if (priv.doc)
            {
                return priv.doc.getPage(n + 1);
            }
            else
            {
                return new Promise((resolve, reject) => { reject("No document"); });
            }
        }

        /**
         * Invokes the given callback with the document's data.
         * 
         * @param {function} callback - The callback.
         */
        getData(callback)
        {
            const priv = d.get(this);
            if (priv.doc)
            {
                priv.doc.getData()
                .then(data =>
                {
                    callback(data);
                })
                .catch(err =>
                {
                    console.error("Failed to retrive document data.");
                });
            }
        }

    }
    exports.PDFDocument = PDFDocument;

});