"use strict";

(function ()
{
    function openPage()
    {
        var page = new sh.Page("Administration", "");
        page.setSwipeBack(function () { page.pop(); });
        page.addToHeaderLeft(new sh.IconButton("sh-icon-back", function () { page.pop(); }));
        var listView = new sh.ListView();
        page.add(listView);
        
        var item = new sh.ListItem("Users", "", function ()
        {
            openUsersPage();
        });
        item.setIcon("/::res/icons/face.png");
        listView.add(item);
        
        item = new sh.ListItem("Statistics", "", function ()
        {
            ui.showError("Statistics are not yet available.");
        });
        item.setIcon("/::res/file-icons/text.png");
        listView.add(item);

        page.push();
    }

    function openUsersPage()
    {
        var page = new sh.Page("Users", "");
        page.setSwipeBack(function () { page.pop(); });
        page.addToHeaderLeft(new sh.IconButton("sh-icon-back", function () { page.pop(); }));
        page.addToHeaderRight(new sh.IconButton("sh-icon-add-user", function ()
        {
            showCreateUserDialog();
        }));

        var listView = new sh.ListView();
        page.add(listView);

        page.push();

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
                var item = new sh.ListItem(item.name, item.home + " (" + item.permissions.join(" ") + ")", function ()
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
                listView.add(item);
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
            sh.pagePop();
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
            sh.pagePop();
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
})();
