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
            expires: 0,
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

        const now = Date.now();

        if (! priv.epg || priv.expires < now)
        {
            const channelData = await this.pdvr("get-channels");
            //const channelData = await modFs.readFile(priv.channels, { encoding: "utf8" });
            channelData.split("\n").forEach(line =>
            {
                const parts = line.split(":");
                const rawName = parts[0] || "";
                const channelId = parts[8] || "";

                priv.channelsMap.set(channelId, rawName);
                priv.reverseChannelsMap.set(rawName, channelId);
            });

            const data = await this.pdvr("get-epg");
            //const data = await modFs.readFile(priv.source, { encoding: "utf8" });
            priv.epg = JSON.parse(data);
            priv.expires = now + 24 * 3600 * 1000;
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
        .sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    }

    async rawEvents(serviceId)
    {
        const priv = d.get(this);
        await this.loadEpg();

        const items = priv.epg.services[serviceId] || { };

        return Object.values(items)
        .map(item =>
        {
            return {
                serviceId: serviceId,
                eventId: item.eventId,
                name: item.short.name + (item.short.text !== "" ? " (" + item.short.text + ")" : ""),
                serviceName: priv.channelsMap.get(serviceId),
                begin: item.start,
                end: item.start + item.duration
            };
        })
        .sort((a, b) => a.begin - b.begin);
    }

    /**
     * Returns a list of events of { eventId, name, begin, end }.
     */
    async events(serviceId)
    {
        const recordings = await this.recordings();
        return (await this.rawEvents(serviceId))
        .map(event =>
        {
            event.scheduled = !! recordings.find(rec => rec.eventId === event.eventId && rec.serviceId === serviceId);
            return event;
        });
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
        const evs = await this.rawEvents(serviceId);
        return evs.filter(event =>
        {
            return event.begin <= timestamp &&
                   event.end >= timestamp;
        })[0] || { };
    }

    /**
     * Returns a list of the currently scheduled recordings as `{ }`.
     */
    async recordings()
    {
        const priv = d.get(this);
        await this.loadEpg();

        const recs = await this.pdvr("get-recordings");

        const recordingsList = [];
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
            const serviceName = parts[2];
            const serviceId = priv.reverseChannelsMap.get(serviceName) || "0";
            const name = parts[3];

            const event = await this.eventAt(serviceId, begin + duration / 2);
            if (! event)
            {
                continue;
            }

            recordingsList.push({
                begin,
                end: begin + duration,
                serviceId,
                serviceName,
                eventId: event.eventId,
                name,
                scheduled: true
            });
        }
        return recordingsList;
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

        const date = new Date(event.start * 1000);
        const time = date.getFullYear() + "/" +
                     (date.getMonth() + 1) + "/" +
                     date.getDate() + " " +
                     date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

        const duration = event.duration;
        if (value)
        {
            const name = event.short.name + (event.short.text !== "" ? " (" + event.short.text + ")" : "");
            console.log(["record", time, duration, priv.channelsMap.get(serviceId), name]);
            await this.pdvr("record", time, duration, priv.channelsMap.get(serviceId), name);
        }
        else
        {
            console.log(["cancel", event.start]);
            await this.pdvr("cancel", event.start);
        }
    }
}
exports.EpgService = EpgService;
