"use strict";

const EXTENSIONS = {
    ".apk":   "application/java-archive",
    ".avi":   "video/x-msvideo",
    ".bat":   "application/x-batch",
    ".c":     "text/plain",
    ".cc":    "text/plain",
    ".cpp":   "text/plain",
    ".css":   "text/css",
    ".exe":   "application/x-executable",
    ".flv":   "video/x-flv",
    ".gif":   "image/gif",
    ".gz":    "application/x-gzip",
    ".h":     "text/plain",
    ".hpp":   "text/plain",
    ".htm":   "text/html",
    ".html":  "text/html",
    ".ini":   "text/plain",
    ".iso":   "application/x-iso9660-image",
    ".jar":   "application/java-archive",
    ".jpeg":  "image/jpeg",
    ".jpg":   "image/jpeg",
    ".json":  "application/x-json",
    ".m4v":   "video/mp4",
    ".md":    "text/x-markdown",
    ".mp3":   "audio/mp3",
    ".mp4":   "video/mp4",
    ".odt":   "application/vnd.oasis.opendocument.text",
    ".ogg":   "application/ogg",
    ".pdf":   "application/pdf",
    ".png":   "image/png",
    ".py":    "application/x-python",
    ".rtf":   "text/rtf",
    ".sh":    "application/x-shellscript",
    ".svg":   "image/svg+xml",
    ".txt":   "text/plain",
    ".vcf":   "text/vcard",
    ".xml":   "text/xml",
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
