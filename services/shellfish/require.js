// must not be in strict mode or some browsers will fail with JQuery

var require;

(function ()
{
    // stack of task queues
    var stackOfQueues = [];

    // modules cache
    var cache = { };

    // bundle cache
    var bundleCache = { };

    // ID to URL map
    var idsMap = { };

    var nextScheduled = false;

    function loadBundle(url, callback)
    {
        console.log("loading JS bundle from server: " + url);
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function ()
        {
            if (xhr.readyState === XMLHttpRequest.DONE)
            {
                if (xhr.status === 200)
                {
                    try
                    {
                        var bundle = JSON.parse(xhr.responseText);
                        for (var moduleUrl in bundle)
                        {
                            bundleCache[moduleUrl] = bundle[moduleUrl];
                        }
                        callback();
                    }
                    catch (err)
                    {
                        console.error("Failed to load bundle: " + err);
                    }
                }
                else
                {
                    callback();
                }
            }
        };
        xhr.send();
    }

    function loadCode(url, callback)
    {
        if (bundleCache[url])
        {
            //console.log("loading module from bundle: " + url);
            callback(bundleCache[url]);
            return;
        }

        console.log("loading module from server: " + url);
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function ()
        {
            if (xhr.readyState === XMLHttpRequest.DONE)
            {
                if (xhr.status === 200)
                {
                    callback(xhr.responseText);
                }
                else
                {
                    //throw "Failed to load module: status code " + xhr.status;
                    callback("");
                }
            }
        };
        xhr.send();
    }

    function loadStyle(url, callback)
    {
        if (bundleCache[url])
        {
            url = "data:text/css;base64," + btoa(bundleCache[url]);
        }

        var link = document.createElement("link");
        link.setAttribute("type", "text/css");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("href", url);
        link.onload = function ()
        {
            callback();
        }
        document.head.appendChild(link);
    }

    function loadModule(url, callback)
    {
        if (idsMap[url])
        {
            url = idsMap[url];
        }

        if (cache[url])
        {
            //console.log("loading module from cache " + url);
            callback(cache[url]);
            return;
        }
        
        loadCode(url, function (code)
        {
            if (code === "")
            {
                callback(null);
                return;
            }

            var pos = url.lastIndexOf("/");
            var dirname = url.substr(0, pos);

            var js = "(function ()" +
                     "{" +
                     "var __dirname = \"" + dirname + "\";" +
                     "var exports = { };" +
                     code +
                     "return exports;" +
                     "})();";
            try
            {
                stackOfQueues.push([]);
                var module = eval(js);
                cache[url] = module;

                if (module.__id)
                {
                    console.log("registering module ID: " + module.__id);
                    idsMap[module.__id] = url;
                }

                callback(module);
            }
            catch (err)
            {
                console.error("Failed to load module: " + url + " " + err);
                //console.log(js);
                callback(null);
            }
        });
    }

    function next()
    {
        if (nextScheduled)
        {
            return;
        }

        if (stackOfQueues.length === 0)
        {
            return;
        }

        var queue = stackOfQueues[stackOfQueues.length - 1];
        if (queue.length === 0)
        {
            stackOfQueues.pop();
            next();
            return;
        }

        var ctx = queue[0];
        if (ctx.urls.length === 0)
        {
            queue.shift();
            ctx.callback.apply(null, ctx.modules);
            next();
            return;
        }

        var url = ctx.urls[0];
        ctx.urls.shift();

        nextScheduled = true;

        if (url.toLowerCase().endsWith(".css"))
        {
            loadStyle(url, function ()
            {
                nextScheduled = false;
                ctx.modules.push(null);
                next();
            });
        }
        else
        {
            loadModule(url, function (module)
            {
                nextScheduled = false;
                ctx.modules.push(module);
                next();
            });
        }
    }

    function addTask(urls, callback)
    {
        if (stackOfQueues.length === 0)
        {
            stackOfQueues.push([]);
        }
        var queue = stackOfQueues[stackOfQueues.length - 1];
        var ctx = {
            urls: urls,
            modules: [],
            callback: callback
        };

        queue.push(ctx);
    }

    require = function (urls, callback)
    {
        if (typeof urls === "string")
        {
            addTask([urls], callback);
        }
        else
        {
            addTask(urls, callback);
        }
        next();
    };

    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; ++i)
    {
        var script = scripts[i];

        var bundle = script.getAttribute("data-bundle");
        if (bundle && bundle !== "")
        {
            nextScheduled = true;
            loadBundle(bundle, function ()
            {
                nextScheduled = false;
                next();
            });
        }

        var main = script.getAttribute("data-main");
        if (main && main !== "")
        {
            require([main], function (module) { });
        }
    }
})();
