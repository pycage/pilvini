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
    ".flac":  "audio/flac",
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
    ".js":    "text/javascript",
    ".json":  "application/x-json",
    ".m4v":   "video/mp4",
    ".md":    "text/x-markdown",
    ".mp3":   "audio/mp3",
    ".mp4":   "video/mp4",
    ".mpeg":  "video/mpeg",
    ".mpg":   "video/mpeg",
    ".odt":   "application/vnd.oasis.opendocument.text",
    ".ogg":   "audio/ogg",
    ".pdf":   "application/pdf",
    ".png":   "image/png",
    ".pro":   "text/plain",
    ".py":    "application/x-python",
    ".qml":   "application/x-qml",
    ".rtf":   "text/rtf",
    ".sh":    "application/x-shellscript",
    ".svg":   "image/svg+xml",
    ".txt":   "text/plain",
    ".vcf":   "text/vcard",
    ".webm":  "video/webm",
    ".xml":   "text/xml",
    ".zip":   "application/zip"
};

const NAMES = {
    "ChangeLog": "text/plain",
    "INSTALL": "text/plain",
    "LICENSE": "text/plain",
    "Makefile": "text/plain",
    "NEWS": "text/plain",
    "README": "text/plain"
};

exports.mimeType = function (path)
{
    var idx = path.lastIndexOf("/");
    var name = idx !== -1 ? path.substr(idx + 1)
                          : path; 

    idx = path.lastIndexOf(".");
    var ext = idx !== -1 ? path.substr(idx)
                         : "";

    return EXTENSIONS[ext.toLowerCase()] ||
           NAMES[name] ||
           "application/octet-stream";
};
