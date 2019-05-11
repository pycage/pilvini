"use strict";

const modPath = require("path");

exports.init = function (config)
{
    require.main.exports.registerResource("shellfish", modPath.join(__dirname, "shellfish"));
};