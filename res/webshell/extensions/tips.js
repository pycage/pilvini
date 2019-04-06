(function ()
{
    var dlg = new sh.Dialog("Tip of the Day");
    dlg.add(new sh.Label("Did you know..?"));
    dlg.add(new sh.Label("You can access Pilvini via WebDAV, too."));
    dlg.addButton("Ok, got it!", function () { }, true);
    dlg.show();
})();
