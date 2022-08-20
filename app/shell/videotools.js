function waitForPlayer(player)
{
    return new Promise((resolve, reject) =>
    {
        player.oncanplay = () =>
        {
            player.oncanplay = null;
            player.onerror = null;
            resolve();
        };

        player.onerror = err =>
        {
            player.oncanplay = null;
            player.onerror = null;
            reject(err);
        };
    });
};

function seek(player, position)
{
    return new Promise((resolve, reject) =>
    {
        player.currentTime = position;
        player.onseeked = () =>
        {
            player.onseeked = null;
            player.onerror = null;
            resolve();
        };
        player.onerror = err =>
        {
            player.onseeked = null;
            player.onerror = null;
            reject(err);
        };
    });
}

async function makeThumbnail(path)
{    
    const player = document.createElement("video");
    player.autoplay = true;
    player.muted = true;
    player.src = path;
    player.load();

    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 80;

    const ctx = canvas.getContext("2d");

    await waitForPlayer(player);
    await seek(player, player.duration * 0.2);

    const w = player.videoWidth;
    const h = player.videoHeight;

    // crop viewport
    const cw = Math.min(w, h);
    const ch = cw;
    const cx = (w - cw) / 2;
    const cy = (h - ch) / 2;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 80, 80);

    // capturing the image can go wrong and we don't want to receive a
    // broken thumbnail in these cases
    //  - Mobile Firefox does not allow capturing at all
    //  - Silk on Fire TV treats mp4 as copy-protected and captures all black
    //    (webm is fine, though)
    let blob = null;
    let error = null;
    try
    {
        ctx.drawImage(player, cx, cy, cw, ch, 0, 0, 80, 80);

        // check if we got a valid image, as some browsers silently give us a black screen
        // for copy-protection
        /*
        const buffer = ctx.getImageData(0, 0, 80, 1);    
        let allBlack = true;
        for (let i = 0; i < buffer.data.length; i += 4)
        {
            if (buffer.data[i] !== 0 || buffer.data[i + 1] !== 0 || buffer.data[i + 2] !== 0)
            {
                allBlack = false;
                break;
            }
        }

        if (allBlack)
        {
            throw "No content";
        }
        */

        // prettify

        ctx.fillStyle = "#666";
        ctx.fillRect(0, 0, 10, 80);
        ctx.fillRect(80 - 10, 0, 16, 80);

        ctx.fillStyle = "#fff";
        for (let y = 0; y < 80; y += 10)
        {
            ctx.fillRect(2, y + 3, 6, 4);
            ctx.fillRect(80 - 8, y + 3, 6, 4);
        }

        // get JPEG data
        const dataUrl = canvas.toDataURL("image/jpeg");
        const response = await fetch(dataUrl);
        blob = response.blob();
    }
    catch (err)
    {
        error = err;
    }

    player.src = "";
    player.load();
    player.remove();
    canvas.remove();

    if (error)
    {
        throw(error);
    }
    return blob;
}
exports.makeThumbnail = makeThumbnail;