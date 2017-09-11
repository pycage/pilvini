"use strict";

const modFs = require("fs");

const TAGS_MAP = {
    "APIC": "PICTURE",
    "COMM": "COMMENT",
    "TCOP": "COPYRIGHT",
    "TDOR": "DATE",
    "TIT2": "TITLE",
    "TLEN": "LENGTH",
    "TPE1": "ARTIST",
    "TALB": "ALBUM",
    "TOAL": "ALBUM",
    "TYER": "YEAR",
    "TCON": "GENRE",
    "TRCK": "TRACKNUMBER",

    "COM": "COMMENT",
    "PIC": "PICTURE",
    "TAL": "ALBUM",
    "TP1": "ARTIST",
    "TT2": "TITLE",
    "TRK": "TRACKNUMBER",
    "TYE": "YEAR",
    "TCO": "GENRE"
};

const GENRES = [
            "Blues",
            "Classic Rock",
            "Country",
            "Dance",
            "Disco",
            "Funk",
            "Grunge",
            "Hip-Hop",
            "Jazz",
            "Metal",
            "New Age",
            "Oldies",
            "Other",
            "Pop",
            "R&B",
            "Rap",
            "Reggae",
            "Rock",
            "Techno",
            "Industrial",

            "Alternative",
            "Ska",
            "Death Metal",
            "Pranks",
            "Soundtrack",
            "Euro-Techno",
            "Ambient",
            "Trip-Hop",
            "Vocal",
            "Jazz + Funk",
            "Fusion",
            "Trance",
            "Classical",
            "Instrumental",
            "Acid",
            "House",
            "Game",
            "Sound Clip",
            "Gospel",
            "Noise",

            "Alt Rock",
            "Bass",
            "Soul",
            "Punk",
            "Space",
            "Meditative",
            "Instrumental Pop",
            "Instrumental Rock",
            "Ethnic",
            "Gothic",
            "Darkwave",
            "Techno-Industrial",
            "Electronic",
            "Pop-Folk",
            "Eurodance",
            "Dream",
            "Southern Rock",
            "Comedy",
            "Cult",
            "Gangsta Rap",

            "Top 40",
            "Christian Rap",
            "Pop / Funk",
            "Jungle",
            "Native American",
            "Cabaret",
            "New Wave",
            "Psychedelic",
            "Rave",
            "Showtunes",
            "Trailer",
            "Lo-Fi",
            "Tribal",
            "Acid Punk",
            "Acid Jazz",
            "Polka",
            "Retro",
            "Musical",
            "Rock'n Roll",
            "Hard Rock",

            "Folk",
            "Folk / Rock",
            "National Folk",
            "Swing",
            "Fast-Fusion",
            "Bebop",
            "Latin",
            "Revival",
            "Celtic",
            "Bluegrass",
            "Avantgarde",
            "Gothic Rock",
            "Progressive Rock",
            "Psychedelic Rock",
            "Symphonic Rock",
            "Slow Rock",
            "Big Band",
            "Chorus",
            "Easy Listening",
            "Acoustic",

            "Humour",
            "Speech",
            "Chanson",
            "Opera",
            "Chamber Music",
            "Sonata",
            "Symphony",
            "Booty Bass",
            "Primus",
            "Porn Groove",
            "Satire",
            "Slow Jam",
            "Club",
            "Tango",
            "Samba",
            "Folklore",
            "Ballad",
            "Power Ballad",
            "Rhythmic Soul",
            "Freestyle",

            "Duet",
            "Punk Rock",
            "Drum Solo",
            "A Capella",
            "Euro-House",
            "Dance Hall",
            "Goa",
            "Drum & Bass",
            "Club-House",
            "Hardcore",
            "Terror",
            "Indie",
            "BritPop",
            "Negerpunk",
            "Polsk Punk",
            "Beat",
            "Christian Gangsta Rap",
            "Heavy Metal",
            "Black Metal",
            "Crossover",

            "Contemporary Christian",
            "Christian Rock",
            "Merengue",
            "Salsa",
            "Thrash Metal",
            "Anime",
            "JPop",
            "Synthpop"
        ];

const ID3_FLAG_UNSYNCHRONISATION = 1 << 7;
const ID3_FLAG_EXTENDED_HEADER = 1 << 6;
const ID3_FLAG_EXPERIMENTAL = 1 << 5;
const ID3_FLAG_FOOTER_PRESENT = 1 << 4;

function readBytes(fd, offset, size, callback)
{
    var buffer = new Buffer(size);
    modFs.read(fd, buffer, 0, size, offset, function (err, bytesRead, buffer)
    {
        callback(err, buffer);
    });
}

function parseId3v1(fd, tags, resultCallback)
{
    /* Reads the ID3v1 tag soup.
     */
    function readTagSoup(fd, callback)
    {
        // read the last 128 bytes
        modFs.fstat(fd, function (err, stats)
        {
            if (err)
            {
                callback(err, null);
                return;
            }

            readBytes(fd, stats.size - 128, 128, function (err, buffer)
            {
                callback(err, buffer);
            });
        });
    }

    readTagSoup(fd, function (err, buffer)
    {
        if (buffer.slice(0, 3).toString("ascii") !== "TAG")
        {
            resultCallback();
        }

        tags["TITLE"] = buffer.slice(3, 33).toString("binary");
        tags["ARTIST"] = buffer.slice(33, 63).toString("binary");
        tags["ALBUM"] = buffer.slice(63, 93).toString("binary");
        tags["YEAR"] = buffer.slice(93, 97).toString("binary");

        if (buffer[125] === 0 && buffer[126] !== 0)
        {
            // ID3v1.1
            tags["COMMENT"] = buffer.slice(97, 125).toString("binary");
            tags["TRACKNUMBER"] = buffer[126];
        }
        else
        {
            // ID3v1
            tags["COMMENT"] = buffer.slice(97, 127).toString("binary");
        }
        var genre = buffer[127];
        tags["GENRE"] = genre < GENRES.length ? GENRES[genre]
                                              : "<Unknown>";
    });
}

function parseId3v2(fd, rev, tags, resultCallback)
{
    /* Returns if the given key contains a string value.
     */
    function isStringKey(key)
    {
        return (key === "COMMENT" ||
                key === "COPYRIGHT" ||
                key === "TITLE" ||
                key === "ARTIST" ||
                key === "ALBUM" ||
                key === "TRACKNUMBER" ||
                key === "GENRE" ||
                key === "YEAR");
    }

    /* Reads the ID3v2 tag soup.
     */
    function readTagSoup(fd, callback)
    {
        readBytes(fd, 0, 10, function (err, buffer)
        {
            if (err)
            {
                callback(err, null);
                return;
            }

            var major = buffer[3];
            var rev = buffer[4];
            var flags = buffer[5];

            var size = (buffer[6] << 21) +
                       (buffer[7] << 14) +
                       (buffer[8] << 7) +
                       buffer[9];

            console.debug("Major " + major + " rev " + rev + " flags " + flags +
                          " size " + size);

            // don't continue with empty tags
            if (size < 10)
            {
                callback(null, null);
                return;
            }

            function readData(fd, size)
            {
                console.debug("Reading tag data: " + size + " bytes");
                readBytes(fd, 10, size, function (err, buffer)
                {
                    callback(err, buffer);
                });
            }

            if (flags & ID3_FLAG_EXTENDED_HEADER)
            {
                readBytes(fd, null, 4, function (err, buffer)
                {
                    if (err)
                    {
                        callback(err, 0);
                        return;
                    }

                    var extSize = (buffer[0] << 21) +
                                  (buffer[1] << 14) +
                                  (buffer[2] << 7) +
                                  buffer[3];
                    if (extSize > 4)
                    {
                        readBytes(fd, null, extSize - 4, function (err, buffer)
                        {
                            readData(fd, size - 10);
                        });
                    }
                    else
                    {
                        readData(fd, size - 10);
                    }
                });
            }
            else
            {
                readData(fd, size - 10);
            }
        });
    }

    /* Parses the ID3v2 tag soup.
     */
    function parseTagSoup(buffer, params, tags, callback)
    {
        function frameCallback(key, value, pos)
        {
            if (! key)
            {
                callback();
                return;
            }

            if (value)
            {
                if (isStringKey(key))
                {
                    console.debug("Tag " + key + " = " + value);
                }
                else if (key === "PICTURE")
                {
                    console.debug("Tag " + key + " = <image " + (value.data ? value.data.length : 0) + " bytes>");
                }
                else
                {
                    console.debug("Tag " + key + " = <" + value.length + " bytes>");
                }

                tags[key] = value;
            }
            parseFrame(buffer, pos, params, frameCallback);
        }

        parseFrame(buffer, 0, params, frameCallback);
    }

    /* Parses a ID3v2 frame.
     */
    function parseFrame(buffer, pos, params, callback)
    {
        if (pos > buffer.length - 10 || (buffer[pos] === 0 && buffer[pos + 1] === 0))
        {
            callback("", "", pos);
            return;
        }

        var key = buffer.slice(pos, pos + params.keyLength).toString("ascii");
        key = TAGS_MAP[key] || key;
        pos += params.keyLength;

        var valueSize = 0;
        if (params.syncSafe)
        {
            valueSize = (buffer[pos] << 21) +
                        (buffer[pos + 1] << 14) +
                        (buffer[pos + 2] << 7) +
                        buffer[pos + 3];
        }
        else
        {
            for (var i = 0; i < params.sizeLength; ++i)
            {
                var b = buffer[pos + i];
                valueSize = (valueSize << 8) + b;
            }
        }

        if (valueSize > 0xffffff)
        {
            callback("", "", pos);
            return;
        }

        pos += params.sizeLength;

        var flags = 0;
        if (params.hasFlags)
        {
            flags = (buffer[pos] << 8) + buffer[pos + 1];
            pos += 2;
        }

        var value = "";
        if (flags & params.flagCompressed)
        {
            console.debug("Compressed ID3 tag data is currently not supported.");
            value = "<compressed>";
        }
        else
        {
            var valueBuffer = buffer.slice(pos, pos + valueSize);
            if (key === "PICTURE")
            {
                value = parseApic(valueBuffer);
            }
            else if (params.encodings.length > 0 && valueBuffer[0] < 5 && isStringKey(key))
            {
                // try to decode string
                var encoding = params.encodings[valueBuffer[0]];
                if (encoding === "utf16be")
                {
                    // swap bytes
                    for (i = 0; i < valueBuffer.length; i += 2)
                    {
                        var b = valueBuffer[i];
                        valueBuffer[i] = valueBuffer[i + 1];
                        valueBuffer[i + 1] = b;
                    }
                    encoding = "utf16le";
                }
                value = valueBuffer.slice(1).toString(encoding);
            }
            else
            {
                value = valueBuffer.toString("binary");
            }
        }
        pos += valueSize;

        callback(key, value, pos);
    }

    /* Parses APIC data.
     */
    function parseApic(buffer)
    {
        var idx = buffer.indexOf(0, 1);
        var mimeType = buffer.slice(1, 1 + idx - 1);
        var pictureType = buffer[idx + 1];
        console.debug("Found APIC Picture Type " + pictureType + ", Mime Type " + mimeType);
        idx = buffer.indexOf(0, idx + 2);
        if (idx !== -1)
        {
            while (idx < buffer.length - 1 && buffer[idx] === 0)
            {
                ++idx;
            }

            var picBuffer = buffer.slice(idx);
            if (isPictureValid(picBuffer))
            {
                return { "mimeType": mimeType, "data": picBuffer.toString("binary") };
            }
            else
            {
                return null;
            }
        }
        else
        {
            return null;
        }
    }

    /* Returns if the given picture buffer is valid.
     */
    function isPictureValid(buffer)
    {
        if (buffer.length === 0)
        {
            return false;
        }
        else if (buffer.length < 4)
        {
            return false;
        }
        else if (buffer.slice(1, 4) === "PNG")
        {
            // PNG
            return true;
        }
        else if (buffer.slice(0, 16).indexOf("JFIF") !== -1)
        {
            // JPG
            return true;
        }
        else
        {
            return false;
        }
    }

    var params = { };
    switch (rev)
    {
    case 2:
        params.keyLength = 3;
        params.sizeLength = 3;
        params.syncSafe = false;
        params.hasFlags = false;
        params.flagCompressed = 0;
        params.flagEncrypted = 0;
        params.flagInGroup = 0;
        params.encodings = [];
        break;
    case 3:
        params.keyLength = 4;
        params.sizeLength = 4;
        params.syncSafe = false;
        params.hasFlags = true;
        params.flagCompressed = 0x0080;
        params.flagEncrypted = 0x0040;
        params.flagInGroup = 0x0020;
        params.encodings = ["binary" /*latin1*/, "utf16le", "utf16be", "utf8"];
        break;
    case 4:
        params.keyLength = 4;
        params.sizeLength = 4;
        params.syncSafe = true;
        params.hasFlags = true;
        params.flagCompressed = 0x0008;
        params.flagEncrypted = 0x0004;
        params.flagInGroup = 0x0002;
        params.encodings = ["binary" /*latin1*/, "utf16le", "utf16be", "utf8"];
        break;
    default:
        callback("Unknown revision");
        return;
    }


    readTagSoup(fd, function (err, buffer)
    {
        if (err)
        {
            resultCallback(err);
            return;
        }

        parseTagSoup(buffer, params, tags, function ()
        {
            resultCallback(null);
        });
    });
}

exports.Tags = function (file)
{
    var that = this;
    var m_file = file;
    var m_tags = [];

    that.keys = function ()
    {
        return Object.keys(m_tags);
    };

    that.get = function (key)
    {
        return m_tags[key] || "";
    };

    that.has = function (key)
    {
        return m_tags[key] !== undefined;
    };

    that.read = function (callback)
    {
        modFs.open(m_file, "r", function (err, fd)
        {
            if (err)
            {
                callback(err);
                return;
            }

            function closeCallback(err)
            {
                modFs.close(fd, function (closeErr)
                {
                    callback(err | closeErr);
                });
            }

            // read Tag Type, Version Major, Version Minor
            var buffer = new Buffer(5);
            modFs.read(fd, buffer, 0, buffer.length, 0, function (err, bytesRead, buffer)
            {
                if (err)
                {
                    callback(err);
                    return;
                }

                var tagType = buffer.slice(0, 3).toString("ascii");
                var major = buffer[3];
                var minor = buffer[4];

                /*
                if (tagType === "Ogg")
                {
                    console.debug("Detected Ogg");
                    parseVorbis(fd, m_tags, closeCallback);
                }
                else if (tagType === "fLa")
                {
                    console.debug("Detected FLAC");
                    parseVorbis(fd, m_tags, closeCallback);
                }
                */
                if (tagType === "ID3")
                {
                    console.debug("Detected ID3");
                    parseId3v2(fd, major, m_tags, closeCallback);
                }
                else
                {
                    console.debug("probably ID3v1");
                    parseId3v1(fd, m_tags, closeCallback);
                }
            });
        });
    };

};
