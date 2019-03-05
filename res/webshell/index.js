"use strict";

/* Imports the given JavaScript files and invokes the callback afterwards.
 */
function importJs(uris, callback)
{
    if (uris.length === 0)
    {
        callback();
        return;
    }

    var uri = uris.shift();
    var script = document.createElement("script");
    script.setAttribute("type","text/javascript");
    script.setAttribute("src", uri);
    script.onload = function ()
    {
        importJs(uris, callback);
    };
    document.head.appendChild(script);
}

var MimeRegistry = function ()
{
    var m_mapping = { };

    this.register = function (mimeType, viewer)
    {
        if (! m_mapping[mimeType])
        {
            m_mapping[mimeType] = [];
        }

        var viewers = m_mapping[mimeType];
        viewers.push(viewer);
    };

    this.fileHandlers = function (mimeType)
    {
        return m_mapping[mimeType] || [];
    }
};
var mimeRegistry = new MimeRegistry();


var Storage = function ()
{
    var m_indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    var m_db = null;

    function open(callback)
    {
        if (m_db)
        {
            callback(m_db);
        }
        else
        {
            var req = m_indexedDB.open("Pilvini", 1);
            req.onerror = function (event)
            {
                ui.showError("Failed to store data at storage://" + uri + ".");
            };
            req.onupgradeneeded = function ()
            {
                var db = this.result;
                if (! db.objectStoreNames.contains("Storage"))
                {
                    var store = db.createObjectStore("Storage");
                }
            };
            req.onsuccess = function (event)
            {
                var m_db = this.result;
                m_db.onerror = function (event)
                {
                    ui.showError("Storage failure: " + event.target.errorCode);
                };
                callback(m_db);
            };
        }
    }

    this.store = function (uri, data, callback)
    {
        open(function (db)
        {
            var tx = db.transaction(["Storage"], "readwrite");
            var store = tx.objectStore("Storage");

            var req = store.put(data, uri);
            req.onsuccess = function (event)
            {
                callback();
            };
            req.onerror = function ()
            {
                ui.showError("Failed to store data: " + this.error);
            };
        });
    };

    this.load = function (uri, callback)
    {
        open(function (db)
        {
            var tx = db.transaction("Storage", "readonly");
            var store = tx.objectStore("Storage");

            var req = store.get(uri);
            req.onsuccess = function (event)
            {
                callback(event.target.result);
            };
            req.onerror = function ()
            {
                ui.showError("Failed to load data: " + this.error);
            };
        });
    };
};
var storage = new Storage();

var Configuration = function ()
{
    var m_config;

    this.get = function (key, defaultValue)
    {
        return m_config[key] || defaultValue;
    };

    this.set = function (key, value)
    {
        m_config[key] = value;
        storage.store("configuration", m_config, function () { });
    };

    storage.load("configuration", function (data)
    {
        m_config = data || { };
    });
};
var configuration = new Configuration();

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

/* Opens the given file item.
 */
function openFile(item)
{
    var mimeType = item.mimeType;
    var uri = item.uri;

    var handlers = mimeRegistry.fileHandlers(mimeType);
    if (handlers.length === 0)
    {
        ui.showError("There is no handler available for this type: " + mimeType);
    }
    else
    {
        handlers[0](uri);
    }
}


function login(user, password)
{
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

function init()
{
    var js = [
        "/::res/webshell/file.js",
        "/::res/webshell/html.js",
        "/::res/webshell/ui.js",
        "/::res/webshell/upload.js",

        "/::res/webshell/extensions/files.js",
        "/::res/webshell/extensions/admin.js",
        "/::res/webshell/extensions/audio.js",
        "/::res/webshell/extensions/image.js",
        "/::res/webshell/extensions/markdown.js",
        "/::res/webshell/extensions/pdf.js",
        "/::res/webshell/extensions/text.js",
        "/::res/webshell/extensions/tips.js",
        "/::res/webshell/extensions/vcard.js",
        "/::res/webshell/extensions/video.js"
    ];
    importJs(js, function ()
    {
        files.actionsMenu()
        .add(
            files.menu.separator()
        )
        .add(
            files.menu.item("Logout")
            .action(logout)
        );
    });
}

function initLogin()
{
    function showLoginDialog()
    {
        var dlg = ui.showDialog("Login", "Welcome to Pilvini Web Shell.");
        var loginEntry = dlg.addTextEntry("Login:", "");
        var passwordEntry = dlg.addPasswordEntry("Password:", "");
        dlg.addButton("Login", function ()
        {
            login(loginEntry.val(), passwordEntry.val());
        }, true);
    }

    var js = [
        "/::res/webshell/html.js",
        "/::res/webshell/ui.js"
    ];
    importJs(js, function ()
    {
        sh.push("main-page", function () { }, true);
        showLoginDialog();
    });
}
