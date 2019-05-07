"use strict";

var requireShared = require.main.exports.requireShared;

const modZlib = require("zlib");

const modVfs = requireShared("vfs");

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
    modVfs.read(fd, buffer, 0, size, offset, function (err, bytesRead, buffer)
    {
        callback(err, buffer);
    });
}

function parseVorbis(fd, tags, resultCallback)
{
    /* Checks the type of tags, Ogg Vorbis or FLAC, and invokes the callback
     * with type and tags offset.
     */
    function checkType(fd, callback)
    {
        readBytes(fd, 0, 4, function (err, buffer)
        {
            if (err)
            {
                callback("", 0);
                return;
            }

            if (buffer.indexOf("fLaC") !== -1)
            {
                // it's FLAC
                callback("flac", 4);
            }
            else
            {
                readBytes(fd, 0, 1024, function (err, buffer)
                {
                        var marker = Buffer.from(new Uint8Array(
                            [3]
                            .concat(['v', 'o', 'r', 'b', 'i', 's']
                                    .map(function (c) { return c.charCodeAt(0); }))
                        ));

                        var pos = buffer.indexOf(marker);
                        if (pos !== -1)
                        {
                            // it's Ogg Vorbis
                            callback("vorbis", pos + 7);
                        }
                        else
                        {
                            // nothing found
                            callback("", 0);
                        }
                });
            }
        });
    }

    /* Reads the tag soup of the given type and invokes the callback with
     * an array of data blocks.
     */
    function readTagSoup(fd, type, offset, callback)
    {
        if (type === "flac")
        {
            readFlacTagSoup(fd, offset, callback);
        }
        else if (type === "vorbis")
        {
            readVorbisTagSoup(fd, offset, callback);
        }
        else
        {
            callback([]);
        }
    }

    /* Reads the Ogg Vorbis tag soup and invokes the callback with an
     * array of data blocks.
     */
    function readVorbisTagSoup(fd, offset, callback)
    {
        var soup = Buffer.from("");
        var marker = Buffer.from(new Uint8Array(
            [5]
            .concat(['v', 'o', 'r', 'b', 'i', 's']
                    .map(function (c) {return c.charCodeAt(0); }))
        ));

        function fillSoup(offset)
        {
            readBytes(fd, offset, 512, function (err, buffer)
            {
                if (err)
                {
                    callback([]);
                    return;
                }
    
                soup = Buffer.concat([soup, buffer]);

                var pos = soup.indexOf(marker, 0, "binary");
                if (pos !== -1)
                {
                    callback([["COMMENT", soup.slice(0, pos)]]);
                }
                else if (soup.length < 5120)
                {
                    fillSoup(offset + 512);
                }
                else
                {
                    callback([]);
                }
            });
        }

        fillSoup(offset);
    }

    /* Reads the FLAC tag soup and invokes the callback with an
     * array of data blocks.
     */
    function readFlacTagSoup(fd, offset, callback)
    {
        var blocks = [];

        function readBlock(offset, callback)
        {
            readBytes(fd, offset, 4, function (err, buffer)
            {
                if (err)
                {
                    callback(0, null);
                    return;
                }

                var blockType = buffer[0];
                var size = (buffer[1] << 16) +
                           (buffer[2] << 8) +
                           buffer[3];

                readBytes(fd, offset + 4, size, function (err, buffer)
                {
                    if (err)
                    {
                        callback(0, null);
                        return;
                    }
                    
                    callback(blockType, buffer);
                });
            });
        }

        function findCommentBlock(offset, callback)
        {
            readBlock(offset, function (blockType, buffer)
            {
                console.log("FLAC BLOCK TYPE " + (blockType & 127));
                if (! buffer)
                {
                    callback(blocks);
                }
                else if ((blockType & 127) === 4)
                {
                    // VORBIS_COMMENT
                    blocks.push(["COMMENT", buffer]);
                }
                else if ((blockType & 127) === 6)
                {
                    // PICTURE
                    blocks.push(["PICTURE", buffer]);
                }
                
                if (blockType < 128)
                {
                    // look further
                    findCommentBlock(offset + 4 + buffer.length, callback);
                }
                else
                {
                    // look no further, this was the last metadata block
                    callback(blocks);
                }
            });
        }

        findCommentBlock(offset, callback);
    }

    /* Parses the given tag soup.
     */
    function parseTagSoup(soup, tags)
    {
        /*
        1) [vendor_length] = read an unsigned integer of 32 bits
        2) [vendor_string] = read a UTF-8 vector as [vendor_length] octets
        3) [user_comment_list_length] = read an unsigned integer of 32 bits
        4) iterate [user_comment_list_length] times {
            5) [length] = read an unsigned integer of 32 bits
            6) this iteration's user comment = read a UTF-8 vector as [length] octets
           }
        7) [framing_bit] = read a single bit as boolean
        8) if ( [framing_bit] unset or end of packet ) then ERROR
        9) done.

        [http://www.xiph.org/vorbis/doc/v-comment.html]
        */

        if (! soup)
        {
            return;
        }
        //console.log("Soup: " + soup.toString("utf-8"));
        //console.log(soup);

        // iterate over entries
        var offset = 0;
        var vendorLength = soup[offset] +
                           (soup[offset + 1] << 8) +
                           (soup[offset + 2] << 16) +
                           (soup[offset + 3] << 24);
        //console.log("vendor length: " + vendorLength);
        offset += 4 + vendorLength;

        var commentsCount = soup[offset] + 
                            (soup[offset + 1] << 8) +
                            (soup[offset + 2] << 16) +
                            (soup[offset + 3] << 24);
        //console.log("number of comments: " + commentsCount);
        offset += 4;


        var count = 0;
        while (count < commentsCount && offset < soup.length)
        {
            var entrySize = soup[offset] +
                            (soup[offset + 1] << 8) +
                            (soup[offset + 2] << 16) +
                            (soup[offset + 3] << 24);
            offset += 4;
            //console.log("size: " + entrySize + ", offset: " + offset + ", total: " + soup.length);
            //console.log(soup.slice(offset, offset + entrySize).toString("binary"));

            var entry = soup.slice(offset, offset + entrySize);
            var equalsPos = entry.indexOf("=");
            if (equalsPos !== -1)
            {
                var keySize = equalsPos;
                var valueSize = entrySize - keySize - 1;

                var key = entry.slice(0, keySize).toString("ascii");
                key = TAGS_MAP[key] || key;
                var value = entry.slice(keySize + 1, keySize + 1 + valueSize).toString("binary");
                tags[key] = value;
                //console.log(key + " = " + value);
            }

            offset += entrySize;
            ++count;
        }
    }

    /* Parses a FLAC picture block.
     */
    function parsePicture(soup, tags)
    {
        var type = soup[3];
        //console.log("Picture type: " + type);

        if (type !== 0 && type !== 3)
        {
            return;
        }

        var offset = 4;
        var mimeLength = (soup[offset] << 24) +
                         (soup[offset + 1] << 16) +
                         (soup[offset + 2] << 8) +
                         soup[offset + 3];
        var mimeType = soup.slice(offset + 4, offset + 4 + mimeLength);
        //console.log("Picture MIME type: " + mimeType);
        offset += 4 + mimeLength;

        var descriptionLength = (soup[offset] << 24) +
                                (soup[offset + 1] << 16) +
                                (soup[offset + 2] << 8) +
                                soup[offset + 3];
        var description = soup.slice(offset + 4, offset + 4 + descriptionLength);
        //console.log("Picture description: " + description);

        offset += 4 + 16;

        var dataLength = (soup[offset] << 24) +
                         (soup[offset + 1] << 16) +
                         (soup[offset + 2] << 8) +
                         soup[offset + 3];
        var picBuffer = soup.slice(offset + 4, offset + 4 + dataLength);

        tags["PICTURE"] = { "mimeType": mimeType, "data": picBuffer.toString("binary") };
    }


    checkType(fd, function (type, offset)
    {
        console.log("type: " + type + " offset: " + offset);
        readTagSoup(fd, type, offset, function (blocks)
        {
            blocks.forEach(function (item)
            {
                switch (item[0])
                {
                case "COMMENT":
                    parseTagSoup(item[1], tags);
                    break;
                case "PICTURE":
                    parsePicture(item[1], tags);
                    break;
                }
            });
            resultCallback(null);
        });
    });
}

function parseId3v1(fd, tags, resultCallback)
{
    /* Reads the ID3v1 tag soup.
     */
    function readTagSoup(fd, callback)
    {
        // read the last 128 bytes
        modVfs.fstat(fd, function (err, stats)
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
            return;
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
        resultCallback();
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
                    console.debug("Tag " + key + " = " + value + " <" + value.length + " bytes>");
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
        console.log("Mapping tag " + key + " -> " + TAGS_MAP[key]);
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
        var valueBuffer = buffer.slice(pos, pos + valueSize);
        
        // support compressed tags
        if (flags & params.flagCompressed && key !== "PICTURE")
        {
            valueBuffer = modZlib.inflateSync(valueBuffer.slice(4));
        }

        if (key === "PICTURE")
        {
            value = parseApic(valueBuffer, params);
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
            if (value.charCodeAt(value.length - 1) === 0)
            {
                value = value.substr(0, value.length - 1);
            }
        }
        else
        {
            value = valueBuffer.toString("binary");
        }

        pos += valueSize;

        callback(key, value, pos);
    }

    /* Parses APIC data.
     */
    function parseApic(buffer, params)
    {
        var idx = 0;
        var textEncoding = buffer[idx];
        ++idx;
        var imageFormat = "";
        if (params.fullMimeType)
        {
            var end = buffer.indexOf(0, idx);
            imageFormat = buffer.slice(idx, end);
            idx = end + 1;
        }
        else
        {
            imageFormat = buffer.slice(idx, idx + 3);
            idx += 3;
        }
        var pictureType = buffer[idx];
        ++idx;
        var idx = buffer.indexOf(0, idx);

        if (idx === -1)
        {
            return null;
        }

        if (buffer[idx] === 0)
        {
            ++idx;
        }
        
        //console.log(buffer);
        var picBuffer = buffer.slice(idx);
        //console.log("pic: " + idx + ", " + picBuffer[0]);
        //console.log("format: " + imageFormat);
        if (isPictureValid(picBuffer))
        {
            return { "mimeType": imageFormat, "data": picBuffer.toString("binary") };
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
        else if (buffer.slice(1, 4).indexOf("PNG") !== -1)
        {
            // PNG
            return true;
        }
        else if (buffer.slice(0, 16).indexOf("JFIF") !== -1)
        {
            // JPEG/JFIF
            return true;
        }
        else if (buffer.slice(0, 16).indexOf("Exif") !== -1)
        {
            // JPEG/Exif
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
        params.encodings = ["binary" /*latin1*/, "utf16le"];
        params.fullMimeType = false;
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
        params.fullMimeType = true;
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
        params.fullMimeType = true;
        break;
    default:
        resultCallback("Unknown revision");
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
        modVfs.open(m_file, "r", function (err, fd)
        {
            if (err)
            {
                callback(err);
                return;
            }

            function closeCallback(err)
            {
                modVfs.close(fd, function (closeErr)
                {
                    callback(err | closeErr);
                });
            }

            // read Tag Type, Version Major, Version Minor
            var buffer = new Buffer(5);
            modVfs.read(fd, buffer, 0, buffer.length, 0, function (err, bytesRead, buffer)
            {
                if (err)
                {
                    callback(err);
                    return;
                }

                var tagType = buffer.slice(0, 3).toString("ascii");
                var major = buffer[3];
                var minor = buffer[4];

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
                else if (tagType === "ID3")
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
