shRequire(["shellfish/server"], (server) =>
{
    const modHttps = require("https");
    const modUrl = require("url");


    async function fetchURL(method, path)
    {
        let response = null;
        for (let i = 0; i < 3; ++i)
        {
            response = await doFetch(method, path);
            console.log("status code: " + response.statusCode);
            console.log(JSON.stringify(response.headers));

            if (response.statusCode !== 301 && response.statusCode !== 302)
            {
                break;
            }
            else
            {
                path = response.headers["location"];
                console.log("Moved to: " + path);
            }
        }

        return response;
    }

    function doFetch(method, url)
    {
        return new Promise((resolve, reject) =>
        {
            const urlObj = modUrl.parse(url);

            const opts = {
                method: method,
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.path
            };

            const req = modHttps.request(opts, res =>
            {
                resolve(res);
            });

            req.on("error", err =>
            {
                reject(err);
            });

            req.end();
        })
    }
    
    function readResponse(res)
    {
        return new Promise((resolve, reject) =>
        {
            let data = null;
            
            res.on("data", chunk =>
            {
                if (! data)
                {
                    data = chunk;
                }
                else
                {
                    data = Buffer.concat([data, chunk]);
                }
            });
            
            res.on("end", () =>
            {
                resolve(data);
            });
        });
    }


    const d = new WeakMap();

    /**
     * Class representing a plain web session serving a filesystem for
     * GET and HEAD methods.
     * 
     * When requesting a folder, a simple HTML page with the folder's contents
     * is generated.
     * 
     * @extends server.WebSession
     * @memberof server
     * 
     * @property {core.Filesystem} filesystem - (default: `null`) The filesystem to serve.
     * @property {string} root - (default: `"/"`) The local path to use as the root folder.
     */
    class ProxySession extends server.HTTPSession
    {
        constructor()
        {
            super();
            d.set(this, {

            });

            this.onRequest = ev => { this.webRequest(ev); }
        }

        webRequest(ev)
        {
            async function f()
            {
                const res = await fetchURL(ev.method, ev.headers.get("location"));
                const data = await readResponse(res);
                return data;
            }

            f()
            .then(data =>
            {
                this.response(200, "OK")
                .body(data)
                .send();
            })
            .catch(err =>
            {
                this.response(500, "Server Error")
                .send();
            });

        }

    }
    exports.ProxySession = ProxySession;

});