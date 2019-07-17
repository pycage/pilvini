"use strict";

const mods = [
    "/::res/shellfish/core/mid.js",
    "/::res/shellfish/core/high.js"
];
require(mods, function (mid, high)
{
    var dlg = high.element(mid.Dialog).title("Tip of the Day")
    .add(
        high.element(mid.Label).text("Did you know..?")
        )
        .add(
            high.element(mid.Label).text("You can access Pilvini via WebDAV, too.")
            )
            .button(
                high.element(mid.Button).text("Ok, got it!").isDefault(true)
                .action(function () { dlg.close_(); })
                );
                dlg.show_();
});
