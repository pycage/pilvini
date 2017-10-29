"use strict";

const EXTENSIONS = {
    ".apk":   "application/java-archive",
    ".avi":   "video/x-msvideo",
    ".css":   "text/css",
    ".exe":   "application/x-executable",
    ".flv":   "video/x-flv",
    ".gif":   "image/gif",
    ".gz":    "application/x-gzip",
    ".htm":   "text/html",
    ".html":  "text/html",
    ".iso":   "application/x-iso9660-image",
    ".jar":   "application/java-archive",
    ".jpeg":  "image/jpeg",
    ".jpg":   "image/jpeg",
    ".md":    "text/x-markdown",
    ".mp3":   "audio/mp3",
    ".mp4":   "video/mp4",
    ".odt":   "application/vnd.oasis.opendocument.text",
    ".ogg":   "application/ogg",
    ".pdf":   "application/pdf",
    ".png":   "image/png",
    ".rtf":   "text/rtf",
    ".svg":   "image/svg+xml",
    ".txt":   "text/plain",
    ".vcf":   "text/vcard",
    ".zip":   "application/zip"
};

exports.mimeType = function (path)
{
    var ext = "";
    var idx = path.lastIndexOf(".");
    if (idx != -1)
    {
        ext = path.substr(idx);
    }

    return EXTENSIONS[ext.toLowerCase()] || "application/octet-stream";
};
