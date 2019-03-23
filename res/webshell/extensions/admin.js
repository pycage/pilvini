"use strict";

(function ()
{
    function openPage()
    {
        var page = ui.showPage("Administration");
        var listView = page.addListView();
    
        var item = ui.listItem("Users", "", function ()
        {
            openUsersPage();
        });
        item.setIcon("/::res/icons/face.png");
        listView.append(item);
    
        item = ui.listItem("Statistics", "", function ()
        {
            ui.showError("Statistics are not yet available.");
        });
        item.setIcon("/::res/file-icons/text.png");
        listView.append(item);
    }

    function openUsersPage()
    {
        var page = ui.showPage("Users");
        page.addIconButton("sh-icon-add-user", function ()
        {
            showCreateUserDialog();
        });
        var listView = page.addListView();

        var busyIndicator = ui.showBusyIndicator("Loading");

        $.ajax({
            type: "GET",
            url: "/::admin/users",
            dataType: "json"
        })
        .done(function (data, status, xhr)
        {
            data.users.forEach(function (item)
            {
                var name = item.name;
                var item = ui.listItem(item.name, item.home + " (" + item.permissions.join(" ") + ")", function ()
                {

                });
                item.setIcon("/::res/icons/face.png");
                item.setAction("sh-icon-trashcan", function ()
                {
                    ui.showQuestion("Delete User", "Delete user " + name + "?", function ()
                    {
                        deleteUser(name);
                    },
                    function () { });
                });
                listView.append(item);
            });
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Failed to retrieve users: " + err);
        })
        .always(function ()
        {
            busyIndicator.remove();
        });
    }

    function showCreateUserDialog()
    {
        var dlg = new sh.Dialog("Create User");
        dlg.add(new sh.Label("Create a new user."));

        var nameEntry = new sh.TextInput("user");
        var passwordEntry = new sh.TextInput("");
        var homeEntry = new sh.TextInput(files.currentUri());

        var mayCreate = new sh.Switch(true);
        var mayDelete = new sh.Switch(true);
        var mayModify = new sh.Switch(true);
        var mayShare = new sh.Switch(false);
        var mayAdmin = new sh.Switch(false);

        dlg.add(new sh.Labeled("Name:", nameEntry));
        dlg.add(new sh.Labeled("Password:", passwordEntry));
        dlg.add(new sh.Labeled("Home:", homeEntry));

        dlg.add(new sh.Label("Permissions:"));

        dlg.add(new sh.Labeled("Create", mayCreate));
        dlg.add(new sh.Labeled("Delete", mayDelete));
        dlg.add(new sh.Labeled("Modify", mayModify));
        dlg.add(new sh.Labeled("Share", mayShare));
        dlg.add(new sh.Labeled("Administrator", mayAdmin));

        dlg.addButton("Create", function ()
        {
            var permissions = [];
            if (mayCreate.checked()) permissions.push("CREATE");
            if (mayDelete.checked()) permissions.push("DELETE");
            if (mayModify.checked()) permissions.push("MODIFY");
            if (mayShare.checked()) permissions.push("SHARE");
            if (mayAdmin.checked()) permissions.push("ADMIN");
            createUser(nameEntry.value(), passwordEntry.value(), homeEntry.value(), permissions);
        }, true);
        dlg.addButton("Cancel");

        dlg.show();
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
            sh.pop();
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
            sh.pop();
            openUsersPage();
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Could not delete user: " + err);
        });
    }

    files.actionsMenu()
    .add(
        files.menu.item("Administration")
        .visible(files.predicates.permissions("ADMIN"))
        .action(openPage)
    );

    /*
    files.actionsMenu().addItem(new ui.MenuItem("", "Administration", function ()
    {
        openPage();
    }));
    */
})();
