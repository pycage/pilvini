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
        
        var item = new sh.ListItem();
        item.title = "Users";
        item.callback = function ()
        {
            openUsersPage();
        };
        item.icon = "/::res/icons/face.png";
        listView.add(item);
        
        item = new sh.ListItem();
        item.title = "Statistics";
        item.callback = function ()
        {
            ui.showError("Statistics are not yet available.");
        };
        item.icon = "/::res/file-icons/text.png";
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

        var busyIndicator = new sh.BusyPopup("Loading");
        busyIndicator.show();

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
                var listItem = new sh.ListItem();
                listItem.title = item.name;
                listItem.subtitle = item.home + " (" + item.permissions.join(" ") + ")";
                listItem.icon = "/::res/icons/face.png";
                listItem.action = ["sh-icon-trashcan", function ()
                {
                    ui.showQuestion("Delete User", "Delete user " + name + "?", function ()
                    {
                        deleteUser(name);
                    },
                    function () { });
                }];
                listView.add(listItem);
            });
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Failed to retrieve users: " + err);
        })
        .always(function ()
        {
            busyIndicator.hide();
        });
    }

    function showCreateUserDialog()
    {
        var dlg = new sh.Dialog("Create User");
        dlg.add(new sh.Label("Create a new user."));

        var nameEntry = new sh.TextInput("user");
        var passwordEntry = new sh.TextInput("");
        var homeEntry = new sh.TextInput(files.currentUri());

        var mayCreate = new sh.Switch();
        mayCreate.checked = true;
        var mayDelete = new sh.Switch();
        mayDelete.checked = true;
        var mayModify = new sh.Switch();
        mayModify.checked = true;
        var mayShare = new sh.Switch();
        mayShare.checked = false;
        var mayAdmin = new sh.Switch();
        mayAdmin.checked = false;

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
            if (mayCreate.checked) permissions.push("CREATE");
            if (mayDelete.checked) permissions.push("DELETE");
            if (mayModify.checked) permissions.push("MODIFY");
            if (mayShare.checked) permissions.push("SHARE");
            if (mayAdmin.checked) permissions.push("ADMIN");
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
        sh.element(sh.MenuItem).text("Administration")
        .visible(files.predicates.permissions("ADMIN"))
        .callback(openPage)
    )
    .add(
        sh.element(sh.MenuItem).text("User Agent")
        .visible(files.predicates.permissions("ADMIN"))
        .callback(function ()
        {
            var dlg = new sh.Dialog("User Agent");
            dlg.add(new sh.Label(navigator.userAgent));
            dlg.addButton("Ok");
            dlg.show();  
        })
    );
})();
