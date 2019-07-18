"use strict";

const mods = [
    "shellfish/mid",
    "shellfish/high"
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
