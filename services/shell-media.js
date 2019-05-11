"use strict"

const modPath = require("path");

exports.init = function (config)
{
    require.main.exports.registerResource("shell-media", modPath.join(__dirname, "shell-media"));

    require.main.exports.registerShellExtension("/::res/shell-media/audio.js");
    require.main.exports.registerShellExtension("/::res/shell-media/image.js");
    require.main.exports.registerShellExtension("/::res/shell-media/video.js");
};
