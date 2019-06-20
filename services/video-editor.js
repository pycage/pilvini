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

function timeToSeconds(t)
{
    var parts = t.split(/[:.]/);
    if (parts.length === 4)
    {
        var h = Number.parseInt(parts[0]);
        var m = Number.parseInt(parts[1]);
        var s = Number.parseInt(parts[2]);
        var hs = Number.parseInt(parts[3]);
        return h * 3600 + m * 60 + s + hs / 100.0;
    }
    else
    {
        return 0;
    }
}

function cutVideo(contentRoot, data, progressCallback, finishCallback)
{
    var batch = [];

    for (var targetUri in data.directions)
    {
        var ranges = data.directions[targetUri];
        var filter = "";
        var totalDuration = 0;
        filter += "[0:v] split=" + ranges.length;
        for (var i = 1; i <= ranges.length; ++i)
        {
            filter += "[vcopy" + i + "]";
        }
        filter += ", ";
        filter += "[0:a] asplit=" + ranges.length;
        for (var i = 1; i <= ranges.length; ++i)
        {
            filter += "[acopy" + i + "]";
        }
        filter += ", ";
        
        var counter = 1;
        ranges.forEach(function (range)
        {
            filter += "[vcopy" + counter + "] trim=" + range[0] + ":" + range[1] + "," +
                      "setpts=PTS-STARTPTS" +
                      "[v" + counter + "], " +
            
                      "[acopy" + counter + "] atrim=" + range[0] + ":" + range[1] + "," +
                      "asetpts=PTS-STARTPTS" +
                      "[a" + counter + "], ";

            totalDuration += (range[1] - range[0]);
            ++counter;
        });
        
        for (i = 1; i <= ranges.length; ++i)
        {
            filter += "[v" + i + "][a" + i + "]";
        }
        filter += "concat=n=" + ranges.length + ":v=1:a=1[v][a]";

        var sourceFile = modUtils.uriToPath(data.uri, contentRoot);
        var targetFile = modUtils.uriToPath(targetUri, contentRoot);
        var idx = targetFile.lastIndexOf("/");
        var targetName = idx !== -1 ? targetFile.substr(idx + 1) : targetFile;

        var args = ["-nostdin",
                    "-i", sourceFile, "-filter_complex", filter,
                    "-map", "[v]", "-map", "[a]", targetFile];

        batch.push({
            name: targetName,
            duration: totalDuration,
            parameters: args
        });
    }

    function process(batch)
    {
        if (batch.length === 0)
        {
            finishCallback();
            return;
        }

        var item = batch[0];
        batch.shift();
        
        progressCallback(item.name, 0, item.duration);

        console.log(JSON.stringify(item.parameters));
        const ffmpeg = modChildProcess.spawn("ffmpeg", item.parameters);

        ffmpeg.stdout.on("data", function (data)
        {
            console.log("ffmpeg: " + data);
        });
    
        ffmpeg.stderr.on("data", function (data)
        {
            console.log("ffmpeg err: " + data);
            var idx = data.indexOf(" time=");
            if (idx !== -1)
            {
                var idx2 = data.indexOf(" ", idx + 7);
                var time = data.slice(idx + 6, idx2).toString("ascii");
                var seconds = timeToSeconds(time);

                progressCallback(item.name, seconds, item.duration);
            }
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
    var m_status = { };

    function send(response, data, callback)
    {
        response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
        response.writeHeadLogged(200, "OK");
        response.write(data);
        response.end();
    }

    this.handleRequest = function (request, response, userContext, shares, callback)
    {
        var urlObj = modUrl.parse(request.url, true);
        var uri = urlObj.pathname.substr("/::video-editor".length);

        if (request.method === "GET")
        {
            if (uri === "/status")
            {
                send(response, JSON.stringify(m_status), callback);
                callback();
            }
        }
        else if (request.method === "POST")
        {
            if (uri === "/cut")
            {
                var json = "";
                request.on("data", function (chunk) { json += chunk; });
                request.on("end", function ()
                {
                    var data = JSON.parse(json);

                    cutVideo(m_contentRoot + userContext.home(), data, function (name, seconds, total)
                    {
                        m_status = {
                            name: name,
                            seconds: seconds,
                            total: total
                        };
                    },
                    function ()
                    {
                        m_status = { };
                    });

                    response.writeHeadLogged(200, "Ok");
                    response.end();
                    callback();
                });
            }
        }
    }
}
