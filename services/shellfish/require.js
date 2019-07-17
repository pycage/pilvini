"use strict";

var require;

(function ()
{
    // stack of task queues
    var stackOfQueues = [];

    // modules cache
    var cache = { };

    var nextScheduled = false;

    function loadModule(url, callback)
    {
        if (cache[url])
        {
            console.log("from cache " + url);
            callback(cache[url]);
            return;
        }
        
        console.log("loading " + url);
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function ()
        {
            if (xhr.readyState === XMLHttpRequest.DONE)
            {
                if (xhr.status === 200)
                {
                    var pos = url.lastIndexOf("/");
                    var dirname = url.substr(0, pos);

                    var js = "(function ()" +
                             "{" +
                             "var __dirname = \"" + dirname + "\";" +
                             "var exports = { };" +
                             xhr.responseText +
                             "return exports;" +
                             "})();";
                    try
                    {
                        console.log("loaded " + url);
                        stackOfQueues.push([]);
                        var module = eval(js);
                        cache[url] = module;

                        callback(module);
                    }
                    catch (err)
                    {
                        console.log("Failed to load module: " + url + " " + err);
                        //console.log(js);
                        callback(null);
                    }
                    return;
                }
                else
                {
                    console.log("status " + xhr.status);
                    //throw "Failed to load module: status code " + xhr.status;
                    callback(null);
                }
            }
        };
        xhr.send();
    }

    function next()
    {
        if (nextScheduled)
        {
            return;
        }

        console.log("next");
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
        loadModule(url, function (module)
        {
            nextScheduled = false;
            ctx.modules.push(module);
            console.log("loaded " + url + ", next");
            next();
        });
    }

    function addTask(urls, callback)
    {
        if (stackOfQueues.length === 0)
        {
            stackOfQueues.push([]);
        }
        var queue = stackOfQueues[stackOfQueues.length - 1];

        console.log("addTask " + urls);
        var ctx = {
            urls: urls,
            modules: [],
            callback: callback
        };

        queue.push(ctx);
    }

    require = function (urls, callback)
    {
        console.log("require " + urls);
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
        var main = script.getAttribute("data-main");
        if (main && main !== "")
        {
            require([main], function (module) { });
        }
    }
})();

/* Loads the given stylesheet.
 */
function loadStyle(uri, callback)
{
    var link = document.createElement("link");
    link.setAttribute("type", "text/css");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", uri);
    link.onload = function ()
    {
        if (callback)
        {
            callback();
        }
    }
    document.head.appendChild(link);
}
