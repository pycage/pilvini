const [ core ] = await shRequire(["shellfish/core"]);
const modPath = require("node:path");
const modChildProcess = require("node:child_process");

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


class VideoEditor extends core.Object
{
    constructor()
    {
        super();
    }

    cutVideo(sourceFile, directions, progressCallback, finishCallback)
    {
        const batch = [];

        for (const targetName in directions)
        {
            const ranges = directions[targetName];
            let filter = "";
            let totalDuration = 0;

            filter += "[0:v] split=" + ranges.length;
            for (let i = 1; i <= ranges.length; ++i)
            {
                filter += "[vcopy" + i + "]";
            }
            filter += ", ";
            filter += "[0:a] asplit=" + ranges.length;
            for (let i = 1; i <= ranges.length; ++i)
            {
                filter += "[acopy" + i + "]";
            }
            filter += ", ";

            let counter = 1;
            ranges.forEach(range =>
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

            for (let i = 1; i <= ranges.length; ++i)
            {
                filter += "[v" + i + "][a" + i + "]";
            }
            filter += "concat=n=" + ranges.length + ":v=1:a=1[v][a]";

            const idx = sourceFile.lastIndexOf("/");
            const targetDir = idx !== -1 ? sourceFile.substr(0, idx) : "";
            const targetPath = targetDir + "/" + targetName;

            const args = [
                "-nostdin",
                "-i", sourceFile, "-filter_complex", filter,
                "-map", "[v]", "-map", "[a]",
                "-movflags", "faststart",
                targetPath
            ];

            batch.push({
                name: targetPath,
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

            const item = batch[0];
            batch.shift();

            progressCallback(item.name, 0, item.duration);

            console.log(JSON.stringify(item));
            const ffmpeg = modChildProcess.spawn("ffmpeg", item.parameters);

            ffmpeg.stdout.on("data", data =>
            {
                console.log("ffmpeg: " + data);
            });
        
            ffmpeg.stderr.on("data", data =>
            {
                console.log("ffmpeg err: " + data);
                const idx = data.indexOf(" time=");
                if (idx !== -1)
                {
                    const idx2 = data.indexOf(" ", idx + 7);
                    const time = data.slice(idx + 6, idx2).toString("ascii");
                    const seconds = timeToSeconds(time);
    
                    progressCallback(item.name, seconds, item.duration);
                }
            });

            ffmpeg.on("error", () => { });
        
            ffmpeg.on("close", exitCode =>
            {
                console.log("ffmpeg exited with code " + exitCode + ".");
                process(batch);
            });
        }

        process(batch);
    }
}
exports.VideoEditor = VideoEditor;