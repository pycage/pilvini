"use strict";

var file = { };

file.copy = function (sourceUri, targetUri, callback)
{
    $.ajax({
        url: sourceUri,
        type: "COPY",
        beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
    })
    .done(function ()
    {
        callback(true);
    })
    .fail(function ()
    {
        callback(false);
    });
};

file.move = function (sourceUri, targetUri, callback)
{
    $.ajax({
        url: sourceUri,
        type: "MOVE",
        beforeSend: function(xhr) { xhr.setRequestHeader("Destination", targetUri); },
    })
    .done(function ()
    {
        callback(true);
    })
    .fail(function ()
    {

        callback(false);
    });
};

file.remove = function (targetUri, callback)
{
    $.ajax({
        url: targetUri,
        type: "DELETE"
    })
    .done(function ()
    {
        callback(true);
    })
    .fail(function ()
    {
        callback(false);
    });
};

file.mkdir = function (targetUri, callback)
{
    $.ajax({
        url: targetUri,
        type: "MKCOL"
    })
    .done(function ()
    {
        callback(true);
    })
    .fail(function ()
    {
        callback(false);
    });
};

file.create = function (targetUri, callback)
{
    $.ajax({
        url: targetUri,
        type: "PUT",
        contentType: "application/x-octet-stream",
        processData: false,
        data: ""
    })
    .done(function ()
    {
        callback(true);
    })
    .fail(function ()
    {
        callback(false);
    });
};
