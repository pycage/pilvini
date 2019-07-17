"use strict";

const mods = [
    "/::res/shellfish/core/low.js",
    "/::res/shellfish/core/mid.js",
    "/::res/shellfish/core/high.js",
    __dirname + "/ui.js"
];
loadStyle("/::res/shellfish/style/shellfish.css");
require(mods, function (low, mid, high, ui)
{
    function login(user, password)
    {
        if (user === "")
        {
            ui.showError("Invalid login credentials.", function ()
            {
                showLoginDialog();
            });
            return;
        }

        $.ajax({
            type: "POST",
            url: "/::login/",
            beforeSend: function(xhr)
            {
                 xhr.setRequestHeader("x-pilvini-user", user);
                 xhr.setRequestHeader("x-pilvini-password", password);
            },
        })
        .done(function (data, status, xhr)
        {
            // server returns the auth code on successful login
            var authCode = xhr.getResponseHeader("X-Pilvini-Auth");
            document.cookie = "AuthCode=" + authCode + "; path=/";
            window.location.reload();
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Invalid login credentials.", function ()
            {
                showLoginDialog();
            });
        });
    }

    function showLoginDialog()
    {
        var dlg = high.element(mid.Dialog).title("Login")
        .add(
            high.element(mid.Label).text("Welcome to Pilvini Web Shell.")
        )
        .add(
            high.element(mid.Labeled).text("Login:")
            .add(
                high.element(mid.TextInput).id("login").focus(true)
            )
        )
        .add(
            high.element(mid.Labeled).text("Password:")
            .add(
                high.element(mid.TextInput).id("password").password(true)
            )
        )
        .button(
            high.element(mid.Button).text("Login").isDefault(true)
            .action(function ()
            {
                dlg.close_();
                login(dlg.find("login").get().text,
                      dlg.find("password").get().text);
            })
        );
        dlg.show_();
    }

    var page = high.element(mid.Page)
    .header(
        high.element(mid.PageHeader)
        .title("Pilvini Secure Cloud Drive")
        .subtitle("© 2017 - 2019 Martin Grimme")
    );

    page.get().get()
    .css("background-size", "cover")
    .css("background-repeat", "no-repeat");
    
    page.get().get().append($(
        low.tag("p").class("sh-font-small")
        .style("position", "absolute")
        .style("bottom", "1em")
        .style("right", "1em")
        .style("color", "#fff")
        .style("text-align", "right")
        .style("text-shadow", "#000 1px 1px 1px")
        .html()
    ));
    
    page.push_();
    
    $.ajax({
        type: "GET",
        url: "/::image-of-the-day/",
        dataType: "json"
    })
    .done(function (data, status, xhr)
    {
        var pic = "data:image/jpeg;base64," + data.image;
        page.get().get().css("background-image", "url(" + pic + ")");
        page.get().get().find("p").html("Background image powered by bing.com<hr style='border: solid 1px #fff;'>" + low.escapeHtml(atob(data.description)));
    });

    showLoginDialog();
});