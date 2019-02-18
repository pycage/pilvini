"use strict";

/* Uploads a single file represented by a HTML5 FileEntry object.
 */
function upload(file, target, cbContext, fileCallback, finishedCallback)
{
    //var statusEntry = ui.pushStatus("sh-icon-cloud-upload", 
    //                             amount + "/" + totalAmount + " " + file.name);

    function createMonitoringXhr()
    {
        var xhr = $.ajaxSettings.xhr();
        if (xhr.upload)
        {
            xhr.upload.addEventListener("progress", function (status)
            {
                console.log("progress " + status.loaded + " / " + status.total);
                if (status.lengthComputable && status.total > 0)
                {
                    var p = status.loaded / status.total;
                    fileCallback("file", file.name, p, cbContext);
                    //statusEntry.setProgress(p * 100);
                }
            }, false);
        }

        return xhr;
    }

    console.log("Upload: " + file.name + " -> " + target);
    for (var key in file)
    {
        console.log(" - " + key + ": " + file[key]);
    }

    var cbContext = { };
    fileCallback("file", file.name, 0, cbContext);
    var reader = new FileReader();
    reader.onload = function (ev)
    {
        console.log("FileReader::onLoad");
        var data = new Uint8Array(ev.target.result);

        $.ajax({
                   url: target,
                   type: "PUT",
                   contentType: "application/octet-stream",
                   processData: false,
                   data: data,
                   xhr: createMonitoringXhr
               })
        .done(function () {
            fileCallback("file", file.name, 1, cbContext);
            console.log("File uploaded: " + file.name + ", size: " + data.length);
        })
        .fail(function () {
            fileCallback("file", file.name, -1, cbContext);
            //ui.showError("Failed to upload: " + file.name);
        })
        .always(function () {
            //statusEntry.remove();
            finishedCallback();
        });
    };
    reader.onerror = function (event)
    {
        reader.abort();
        console.log(reader.error);
        fileCallback("file", file.name, -1, cbContext);
        //ui.showError("Failed to upload: " + file.name);
        //statusEntry.remove();
        finishedCallback();
    };
    reader.readAsArrayBuffer(file);
}

/* Uploads the given list of files represented by HTML5 FileEntry objects.
 */
function uploadFiles(files, rootUri, fileCallback, progressCallback, finishedCallback)
{
    if (files.length == 0)
    {
        finishedCallback();
        return;
    }

    var count = files.length;

    for (var i = 0; i < files.length; ++i)
    {
        var file = files[i];
        var targetUri = rootUri +
                        (rootUri !== "/" ? "/" : "") +
                        encodeURIComponent(file.name);

        progressCallback(i, files.length);
        
        var cbContext = { };
        upload(file, targetUri, cbContext, fileCallback, function ()
        {
            --count;
            if (count === 0)
            {
                finishedCallback();
            }
        });
    }
}

/* Uploads a hierarchy of files represented by a WebkitFileEntry object,
 * which may be a file or directory.
 */
function uploadHierarchy(item, rootUri, fileCallback, progressCallback, finishedCallback)
{
    function listDirectory(reader, items, callback)
    {
        reader.readEntries(function (entries)
        {
            var count = entries.length;
            entries.forEach(function (entry)
            {
                items.push(entry);
                --count;
                if (count === 0)
                {
                    listDirectory(reader, items, callback);
                }
            });
            if (entries.length === 0)
            {
                callback(items);
            }
        });
    }

    function walk(item, items, callback)
    {
        console.log("walk " + item.fullPath);
        if (item.isDirectory)
        {
            items.push(item);
            listDirectory(item.createReader(), [], function (dirItems)
            {
                var count = dirItems.length;
                dirItems.forEach(function (dirItem)
                {
                    //alert("will walk " + dirItem.fullPath);
                    walk(dirItem, items, function (subItems)
                    {
                        --count;
                        if (count === 0)
                        {
                            callback(items);
                        }
                    });
                });
                if (dirItems.length === 0)
                {
                    callback(items);
                }
            });
        }
        else
        {
            items.push(item);
            callback(items);
        }
    }

    function processItems(items, callback)
    {
        if (items.length === 0)
        {
            callback();
            return;
        }

        var item = items.shift();
        ++currentCount;

        var targetUri = rootUri +
                        (rootUri !== "/" ? "/" : "") +
                        item.fullPath.substr(1).split("/").map(function (a) { return encodeURIComponent(a); }).join("/");

        var cbContext = { };

        if (item.isDirectory)
        {
            console.log("mkdir " + targetUri);
            fileCallback("directory", item.name, 0, cbContext);
            //var statusEntry = ui.pushStatus("sh-icon-folder", item.name);
            file.mkdir(targetUri, function (ok)
            {
                if (ok)
                {
                    console.log("Directory created: " + name);
                    fileCallback("directory", item.name, 1, cbContext);
                    processItems(items, callback);
                }
                else
                {
                    //ui.showError("Failed to create directory: " + name);
                    fileCallback("directory", item.name, -1, cbContext);
                }
                //statusEntry.remove();
            });
        }
        else
        {
            console.log("put " + targetUri);
            item.file(function (file)
            {
                progressCallback(currentCount, totalCount);
                upload(file, targetUri, cbContext, fileCallback, function ()
                {
                    processItems(items, callback);
                });
            });
        }
    }

    var totalCount = 0;
    var currentCount = 0;

    walk(item, [], function (items)
    {
        totalCount = items.length;

        processItems(items, function ()
        {
            console.log("all done");
            finishedCallback();
        })
    });
}
