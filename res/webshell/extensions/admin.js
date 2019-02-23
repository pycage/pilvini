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
        var dlg = ui.showDialog("Create User", "Create a new user.");

        var nameEntry = dlg.addTextEntry("Name:", "user");
        var passwordEntry = dlg.addTextEntry("Password:", "");
        var homeEntry = dlg.addTextEntry("Home:", currentUri());
        dlg.addLabel("Permissions:");
        var mayCreate = dlg.addSwitch("Create", true);
        var mayDelete = dlg.addSwitch("Delete", true);
        var mayModify = dlg.addSwitch("Modify", true);
        var mayShare = dlg.addSwitch("Share", false);
        var mayAdmin = dlg.addSwitch("Administrator", false);

        dlg.addButton("Create", function ()
        {
            var permissions = [];
            if (mayCreate.prop("checked")) permissions.push("CREATE");
            if (mayDelete.prop("checked")) permissions.push("DELETE");
            if (mayModify.prop("checked")) permissions.push("MODIFY");
            if (mayShare.prop("checked")) permissions.push("SHARE");
            if (mayAdmin.prop("checked")) permissions.push("ADMIN");
            createUser(nameEntry.val(), passwordEntry.val(), homeEntry.val(), permissions);
        }, true);
        dlg.addButton("Cancel");
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

    files.actionsMenu().addItem(new ui.MenuItem("", "Administration", function ()
    {
        openPage();
    }));
})();
