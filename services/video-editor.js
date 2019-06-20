"use strict";

var requireShared = require.main.exports.requireShared;

const modPath = require("path"),
      modChildProcess = require("child_process"),
      modUrl = require("url");

const modUtils = requireShared("utils");


exports.init = function (config)
{
    require.main.exports.registerService("video-editor", new Service(config));
    //require.main.exports.registerResource("video-editor", modPath.join(__dirname, "video-editor"));

    //require.main.exports.registerShellExtension("/::res/video-editor/video-editor.js");
};

function cutVideo(contentRoot, data, callback)
{
    var batch = [];

    for (var targetUri in data.directions)
    {
        var ranges = data.directions[targetUri];
        var filter = "";
        var counter = 1;
        ranges.forEach(function (range)
        {
            if (counter > 1)
            {
                filter += ", ";
            }
            filter += "[0:v] trim=" + range[0] + ":" + range[1] + "," +
                      "setpts=PTS-STARTPTS" +
                      "[v" + counter + "], " +
            
                      "[0:a] atrim=" + range[0] + ":" + range[1] + "," +
                      "asetpts=PTS-STARTPTS" +
                      "[a" + counter + "]";
        });
        filter += ", ";
        for (var i = 1; i <= ranges.length; ++i)
        {
            filter += "[v" + i + "][a" + i + "]";
        }
        filter += "concat=n=" + ranges.length + ":v=1:a=1[v][a]";

        var sourceFile = modUtils.uriToPath(data.uri, contentRoot);
        var targetFile = modUtils.uriToPath(targetUri, contentRoot);

        var args = ["-i", sourceFile, "-filter_complex", filter, "-map", "[v]", "-map", "[a]", targetFile];

        batch.push(args);
    }

    function process(batch)
    {
        if (batch.length === 0)
        {
            callback();
            return;
        }

        var parameters = batch[0];
        batch.shift();
        
        console.log(JSON.stringify(parameters));
        const ffmpeg = modChildProcess.spawn("ffmpeg", parameters);

        ffmpeg.stdout.on("data", function (data)
        {
            console.log("ffmpeg: " + data);
        });
    
        ffmpeg.stderr.on("data", function (data)
        {
            console.log("ffmpeg err: " + data);
        });
    
        ffmpeg.on("close", function (exitCode)
        {
            console.log("ffmpeg exited with code " + exitCode + ".");
            process(batch);
        });
    }

    process(batch);
}

function Service(config)
{
    var m_contentRoot = config.root.server.root;

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);
        var uri = urlObj.pathname.substr("/::video-editor".length);

        if (request.method === "POST")
        {
            if (uri === "/cut")
            {
                var json = "";
                request.on("data", function (chunk) { json += chunk; });
                request.on("end", function ()
                {
                    var data = JSON.parse(json);
                    response.writeHeadLogged(200, "Ok");
                    response.end();
                    callback();

                    cutVideo(m_contentRoot + userContext.home(), data, function ()
                    {
                        
                    });
                });
            }
        }
    }
}
