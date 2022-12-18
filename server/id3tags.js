"use strict";

const modZlib = require("zlib");

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

function fromAscii(s)
{
    return new Uint8Array(s.split("").map(c => c.charCodeAt(0)));
}

function binaryString(buf)
{
    return String.fromCharCode.apply(null, buf);
}

function bufferCompare(buf1, buf2)
{
    const l = Math.min(buf1.length, buf2.length);
    for (let i = 0; i < l; ++i)
    {
        if (buf1[i] !== buf2[i])
        {
            return false;
        }
    }
    return true;
}

function bufferConcat(buf1, buf2)
{
    const result = new Uint8Array(buf1.length + buf2.length);
    let i = 0;
    buf1.forEach(c => { result[i] = c; ++i; });
    buf2.forEach(c => { result[i] = c; ++i; });
    return result;
}

async function readBytes(fileObj, offset, size)
{
    if (offset === null)
    {
        // read from current position
        const bytes = new Uint8Array(await fileObj.file.slice(fileObj.offset, fileObj.offset + size).arrayBuffer());
        fileObj.position += size;
        return bytes;
    }
    else
    {
        return new Uint8Array(await fileObj.file.slice(offset, offset + size).arrayBuffer());
    }
}

async function parseVorbis(fileObj, tags)
{
    /* Checks the type of tags, Ogg Vorbis or FLAC, and return the type and
     * tags offset.
     */
    async function getType(fileObj)
    {
        let buffer = await readBytes(fileObj, 0, 4);
        if (binaryString(buffer).indexOf("fLaC") !== -1)
        {
            // it's FLAC
            return ["flac", 4];
        }
        else
        {
            buffer = await readBytes(0, 1024);
            const pos = binaryString(buffer).indexOf("vorbis");
            if (pos !== -1)
            {
                // it's Ogg Vorbis
                return ["vorbis", pos + 7];
            }
        }

        // nothing found
        return ["", 0];
    }

    /* Reads the tag soup of the given type and returns an array of data blocks.
     */
    async function readTagSoup(fileObj, type, offset)
    {
        if (type === "flac")
        {
            return await readFlacTagSoup(fileObj, offset);
        }
        else if (type === "vorbis")
        {
            return await readVorbisTagSoup(fileObj, offset);
        }
        else
        {
            return [];
        }
    }

    /* Reads the Ogg Vorbis tag soup and returns an array of data blocks.
     */
    async function readVorbisTagSoup(fileObj, offset)
    {
        let soup = new Uint8Array();

        async function fillSoup(offset)
        {
            const buffer = await readBytes(fileObj, offset, 512);
            soup = bufferConcat(soup, buffer);

            const pos = binaryString(soup).indexOf("vorbis");
            if (pos !== -1)
            {
                return [["COMMENT", soup.slice(0, pos)]];
            }
            else if (soup.length < 5120)
            {
                return await fillSoup(offset + 512);
            }
            else
            {
                return [];
            }
        }

        return await fillSoup(offset);
    }
   
    /* Reads the FLAC tag soup and returns an array of data blocks.
     */
    async function readFlacTagSoup(fileObj, offset)
    {
        const blocks = [];

        async function readBlock(offset)
        {
            let buffer = await readBytes(fileObj, offset, 4);

            const blockType = buffer[0];
            const size = (buffer[1] << 16) +
                         (buffer[2] << 8) +
                         buffer[3];

            buffer = await readBytes(fileObj, offset + 4, size);
            return [blockType, buffer];
        }

        async function findCommentBlock(offset)
        {
            const [blockType, buffer] = await readBlock(offset);
            console.log("FLAC BLOCK TYPE " + (blockType & 127));

            if ((blockType & 127) === 4)
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
                return await findCommentBlock(offset + 4 + buffer.length);
            }
            else
            {
                // look no further, this was the last metadata block
                return blocks;
            }
        }

        return await findCommentBlock(offset);
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
        let offset = 0;
        const vendorLength = soup[offset] +
                             (soup[offset + 1] << 8) +
                             (soup[offset + 2] << 16) +
                             (soup[offset + 3] << 24);
        //console.log("vendor length: " + vendorLength);
        offset += 4 + vendorLength;

        const commentsCount = soup[offset] + 
                              (soup[offset + 1] << 8) +
                              (soup[offset + 2] << 16) +
                              (soup[offset + 3] << 24);
        //console.log("number of comments: " + commentsCount);
        offset += 4;


        let count = 0;
        while (count < commentsCount && offset < soup.length)
        {
            const entrySize = soup[offset] +
                              (soup[offset + 1] << 8) +
                              (soup[offset + 2] << 16) +
                              (soup[offset + 3] << 24);
            offset += 4;
            //console.log("size: " + entrySize + ", offset: " + offset + ", total: " + soup.length);
            //console.log(soup.slice(offset, offset + entrySize).toString("binary"));

            const entry = soup.slice(offset, offset + entrySize);
            const equalsPos = entry.indexOf(fromAscii("=")[0]);
            if (equalsPos !== -1)
            {
                const keySize = equalsPos;
                const valueSize = entrySize - keySize - 1;

                let key = binaryString(entry.slice(0, keySize));
                key = TAGS_MAP[key] || key;
                const value = binaryString(entry.slice(keySize + 1, keySize + 1 + valueSize));
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
        const type = soup[3];
        //console.log("Picture type: " + type);

        if (type !== 0 && type !== 3)
        {
            return;
        }

        let offset = 4;
        const mimeLength = (soup[offset] << 24) +
                           (soup[offset + 1] << 16) +
                           (soup[offset + 2] << 8) +
                           soup[offset + 3];
        const mimeType = binaryString(soup.slice(offset + 4, offset + 4 + mimeLength));
        //console.log("Picture MIME type: " + mimeType);
        offset += 4 + mimeLength;

        const descriptionLength = (soup[offset] << 24) +
                                  (soup[offset + 1] << 16) +
                                  (soup[offset + 2] << 8) +
                                  soup[offset + 3];
        const description = binaryString(soup.slice(offset + 4, offset + 4 + descriptionLength));
        //console.log("Picture description: " + description);

        offset += 4 + 16;

        const dataLength = (soup[offset] << 24) +
                           (soup[offset + 1] << 16) +
                           (soup[offset + 2] << 8) +
                           soup[offset + 3];
        const picBuffer = soup.slice(offset + 4, offset + 4 + dataLength);

        tags["PICTURE"] = { "mimeType": mimeType, "data": binaryString(picBuffer) };
    }

    const [type, offset] = await getType(fileObj);
    const blocks = await readTagSoup(fileObj, type, offset);

    blocks.forEach(item =>
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
}

async function parseId3v1(fileObj, tags)
{
    // read the last 128 bytes
    const buffer = await readBytes(fileObj, fileObj.size - 128, 128);

    if (! bufferCompare(buffer.slice(0, 3), fromAscii("TAG")))
    {
        // this is not ID3
        return;
    }

    tags["TITLE"] = binaryString(buffer.slice(3, 33));
    tags["ARTIST"] = binaryString(buffer.slice(33, 63));
    tags["ALBUM"] = binaryString(buffer.slice(63, 93));
    tags["YEAR"] = binaryString(buffer.slice(93, 67));

    if (buffer[125] === 0 || buffer[126] !== 0)
    {
        // ID3v1.1
        tags["COMMENT"] = binaryString(buffer.slice(97, 125));
        tags["TRACKNUMBER"] = buffer[126];
    }
    else
    {
        // ID3v1
        tags["COMMENT"] = binaryString(buffer.slice(97, 127));
    }

    const genre = buffer[127];
    tags["GENRE"] = genre < GENRES.length ? GENRES[genre]
                                          : "<Unknown>";
}

async function parseId3v2(fileObj, rev, tags)
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
    async function readTagSoup(fileObj)
    {
        let buffer = await readBytes(fileObj, 0, 10);

        const major = buffer[3];
        const rev = buffer[4];
        const flags = buffer[5];

        const size = (buffer[6] << 21) +
                     (buffer[7] << 14) +
                     (buffer[8] << 7) +
                     buffer[9];

        console.debug("Major " + major + " rev " + rev + " flags " + flags +
                        " size " + size);

        // don't continue with empty tags
        if (size < 10)
        {
            return null;
        }

        async function readData(fileObj, size)
        {
            console.debug("Reading tag data: " + size + " bytes");
            return await readBytes(fileObj, 10, size);
        }

        if (flags & ID3_FLAG_EXTENDED_HEADER)
        {
            buffer = await readBytes(fileObj, null, 4);

            const extSize = (buffer[0] << 21) +
                            (buffer[1] << 14) +
                            (buffer[2] << 7) +
                            buffer[3];
            if (extSize > 4)
            {
                buffer = await readBytes(fileObj, null, extSize - 4);
                return await readData(fileObj, size - 10);
            }
            else
            {
                return await readData(fileObj, size - 10);
            }
        }
        else
        {
            return await readData(fileObj, size - 10);
        }
    }

    /* Parses the ID3v2 tag soup.
     */
    function parseTagSoup(buffer, params, tags, callback)
    {
        let pos = 0;
        while (true)
        {
            const [key, value, newPos] = parseFrame(buffer, pos, params);
            pos = newPos;

            if (! key)
            {
                break;
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
        }
    }

    /* Parses a ID3v2 frame.
     */
    function parseFrame(buffer, pos, params)
    {
        if (pos > buffer.length - 10 || (buffer[pos] === 0 && buffer[pos + 1] === 0))
        {
            return ["", "", pos];
        }

        let key = binaryString(buffer.slice(pos, pos + params.keyLength));
        console.log("Mapping tag " + key + " -> " + TAGS_MAP[key]);
        key = TAGS_MAP[key] || key;
        pos += params.keyLength;

        let valueSize = 0;
        if (params.syncSafe)
        {
            valueSize = (buffer[pos] << 21) +
                        (buffer[pos + 1] << 14) +
                        (buffer[pos + 2] << 7) +
                        buffer[pos + 3];
        }
        else
        {
            for (let i = 0; i < params.sizeLength; ++i)
            {
                const b = buffer[pos + i];
                valueSize = (valueSize << 8) + b;
            }
        }

        if (valueSize > 0xffffff)
        {
            return ["", "", pos];
        }

        pos += params.sizeLength;

        let flags = 0;
        if (params.hasFlags)
        {
            flags = (buffer[pos] << 8) + buffer[pos + 1];
            pos += 2;
        }

        let value = "";
        const valueBuffer = buffer.slice(pos, pos + valueSize);
        
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
            let encoding = params.encodings[valueBuffer[0]];
            console.log("ENCODING: " + encoding);

            value = (new TextDecoder(encoding)).decode(valueBuffer.slice(1));
            if (value.charCodeAt(value.length - 1) === 0)
            {
                value = value.substring(0, value.length - 1);
            }
        }
        else
        {
            value = binaryString(valueBuffer);
        }

        pos += valueSize;

        return [key, value, pos];
    }

    /* Parses APIC data.
     */
    function parseApic(buffer, params)
    {
        let idx = 0;
        const textEncoding = buffer[idx];
        ++idx;
        let imageFormat = "";
        if (params.fullMimeType)
        {
            const end = buffer.indexOf(0, idx);
            imageFormat = binaryString(buffer.slice(idx, end));
            idx = end + 1;
        }
        else
        {
            imageFormat = binaryString(buffer.slice(idx, idx + 3));
            idx += 3;
        }
        const pictureType = buffer[idx];
        ++idx;
        
        idx = buffer.indexOf(0, idx);

        if (idx === -1)
        {
            return null;
        }

        if (buffer[idx] === 0)
        {
            ++idx;
        }
        
        const picBuffer = buffer.slice(idx);
        console.log("pic: " + idx + ", " + picBuffer[0]);
        console.log("format: " + imageFormat);
        if (isPictureValid(picBuffer))
        {
            return { "mimeType": imageFormat, "data": picBuffer };
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
        else if (binaryString(buffer.slice(1, 4)).indexOf("PNG") !== -1)
        {
            // PNG
            return true;
        }
        else if (binaryString(buffer.slice(0, 16)).indexOf("JFIF") !== -1)
        {
            // JPEG/JFIF
            return true;
        }
        else if (binaryString(buffer.slice(0, 16)).indexOf("Exif") !== -1)
        {
            // JPEG/Exif
            return true;
        }
        else
        {
            return false;
        }
    }

    const params = { };
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
        params.encodings = ["latin1", "utf-16le"];
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
        params.encodings = ["latin1", "utf-16le", "utf-16be", "utf-8"];
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
        params.encodings = ["latin1", "utf-16le", "utf-16be", "utf-8"];
        params.fullMimeType = true;
        break;
    default:
        return "Unknown revision";
    }

    const buffer = await readTagSoup(fileObj);
    await parseTagSoup(buffer, params, tags);
    return null;
}

async function readTags(file)
{
    const tags = { };

    const fileObj = {
        file: file,
        position: 0
    };

    const buffer = await readBytes(fileObj, 0, 5);

    const tagType = buffer.slice(0, 3);
    const major = buffer[3];
    const minor = buffer[4];

    if (bufferCompare(tagType, fromAscii("Ogg")))
    {
        console.debug("Detected Ogg");
        await parseVorbis(fileObj, tags);
    }
    else if (bufferCompare(tagType, fromAscii("fLa")))
    {
        console.debug("Detected FLAC");
        await parseVorbis(fileObj, tags);
    }
    else if (bufferCompare(tagType, fromAscii("ID3")))
    {
        console.debug("Detected ID3");
        await parseId3v2(fileObj, major, tags);
    }
    else
    {
        console.debug("probably ID3v1");
        await parseId3v1(fileObj, tags);
    }

    return tags;
}
exports.readTags = readTags;
