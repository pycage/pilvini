"use strict";

exports.__id = "shell/storage";

function Storage()
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
                callback(null);
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
                callback();
            };
        });
    };

    this.load = function (uri, callback)
    {
        open(function (db)
        {
            if (! db)
            {
                console.error("Use of local storage is not permitted.");
                callback(null);
                return;
            }

            var tx = db.transaction("Storage", "readonly");
            var store = tx.objectStore("Storage");

            var req = store.get(uri);
            req.onsuccess = function (event)
            {
                callback(event.target.result);
            };
            req.onerror = function ()
            {
                callback(null);
            };
        });
    };
}
exports.storage = new Storage();
