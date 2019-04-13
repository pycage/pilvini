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
        var dlg = sh.element(sh.Dialog).title("Create User")
        .add(
            sh.element(sh.Label).text("Create a new user.")
        )
        .add(
            sh.element(sh.Labeled).text("Name:")
            .add(
                sh.element(sh.TextInput).id("name").text("user")
            )
        )
        .add(
            sh.element(sh.Labeled).text("Password:")
            .add(
                sh.element(sh.TextInput).id("password")
            )
        )
        .add(
            sh.element(sh.Labeled).text("Home:")
            .add(
                sh.element(sh.TextInput).id("home").text(files.currentUri())
            )
        )
        .add(
            sh.element(sh.Labeled).text("Create")
            .add(
                sh.element(sh.Switch).id("mayCreate").checked(true)
            )
        )
        .add(
            sh.element(sh.Labeled).text("Delete")
            .add(
                sh.element(sh.Switch).id("mayDelete").checked(true)
            )
        )
        .add(
            sh.element(sh.Labeled).text("Modify")
            .add(
                sh.element(sh.Switch).id("mayModify").checked(true)
            )
        )
        .add(
            sh.element(sh.Labeled).text("Share")
            .add(
                sh.element(sh.Switch).id("mayShare").checked(false)
            )
        )
        .add(
            sh.element(sh.Labeled).text("Administrator")
            .add(
                sh.element(sh.Switch).id("mayAdmin").checked(false)
            )
        )
        .button(
            sh.element(sh.Button).text("Create").isDefault(true)
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
            sh.element(sh.Button).text("Cancel")
            .action(function ()
            {
                dlg.close_();
            })
        );
        dlg.show_();
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
            var dlg = sh.element(sh.Dialog).title("User Agent")
            .add(
                sh.element(sh.Label).text(navigator.userAgent)
            )
            .button(
                sh.element(sh.Button).text("Ok")
                .action(function () { dlg.close_(); })
            );
            dlg.show_();
        })
    );
})();
