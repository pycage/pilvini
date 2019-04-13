(function ()
{
    var dlg = sh.element(sh.Dialog).title("Tip of the Day")
    .add(
        sh.element(sh.Label).text("Did you know..?")
    )
    .add(
        sh.element(sh.Label).text("You can access Pilvini via WebDAV, too.")
    )
    .button(
        sh.element(sh.Button).text("Ok, got it!").isDefault(true)
        .action(function () { dlg.close_(); })
    );
    dlg.show_();
})();
