"use strict"

const modPath = require("path");

exports.init = function (config)
{
    require.main.exports.registerResource("shell-documents", modPath.join(__dirname, "shell-documents"));

    require.main.exports.registerShellExtension("/::res/shell-documents/markdown.js");
    require.main.exports.registerShellExtension("/::res/shell-documents/pdf.js");
    require.main.exports.registerShellExtension("/::res/shell-documents/text.js");
    require.main.exports.registerShellExtension("/::res/shell-documents/vcard.js");
};
