"use strict";

const attempt = require("./modules/attempt.js").attempt;

const modCrypto = require("crypto"),
      modFs = require("fs"),
      modHttp = require("http"),
      modHttps = require("https"),
      modPath = require("path"),
      modUrl = require("url"),
      modZlib = require("zlib"),
      modCookies = require("./modules/cookies"),
      modHttpAuth = require("./modules/httpauth.js"),
      modBrowser = require("./modules/browser.js"),
      modDav = require("./modules/dav.js"),
      modId3Tags = require("./modules/id3tags"),
      modLockStore = require("./modules/lockstore.js"),
      modMime = require("./modules/mime.js"),
      modShares = require("./modules/shares.js"),
      modThumbnail = attempt(function () { return require("./modules/thumbnail.js"); }),
      modUserContext = require("./modules/usercontext.js"),
      modUtils = require("./modules/utils.js");

const VERSION = "0.2.0rc";

console.debug = function(msg)
{
    if (CONFIG.global && CONFIG.global.debug)
    {
        console.log("[" + new Date().toLocaleString() + "] [DEBUG] >>>\n" +
                    msg +
                    "\n<<<");
    }
};

/* Limits the files in the given directory to a certain amount by removing
 * the oldest files.
 */
function limitFiles(path, amount)
{
    modFs.readdir(path, function (err, files)
    {
        if (err)
        {
            return;
        }

        var result = [];
        for (var i = 0; i < files.length; ++i)
        {
            var filePath = modPath.join(path, files[i]);
            modFs.stat(filePath, function (file) { return function (err, stat)
            {
                result.push([file, stat]);
                if (result.length === files.length)
                {
                    result.sort(function (a, b)
                    {
                        if (! a[1] || ! b[1])
                        {
                            return 0;
                        }
                        else if (a[1].mtime < b[1].mtime)
                        {
                            return -1;
                        }
                        else
                        {
                            return a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1;
                        }
                    });

                    while (result.length > amount)
                    {
                        var path = result[0][0];
                        console.debug("Clearing old thumbnail: " + path);
                        result.shift();
                        modFs.unlink(path, function (err) { });
                    }
                }
            }; } (filePath));
        }
    });
}

/* Retrieves the given file via HTTP.
 */
function getFile(response, path)
{
    modFs.readFile(path, function (err, data)
    {
        if (err)
        {
            response.writeHeadLogged(404, "Not found");
            response.end();
        }
        else
        {
            response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
            response.setHeader("Content-Type", modMime.mimeType(path));
            response.writeHeadLogged(200, "OK");
            response.write(data);
            response.end();
        }
    });
}

/* Parses a HTTP range attribute and returns a [from, to] tuple.
 * Returns an empty tuple if the range could not be parsed.
 */
function parseRange(range)
{
    var parts = range.split("=");
    if (parts[0] === "bytes")
    {
        parts = parts[1].split("-");
        return [parseInt(parts[0], 10), parseInt(parts[1] || "-1", 10)];
    }
    else
    {
        return [];
    }
}

/* Reads HTTP request payload.
 */
function readRequest(request, callback)
{
    var chunks = [];

    request.on("data", function(chunk)
    {
        chunks.push(chunk);
    });

    request.on("end", function()
    {
        callback(Buffer.concat(chunks).toString("binary"));
    });
}

/* Returns if the given URL is public and may be served without authorization.
 */
function isPublic(method, uri)
{
    if (uri === "/favicon.ico")
    {
        return true;
    }

    if (method !== "GET" && method !== "HEAD")
    {
        return false;
    }

    var path = "";
    var uriParts = uri.split("/");
    if (uri.indexOf("/::res/") === 0)
    {
        return true;
    }
    else
    {
        return false;
    }
}

/* Handles HTTP requests and produces a response.
 */
function handleRequest(request, response)
{
    /*
    // obtain or create session
    var cookie = modCookies.getCookie(request, "SessionId");
    if (! cookie.name())
    {
        modCookies.setCookie(response, new modCookies.Cookie("SessionId", "42"));
    }
    */

    var contentRoot = CONFIG.server.root;
    var urlObj = modUrl.parse(request.url, true);
    var shares = new modShares.Shares(contentRoot);

    // setup users
    var authUsers = { };
    for (var i = 0; i < CONFIG.users.length; ++i)
    {
        var user = CONFIG.users[i];
        authUsers[user.name] = user.password_hash;
    }
    // mix in share guest users
    shares.shares().forEach(function (shareId)
    {
        var shareInfo = shares.info(shareId);
        authUsers[shareId] = shareInfo.password_hash;
    });

    // setup HTTP authenticator
    var httpAuth;
    if (CONFIG.authentication.method === "basic")
    {
        httpAuth = new modHttpAuth.Authenticator("Basic", CONFIG.authentication.realm, authUsers);
    }
    else if (CONFIG.authentication.method === "digest")
    {
        httpAuth = new modHttpAuth.Authenticator("Digest", CONFIG.authentication.realm, authUsers);
    }
    else
    {
        throw "Invalid authentication method '" + CONFIG.authentication.method + "'";
    }

    // request user authorization if required
    var authUser = httpAuth.authorize(request);
    if (! authUser && ! isPublic(request.method, urlObj.pathname))
    {
        // authorization required
        console.log("[" + new Date().toLocaleString() + "] [Server] " +
                    "[" + request.connection.remoteAddress + ":" + request.connection.remotePort + "] " +
                    "> " + "UNAUTHORIZED " + request.method + " " + request.url);

        httpAuth.requestAuthorization(response, "Users");
        response.write("Authorization required.");
        response.end();
        return;
    }

    // get the user's home directory
    var userHome = "";
    shares.shares().forEach(function (shareId)
    {
        if (shareId === authUser)
        {
            userHome = shares.info(shareId).root;
        }
    });
    if (userHome === "")
    {
        CONFIG.users.forEach(function (u)
        {
            if (u.name === authUser)
            {
                userHome = u.home;
            }
        });
    }

    // get the user's particular access permissions
    var userContext = shares.shares().indexOf(authUser) === -1
        ? new modUserContext.UserContext(authUser, userHome)
        : new modUserContext.UserContext(null, userHome);

    // a logging version of response.writeHead
    response.request = request;
    response.user = authUser;
    response.writeHeadLogged = function (code, status)
    {
        if (this.connection)
        {
            console.log("[" + new Date().toLocaleString() + "] [Server] " +
                        "[client " + this.user + "@" + (this.connection.remoteAddress || "<unknown>") +
                        ":" + (this.connection.remotePort || "<unknown>") + "] " +
                        "< " + this.request.method + " " + this.request.url + " : " +
                        "HTTP " + code + " " + status);
        }
        this.writeHead(code, status);
    };


    /*
    console.log("href: " + urlObj.href +
                " pathname: " + urlObj.pathname +
                " search: " + urlObj.search);
    for (var key in urlObj.query)
    {
      console.debug("key: " + key + " value: " + urlObj.query[key]);
    }
    */

    console.log("[" + new Date().toLocaleString() + "] [Server] " +
                "[client " + authUser + "@" + request.connection.remoteAddress + ":" + request.connection.remotePort + "] " +
                "> " + request.method + " " + request.url);

    console.debug(function ()
    {
        var headerString = "Header:";
        for (var header in request.headers)
        {
            headerString += "\n - " + header + " = " + request.headers[header];
        }
        return headerString;
    } ());





    var davSession = new modDav.DavSession(contentRoot + userHome);

    if (request.method === "COPY" && userContext.mayCreate())
    {
        var destinationUrlObj = modUrl.parse(request.headers.destination, true);

        davSession.copy(urlObj.pathname, destinationUrlObj.pathname, function(code, status)
        {
            // TODO: multistatus
            response.writeHeadLogged(code, status);
            response.end();
        });
    }
    else if (request.method === "DELETE" && userContext.mayDelete())
    {
    	davSession.del(urlObj.pathname, function(code, status)
        {
            response.writeHeadLogged(code, status);
            response.end();
        });
    }
    else if (request.method === "GET")
    {
        if (urlObj.pathname.indexOf("/::shell/") === 0)
        {            
            function callback (ok, data)
            {
                if (! ok)
                {
                    response.writeHeadLogged(404, "Not found");
                    response.end();
                }
                else
                {
                    response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
                    response.writeHeadLogged(200, "OK");
                    response.write(data);
                    response.end();
                }
            }
            
            if (urlObj.search.indexOf("ajax") !== -1)
            {
                var uri = urlObj.pathname.substr(8);
                modBrowser.createMainPage("/::shell", uri, contentRoot, userContext, shares, callback);
            }
            else
            {
                modBrowser.makeIndex("/::shell", "/", contentRoot, userContext, shares, callback);
            }
            return;
        }
        else if (urlObj.pathname.indexOf("/::tags/") === 0)
        {
            var uri = urlObj.pathname.substr(7);
            console.log("URI: " + uri);
            var targetFile = modUtils.uriToPath(uri, contentRoot + userHome);
            var tagParser = new modId3Tags.Tags(targetFile);

            tagParser.read(function (err)
            {
                if (err)
                {
                    response.writeHeadLogged(404, "Not found");
                    response.end();
                }
                else
                {
                    var json = { };
                    var keys = tagParser.keys();
                    for (var i = 0; i < keys.length; ++i)
                    {
                        var key = keys[i];
                        console.debug("Key: " + key);
                        json[key] = tagParser.get(key);
                    }

                    var data = Buffer.from(JSON.stringify(json));
                    response.setHeader("Content-Length", Buffer.byteLength(data, "utf-8"));
                    response.setHeader("Content-Type", "text/json");
                    response.writeHeadLogged(200, "OK");
                    response.write(data);
                    response.end();
                }
            });
            return;

        }
        else if (urlObj.pathname.indexOf("/::thumbnail/") === 0)
        {
            // provide thumbnails
            var thumbDir = modPath.join(contentRoot, ".pilvini", "thumbnails");

            var href = urlObj.pathname.substr(12);
            var targetFile = modUtils.uriToPath(href, contentRoot + userHome);
            console.log("HREF: " + href + ", contentRoot: " + contentRoot + ", userHome: " + userHome);
            console.log("Thumbnail target file: " + targetFile);

            var hash = modCrypto.createHash("md5");
            hash.update(targetFile);
            var thumbFile = modPath.join(thumbDir, hash.digest("hex"));

            modFs.stat(targetFile, function (err, targetStats)
            {
                modFs.stat(thumbFile, function (err, thumbnailStats)
                {
                    console.debug("Thumbnail mtime: " +
                                  (thumbnailStats ? thumbnailStats.mtime : "<unavailable>") +
                                  ", target mtime: " +
                                  (targetStats ? targetStats.mtime : "<unavailable>"));
                    if (! err && thumbnailStats && targetStats && targetStats.mtime < thumbnailStats.mtime)
                    {
                        // thumbnail exists and is not outdated
                        getFile(response, thumbFile);
                    }
                    else
                    {
                        // generate thumbnail
                        modUtils.mkdirs(thumbDir, function (err)
                        {
                            modThumbnail.makeThumbnail(modMime.mimeType(targetFile), targetFile, thumbFile, function (err)
                            {
                                if (err)
                                {
                                    console.error(err);
                                    response.writeHeadLogged(500, "Internal Server Error");
                                    response.end();
                                }
                                else
                                {
                                    getFile(response, thumbFile);
                                }
                                limitFiles(thumbDir, 1000);
                            });
                        });
                    }
                });
            });
            return;
        }
        else if (urlObj.pathname.indexOf("/::res/") === 0)
        {
            // provide file from ressource fork
            var res = urlObj.pathname.substr(7);
            var targetFile = modPath.join(__dirname, "res", res);

            getFile(response, targetFile);
            return;
        }

        // retrieve file

        /* Header: range = bytes=248426-252521 */
        var range = [];
        if (request.headers.range)
        {
            range = parseRange(request.headers.range);
        }

        var callback = function (code, status, from, to, totalSize, stream, dataSize)
        {
            if (code === 206)
            {
                response.setHeader("Content-Range", "bytes " + from + "-" + to + "/" + totalSize);
            }

            response.setHeader("Accept-Ranges", "bytes");
            if (dataSize !== -1)
            {
                response.setHeader("Content-Length", dataSize);
            }
            else
            {
                response.setHeader("Transfer-Encoding", "chunked");
            }

            response.setHeader("Content-Type", modMime.mimeType(urlObj.pathname));
            console.debug("Content-Type: " + modMime.mimeType(urlObj.pathname));
            response.writeHeadLogged(code, status);
            if (stream)
            {
                stream.pipe(response);
            }
            else
            {
                response.end();
            }
        };

        davSession.get(urlObj.pathname, range, callback);
    }
    else if (request.method === "HEAD")
    {
        davSession.head(urlObj.pathname, function(code, status, size)
        {
            response.setHeader("Content-Length", size);
            response.setHeader("Content-Type", modMime.mimeType(urlObj.pathname));
            console.debug("Content-Type: " + modMime.mimeType(urlObj.pathname));
            response.writeHeadLogged(code, status);
            response.end();
        });
    }
    else if (request.method === "LOCK" && userContext.mayModify())
    {
        /*
        <?xml version="1.0" encoding="utf-8"?>
        <D:lockinfo xmlns:D="DAV:">
        <D:lockscope><D:exclusive/></D:lockscope>
        <D:locktype><D:write/></D:locktype>
        <D:owner>
        <D:href>http://www.apple.com/webdav_fs/</D:href>
        </D:owner>
        </D:lockinfo>
         */
    	readRequest(request, function(xml)
        {
            var depth = request.headers.depth || "infinity";
            var timeout = request.headers.timeout || "";

            console.debug(xml);

            davSession.lock(urlObj.pathname, depth, timeout, function (code, status)
            {
                response.writeHeadLogged(code, status);
                response.end();
            });
        });
    }
    else if (request.method === "MKCOL" && userContext.mayCreate())
    {
    	davSession.mkcol(urlObj.pathname, function(code, status)
        {
            response.writeHeadLogged(code, status);
            response.end();
        });
    }
    else if (request.method === "MOVE" && userContext.mayModify())
    {
        var destinationUrlObj = modUrl.parse(request.headers.destination, true);

        davSession.move(urlObj.pathname, destinationUrlObj.pathname, function(code, status)
        {
            // TODO: multistatus
            response.writeHeadLogged(code, status);
            response.end();
        });
    }
    else if (request.method === "OPTIONS")
    {
        readRequest(request, function(xml)
        {
            console.debug(xml);
            response.setHeader("DAV", "2");
            response.end();
        });
    }
    else if (request.method === "POST")
    {
        if (urlObj.pathname.indexOf("/share/") === 0)
        {
            var destinationUrlObj = modUrl.parse(request.headers.destination, true);
            var shareId = request.headers["x-pilvini-share-id"];
            var password = request.headers["x-pilvini-share-password"];
            var shareRoot = modUtils.uriToPath(destinationUrlObj.pathname, userHome);
            shares.share(shareId, shareRoot, password);
        }
        else if (urlObj.pathname.indexOf("/unshare/") === 0)
        {
            var destinationUrlObj = modUrl.parse(request.headers.destination, true);
            var shareRoot = modUtils.uriToPath(destinationUrlObj.pathname, userHome);
            var shareId = shares.id(shareRoot);
            console.log("UNSHARE " + shareRoot + " " + shareId);
            if (shareId !== "")
            {
                shares.unshare(shareId);
            }
        }
        response.end();
    }
    else if (request.method === "PROPFIND")
    {
        readRequest(request, function(xml)
        {
            console.debug(xml);
            var depth = request.headers.depth || "infinity";

            davSession.propfind(urlObj.pathname, depth, xml, function(code, status, out)
            {
                console.debug(out);
                //response.setHeader("content-encoding", "gzip");
                response.writeHeadLogged(code, status);

                /*
                var buffer = new Buffer(out, "binary");
                modZlib.gzip(buffer, function(err, outBuffer)
                {
                    response.write(outBuffer);
                    response.end();
                });
                */

                response.write(out);
                response.end();
            });
        });
    }
    else if (request.method === "PUT" && userContext.mayModify())
    {
        davSession.put(urlObj.pathname, request, function(code, status)
        {
            response.writeHeadLogged(code, status);
            response.end();
        });
    }
    else
    {
        // unknown method or missing permission
        response.writeHeadLogged(405, "Method Not Allowed");
    	response.end();
    }
}


// read configuration
//var config;
var configPath = modPath.join(__dirname, "config.json");
const CONFIG = function ()
{
    try
    {
        return JSON.parse(modFs.readFileSync(configPath, "utf8"));
    }
    catch (err)
    {
        console.error("Failed to read configuration: " + err);
        return { };
    }
} ();

if (! CONFIG.server)
{
    process.exit(1);
}

// setup HTTP server
var server;
if (CONFIG.server.use_ssl)
{
    var sslServerKey = modFs.readFileSync(modPath.join(__dirname, CONFIG.server.ssl_key), "utf8");
    var sslServerCert = modFs.readFileSync(modPath.join(__dirname, CONFIG.server.ssl_certificate), "utf8");
    server = modHttps.createServer({ key: sslServerKey, cert: sslServerCert });
}
else
{
    server = modHttp.createServer();
}

// run HTTP server
server.on("request", handleRequest);
server.listen(CONFIG.server.port, CONFIG.server.listen);

console.log("                   | Version " + VERSION)
console.log("   .-------.       |");
console.log("  ( Pilvini ).--.  | (c) 2017, 2018 Martin Grimme");
console.log(" (  Cloud Drive  ) | https://github.com/pycage/pilvini");
console.log("  ```````````````  |");
console.log("Listening....      | Port " + CONFIG.server.port + " " + (CONFIG.server.use_ssl ? "(SSL)" : ""));
console.log("");
