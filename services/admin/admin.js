"use strict";

const mods = [
    "shellfish/low",
    "shellfish/mid",
    "shellfish/high",
    "shell/ui",
    "shell/files"
];

require(mods, function (low, mid, high, ui, files)
{
    function openPage()
    {
        var page = high.element(mid.Page)
        .onSwipeBack(function () { page.pop_(); })
        .header(
            high.element(mid.PageHeader).title("Administration")
            .left(
                high.element(mid.IconButton).icon("sh-icon-back")
                .onClicked(function () { page.pop_(); })
            )
        )
        .add(
            high.element(mid.ListView)
            .add(
                high.element(mid.ListItem)
                .icon("/::res/shell/icons/server.png")
                .title("Server")
                .onClicked(function () { openServerPage(); })
            )
            .add(
                high.element(mid.ListItem)
                .icon("/::res/shell/icons/face.png")
                .title("Users")
                .onClicked(function () { openUsersPage(); })
            )
            .add(
                high.element(mid.ListItem)
                .icon("/::res/shell/file-icons/text.png")
                .title("Statistics")
                .onClicked(function () { ui.showError("Statistics are not yet available."); })
            )
        );
        page.push_();
    }

    function openServerPage()
    {
        var listenAddress = high.binding("0.0.0.0");
        var port = high.binding(8000);
        var useSsl = high.binding(false);
        var contentRoot = high.binding("/");

        var dlg = high.element(mid.Dialog).title("Server Settings")
        .button(
            high.element(mid.Button).text("Save and Restart")
            .onClicked(function ()
            {
                var config = {
                    "listen": dlg.find("listen").get().text,
                    "port": Number.parseInt(dlg.find("port").get().text),
                    "use_ssl": dlg.find("ssl").get().checked,
                    "root": dlg.find("root").get().text
                };
                console.log(JSON.stringify(config));
                configureServer(config);
                dlg.close_();
            })
        )
        .button(
            high.element(mid.Button).text("Cancel")
            .onClicked(function ()
            {
                dlg.close_();
            })
        )
        .add(
            high.element(mid.Labeled).text("Listen Address:")
            .add(
                high.element(mid.TextInput).id("listen").text(listenAddress).focus(true)
            )
        )
        .add(
            high.element(mid.Labeled).text("Port:")
            .add(
                high.element(mid.TextInput).id("port")
                .text(high.predicate([port], function () { return "" + port.value(); }))
            )
        )
        .add(
            high.element(mid.Labeled).text("Use SSL:")
            .add(
                high.element(mid.Switch).id("ssl").checked(useSsl)
            )
        )
        .add(
            high.element(mid.Labeled).text("Content Root:")
            .add(
                high.element(mid.TextInput).id("root").text(contentRoot)
            )
        )
        dlg.show_();

        var busyIndicator = high.element(mid.BusyPopup).text("Loading");
        busyIndicator.show_();

        $.ajax({
            type: "GET",
            url: "/::admin/server",
            dataType: "json",
            beforeSend: function (xhr)
            {
                xhr.overrideMimeType("application/json");
            }
        })
        .done(function (data, status, xhr)
        {
            listenAddress.assign(data.listen);
            port.assign(data.port);
            useSsl.assign(data.use_ssl);
            contentRoot.assign(data.root);
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Could not load server configuration: " + err);
        })
        .always(function ()
        {
            busyIndicator.hide_();
        });
    }

    function openUsersPage()
    {
        var page = high.element(mid.Page)
        .onSwipeBack(function () { page.pop_(); })
        .header(
            high.element(mid.PageHeader).title("Users")
            .left(
                high.element(mid.IconButton).icon("sh-icon-back")
                .onClicked(function () { page.pop_(); })
            )
            .right(
                high.element(mid.IconButton).icon("sh-icon-add-user")
                .onClicked(function () { showCreateUserDialog(); })
            )
        )
        .add(
            high.element(mid.ListView).id("listview")
        );
        page.push_();

        var busyIndicator = high.element(mid.BusyPopup).text("Loading");
        busyIndicator.show_();

        $.ajax({
            type: "GET",
            url: "/::admin/users",
            dataType: "json",
            beforeSend: function (xhr)
            {
                xhr.overrideMimeType("application/json");
            }
        })
        .done(function (data, status, xhr)
        {
            data.users.forEach(function (item)
            {
                var name = item.name;

                page.find("listview")
                .add(
                    high.element(mid.ListItem)
                    .icon("/::res/shell/icons/face.png")
                    .title(item.name)
                    .subtitle(item.home + " (" + item.permissions.join(" ") + ")")
                    .action(["sh-icon-trashcan", function ()
                    {
                        ui.showQuestion("Delete User", "Delete user " + name + "?", function ()
                        {
                            deleteUser(name);
                        },
                        function () { });
                    }])
                );
            });
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Failed to retrieve users: " + err);
        })
        .always(function ()
        {
            busyIndicator.hide_();
        });
    }

    function showCreateUserDialog()
    {
        var dlg = high.element(mid.Dialog).title("Create User")
        .add(
            high.element(mid.Label).text("Create a new user.")
        )
        .add(
            high.element(mid.Labeled).text("Name:")
            .add(
                high.element(mid.TextInput).id("name").text("user").focus(true)
            )
        )
        .add(
            high.element(mid.Labeled).text("Password:")
            .add(
                high.element(mid.TextInput).id("password")
            )
        )
        .add(
            high.element(mid.Labeled).text("Home:")
            .add(
                high.element(mid.TextInput).id("home").text(files.currentUri())
            )
        )
        .add(
            high.element(mid.Labeled).text("Create")
            .add(
                high.element(mid.Switch).id("mayCreate").checked(true)
            )
        )
        .add(
            high.element(mid.Labeled).text("Delete")
            .add(
                high.element(mid.Switch).id("mayDelete").checked(true)
            )
        )
        .add(
            high.element(mid.Labeled).text("Modify")
            .add(
                high.element(mid.Switch).id("mayModify").checked(true)
            )
        )
        .add(
            high.element(mid.Labeled).text("Share")
            .add(
                high.element(mid.Switch).id("mayShare").checked(false)
            )
        )
        .add(
            high.element(mid.Labeled).text("Administrator")
            .add(
                high.element(mid.Switch).id("mayAdmin").checked(false)
            )
        )
        .button(
            high.element(mid.Button).text("Create").isDefault(true)
            .action(function ()
           {
               dlg.close_();
               var permissions = [];
               if (dlg.find("mayCreate").get().checked) permissions.push("CREATE");
               if (dlg.find("mayDelete").get().checked) permissions.push("DELETE");
               if (dlg.find("mayModify").get().checked) permissions.push("MODIFY");
               if (dlg.find("mayShare").get().checked) permissions.push("SHARE");
               if (dlg.find("mayAdmin").get().checked) permissions.push("ADMIN");
               createUser(dlg.find("name").get().text,
                          dlg.find("password").get().text,
                          dlg.find("home").get().text,
                          permissions);
           })
        )
        .button(
            high.element(mid.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        );
        dlg.show_();
    }

    function configureServer(config)
    {
        var busyIndicator = high.element(mid.BusyPopup).text("Saving");
        busyIndicator.show_();

        $.ajax({
            type: "POST",
            url: "/::admin/configure-server",
            data: JSON.stringify(config)
        })
        .done(function (data, status, xhr)
        {
            window.location.reload();
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Could not configure server: " + err);
        })
        .always(function ()
        {
            busyIndicator.hide_();
        })
    }

    function createUser(name, password, home, permissions)
    {
        $.ajax({
            type: "POST",
            url: "/::admin/create-user",
            beforeSend: function(xhr)
            {
                xhr.setRequestHeader("x-pilvini-user", name);
                xhr.setRequestHeader("x-pilvini-password", password);
                xhr.setRequestHeader("x-pilvini-home", home);
                xhr.setRequestHeader("x-pilvini-permissions", permissions.join(" "));
            },
        })
        .done(function (data, status, xhr)
        {
            low.pagePop();
            openUsersPage();
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Could not create user: " + err);
        });
    }

    function deleteUser(name)
    {
        $.ajax({
            type: "POST",
            url: "/::admin/delete-user",
            beforeSend: function(xhr)
            {
                xhr.setRequestHeader("x-pilvini-user", name);
            },
        })
        .done(function (data, status, xhr)
        {
            low.pagePop();
            openUsersPage();
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Could not delete user: " + err);
        });
    }

    files.actionsMenu().find("tools-menu")
    .add(
        //high.element(mid.IconButton).icon("sh-icon-gear")
        high.element(mid.MenuItem).text("Administration")
        .visible(high.predicate([files.properties().permissions], function () { return files.properties().permissions.value().indexOf("ADMIN") !== -1; }))
        .onClicked(openPage)
    );
    /*
    .add(
        high.element(mid.MenuItem).text("User Agent")
        .visible(high.predicate([files.properties().permissions], function () { return files.properties().permissions.value().indexOf("ADMIN") !== -1; }))
        .onClicked(function ()
        {
            var dlg = high.element(mid.Dialog).title("User Agent")
            .add(
                high.element(mid.Label).text(navigator.userAgent)
            )
            .button(
                high.element(mid.Button).text("Ok")
                .action(function () { dlg.close_(); })
            );
            dlg.show_();
        })
    )
    */
});
