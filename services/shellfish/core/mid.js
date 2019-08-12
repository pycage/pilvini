"use strict";

exports.__id = "shellfish/mid";

const mods = [
    __dirname + "/mid/tools.js",
    __dirname + "/mid/box.js",
    __dirname + "/mid/busypopup.js",
    __dirname + "/mid/button.js",
    __dirname + "/mid/dialog.js",
    __dirname + "/mid/gap.js",
    __dirname + "/mid/griditem.js",
    __dirname + "/mid/gridview.js",
    __dirname + "/mid/headline.js",
    __dirname + "/mid/image.js",
    __dirname + "/mid/label.js",
    __dirname + "/mid/labeled.js",
    __dirname + "/mid/listitem.js",
    __dirname + "/mid/listmodel.js",
    __dirname + "/mid/listmodelview.js",
    __dirname + "/mid/listview.js",
    __dirname + "/mid/menu.js",
    __dirname + "/mid/menuitem.js",
    __dirname + "/mid/page.js",
    __dirname + "/mid/pageheader.js",
    __dirname + "/mid/popup.js",
    __dirname + "/mid/separator.js",
    __dirname + "/mid/submenu.js",
    __dirname + "/mid/switch.js",
    __dirname + "/mid/text.js",
    __dirname + "/mid/textinput.js",
    __dirname + "/mid/toolbar.js"
];

require(mods, function (tools)
{
    for (var i = 0; i < arguments.length; ++i)
    {
        exports.include(arguments[i]);
    }
});
