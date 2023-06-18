const modChildProcess = require("child_process");

class DiskInfo
{
    constructor()
    {
        this.path = "/";
    }

    free()
    {
        return new Promise((resolve, reject) =>
        {
            if (process.platform === "linux")
            {
                modChildProcess.exec("LANG=C df", (err, result) =>
                {
                    const info = result.split("\n")
                    .filter((item, idx) => idx > 0 && item !== "")
                    .map(entry =>
                    {
                        const parts = entry.split(" ").filter(p => p !== "");
                        return {
                            volume: parts[5],
                            free: Number.parseInt(parts[3]) * 1024,
                            total: Number.parseInt(parts[1]) * 1024
                        };
                    })
                    .filter(item => this.path.startsWith(item.volume))
                    .sort((a, b) => b.volume.length - a.volume.length);
                    console.log(this.path);
                    console.log(JSON.stringify(info));
                    resolve(info);
                });
            }
            else if (process.platform === "win32")
            {
                modChildProcess.exec('wmic logicaldisk get size,freespace,caption', (err, result) =>
                {
                    const path = this.path.startsWith("/") ? "C:" + this.path : this.path;

                    const info = result.split("\r\r\n")
                    .filter((item, idx) => idx > 0 && item !== "")
                    .map(entry =>
                    {
                        const parts = entry.split(" ").filter(p => p !== "");
                        return {
                            volume: parts[0],
                            free: Number.parseInt(parts[1]),
                            total: Number.parseInt(parts[2])
                        };
                    })
                    .filter(item => path.startsWith(item.volume));
                    console.log(this.path);
                    console.log(JSON.stringify(info));
                    resolve(info);
                });
            }
            else
            {
                // not supported
                reject("not supported");
            }

        });
    }

}
exports.DiskInfo = DiskInfo;