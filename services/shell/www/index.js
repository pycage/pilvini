"use strict";

/* Joins predicates.
 */
function and(predicates)
{
    var args = arguments;
    return function ()
    {
        var v = false;
        for (var i = 0; i < args.length; ++i)
        {
            v &= args[i]();
            if (v)
            {
                break;
            }
        }
        return v;
    };
}

/* Joins predicates.
 */
function or(predicates)
{
    var args = arguments;
    return function ()
    {
        var v = false;
        for (var i = 0; i < args.length; ++i)
        {
            v |= args[i]();
            if (v)
            {
                break;
            }
        }
        return v;
    };
}

/* Negates the given predicate.
 */
function not(predicate)
{
    return function ()
    {
        return ! predicate();
    };
}




function extensions()
{
    var extensions = document.body.getAttribute("data-extensions");
    return JSON.parse(extensions);
}

const mods = [
    "/::res/shellfish/preload.js",
    "shellfish/low",
    "shellfish/mid",
    "shellfish/high",
    __dirname + "/ui.js",
    __dirname + "/files.js",
    __dirname + "/tips.js"
].concat(extensions());
require(mods, function (preload, low, mid, high, ui, files)
{
    function logout()
    {
        $.ajax({
            type: "POST",
            url: "/::login/",
            beforeSend: function(xhr)
            {
                 xhr.setRequestHeader("x-pilvini-user", "");
                 xhr.setRequestHeader("x-pilvini-password", "");
            },
        })
        .done(function (data, status, xhr)
        {
            window.location.reload();
        });
    }

    files.actionsMenu()
    .add(
        high.element(mid.Separator)
    )
    .add(
        high.element(mid.MenuItem).text("Logout")
        .onClicked(logout)
    );
});
