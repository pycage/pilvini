const [ core ] = await shRequire(["shellfish/core"]);
const modFs = require("node:fs/promises");
const modChildProcess = require("node:child_process");

const d = new WeakMap();

class EpgService extends core.Object
{
    constructor()
    {
        super();
        d.set(this, {
            epg: null,
            channelsMap: new Map(/* ID -> Name */),
            reverseChannelsMap: new Map(/* Name -> ID */)
        });

    }

    pdvr(...args)
    {
        const priv = d.get(this);
        return new Promise((resolve, reject) =>
        {
            const child = modChildProcess.spawn("pdvr", args);

            let out = "";

            child.stdout.on("data", chunk =>
            {
                out += chunk.toString("utf-8");
            });

            child.stderr.on("data", chunk =>
            {
                console.error(chunk.toString("utf-8"));
            });

            child.on("error", () => { });

            child.on("close", exitCode =>
            {
                if (exitCode === 0)
                {
                    resolve(out);
                }
                else
                {
                    reject("Error: " + exitCode);
                }
            });
        });
    }    

    async loadEpg()
    {
        const priv = d.get(this);
        if (! priv.epg)
        {
            const channelData = await this.pdvr("get-channels");
            //const channelData = await modFs.readFile(priv.channels, { encoding: "utf8" });
            channelData.split("\n").forEach(line =>
            {
                const parts = line.split(":");
                const rawName = parts[0] || "";
                const channelId = parts[8] || "";

                console.log(channelId + " -> " + rawName);
                priv.channelsMap.set(channelId, rawName);
                priv.reverseChannelsMap.set(rawName, channelId);
            });

            const data = await this.pdvr("get-epg");
            //const data = await modFs.readFile(priv.source, { encoding: "utf8" });
            priv.epg = JSON.parse(data);
        }
    }

    /**
     * Returns a list of services of `{ serviceId, name }`.
     */
    async services()
    {
        const priv = d.get(this);
        await this.loadEpg();
        
        return Object.keys(priv.epg.services)
        .filter(channelId => priv.channelsMap.has(channelId))
        .map(channelId =>
        {
            const name = priv.channelsMap.get(channelId);
            return { serviceId: channelId, name };
        })
        .sort((a, b) => a.name < b.name ? -1 : 1);
    }

    /**
     * Returns a list of events of { eventId, name, begin, end }.
     */
    async events(serviceId)
    {
        const priv = d.get(this);

        const items = priv.epg.services[serviceId] || { };
        const recordings = await this.recordings();

        return Object.values(items)
        .map(item =>
        {
            return {
                serviceId: serviceId,
                eventId: item.eventId,
                name: item.short.name,
                serviceName: priv.channelsMap.get(serviceId),
                begin: item.start,
                end: item.start + item.duration,
                scheduled: !! recordings.find(event => event.eventId === item.eventId && event.serviceId === serviceId)
            };
        })
        .sort((a, b) => a.begin - b.begin);
    }

    /**
     * Returns information about the given event as `{ name, description }`.
     */
    async eventInfo(serviceId, eventId)
    {
        const priv = d.get(this);

        const service = priv.epg.services[serviceId] || { };
        const event = service[eventId] || { };

        const description = event?.extended?.text || "";

        return {
            name: event?.short?.name || "",
            description: description.replace("\0", "\n\n")
        };
    }

    /**
     * Returns the event at the given time.
     */
    async eventAt(serviceId, timestamp)
    {
        const priv = d.get(this);
        await this.events(serviceId)
        .filter(event =>
        {
            return event.start <= timestamp &&
                   event.start + event.duration >= timestamp;
        })[0] || { };
    }

    /**
     * Returns a list of the currently scheduled recordings as `{ }`.
     */
    async recordings()
    {
        const priv = d.get(this);

        const recs = await this.pdvr("get-recordings");

        const recordings = [];
        const lines = recs.split("\n");
        for (let i = 0; i < lines.length; ++i)
        {
            const parts = lines[i].split("|");
            if (parts.length < 4)
            {
                continue;
            }

            const begin = Number.parseInt(parts[0]);
            const duration = Number.parseInt(parts[1]);
            const serviceId = priv.reverseChannelsMap.get(parts[2]) || "0";
            const eventId = await this.eventAt(serviceId, begin + duration / 2).eventId;
            const name = parts[3];

            recordings.push({
                begin,
                end: begin + duration,
                serviceId,
                eventId,
                name
            });
        }
        return recordings;
    }

    /**
     * Schedules or cancels a recording.
     */
    async record(serviceId, eventId, value)
    {
        /*
        const quote = (s) =>
        {
            return "\"" +
                   s.replace(/\"/g, "\\\"").replace(/\0/g, " ") +
                   "\"";
        };
        */

        const priv = d.get(this);
        const event = priv.epg.services[serviceId][eventId];

        const date = new Date(event.begin * 1000);
        const time = date.getFullYear() + "/" +
                     (date.getMonth() + 1) + "/" +
                     date.getDate() + " " +
                     date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

        const duration = event.end - event.begin;
        if (value)
        {
            await this.pdvr("record", time, duration, priv.channelsMap.get(serviceId), event.name);
        }
        else
        {
            await this.pdvr("cancel", time);
        }
    }
}
exports.EpgService = EpgService;