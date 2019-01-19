"use strict";

const modCrypto = require("crypto"),
      modFs = require("fs"),
      modHttp = require("http"),
      modHttps = require("https"),
      modPath = require("path"),
      modUrl = require("url"),
      modZlib = require("zlib");

const modCodeAuth = require("./modules/codeauth.js"),
      modCookies = require("./modules/cookies"),
      modHttpAuth = require("./modules/httpauth.js"),
      modBrowser = require("./modules/browser.js"),
      modDav = require("./modules/dav.js"),
      modId3Tags = require("./modules/id3tags"),
      modLockStore = require("./modules/lockstore.js"),
      modMime = require("./modules/mime.js"),
      modShares = require("./modules/shares.js"),
      modUserContext = require("./modules/usercontext.js"),
      modUtils = require("./modules/utils.js");

const svcImageOfTheDay = require("./modules/services/image-of-the-day-service.js"),
      svcLogin = require("./modules/services/login-service.js"),
      svcRes = require("./modules/services/res-service.js"),
      svcShell = require("./modules/services/shell-service.js"),
      svcTags = require("./modules/services/tags-service.js"),
      svcThumbnail = require("./modules/services/thumbnail-service.js");

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


var TransferTracker = function (url)
{
    var m_bytes = 0;

    this.transfer = function (bytes)
    {
        m_bytes += bytes;
    }

    this.end = function ()
    {
        console.log("Transfer finished: " + url + " (" + m_bytes + " bytes transfered)");
    }

    this.abort = function ()
    {
        console.log("Transfer aborted: " + url + " (" + m_bytes + " bytes transfered)");
    }

    console.log("Transfer started: " + url);
};


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

    if (method !== "GET" && method !== "HEAD" && method !== "POST")
    {
        return false;
    }

    var path = "";
    var uriParts = uri.split("/");
    if (uri.indexOf("/::res/") === 0)
    {
        return true;
    }
    else if (uri.indexOf("/::login/") === 0)
    {
        return true;
    }
    else if (uri.indexOf("/::image-of-the-day/") === 0)
    {
        return true;
    }
    else
    {
        return false;
    }
}

/* Returns the service name of a request.
 * Returns empty string if this is no service request.
 */
function serviceOf(path)
{
    var parts = path.split("/");
    var p = parts[1] || "";
    if (p.indexOf("::") === 0)
    {
        return p.substr(2);
    }
    else
    {
        return "";
    }
}

/* Creates a fingerprint of the given client request.
 * This may be used to indentify a certain client.
 * If `forRoaming` is true, the fingerprint is not bound to the IP address.
 */
function clientFingerprint(request, forRoaming)
{
    function toHex(s)
    {
        var out = "";
        for (var i = 0; i < s.length; ++i)
        {
            out += s[i].charCodeAt(0).toString(16);
        }
        return out;
    }

    var remoteHost = request.connection.remoteAddress;
    var remoteFamily = request.connection.remoteFamily;
    var userAgent = request.headers["user-agent"] || "";
    var acceptLanguage = request.headers["accept-language"] || "";
    var dnt = request.headers["dnt"] || "0";

    if (forRoaming)
    {
        remoteHost = "255.255.255.255";
    }

    var hash = modCrypto.createHash("md5");
    hash.update(remoteHost + ":" + remoteFamily + ":" + userAgent + ":" + acceptLanguage + ":" + dnt);
    var fingerprint = hash.digest("hex");

    return toHex(Buffer.from(remoteHost + ":" + remoteFamily, "ascii").toString("base64")) + fingerprint;
}

/* Handles HTTP requests and produces a response.
 */
function handleRequest(request, response)
{
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

    // setup authenticator
    var authCookie = modCookies.getCookie(request, "AuthCode");
    console.debug("Auth Cookie: " + authCookie.name() + " = " + authCookie.value());
    var authenticator;
    if (authCookie.name() === "AuthCode" || urlObj.pathname.indexOf("/::shell/") === 0)
    {
        authenticator = codeAuthenticator;
    }
    else
    {
        authenticator = httpAuthenticator;
    }

    // try to authorize user
    var authUser = authenticator.authorize(request, authUsers);
    
    // try to identify user by registered fingerprint
    var fingerprint = clientFingerprint(request, false);
    var roamingFingerprint = clientFingerprint(request, true);
    if (! authUser)
    {
        var u = fingerprints[fingerprint] || fingerprints[roamingFingerprint];
        if (u)
        {
            authUser = u;
        }
    }

    if (! authUser && ! isPublic(request.method, urlObj.pathname))
    {
        // login required
        console.log("[" + new Date().toLocaleString() + "] [Server] " +
        "[" + request.connection.remoteAddress + ":" + request.connection.remotePort + "] " +
        "> " + "UNAUTHORIZED " + request.method + " " + request.url);

        if (authenticator.requestAuthorization)
        {            
            authenticator.requestAuthorization(response, "Users");
            response.write("Authorization required.");
            response.end();
            return;
        }
        else
        {
            services["shell"].requestLogin(response, function () { });
            return;
        }
    }

    if (authUser)
    {
        console.log("[" + new Date().toLocaleString() + "] [Server] " +
                    "[client " + authUser + "@" + request.connection.remoteAddress + ":" + request.connection.remotePort + "] " +
                    "Fingerprints: " + fingerprint + ", " + roamingFingerprint + " (roaming)");
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


    var serviceName = serviceOf(urlObj.pathname);
    if (serviceName === "login")
    {
        services[serviceName].handleRequest(request, response, authUsers, authCookie.value());
        return;
    }
    else if (serviceName !== "" && services[serviceName])
    {
        // service
        services[serviceName].handleRequest(request, response, userContext, shares, function () { });
        return;
    }
    else if (serviceName !== "")
    {
        // invalid service name
        response.writeHeadLogged(403, "Forbidden");
        response.write("Access denied.");
        response.end();
        return;
    }


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
        // retrieve file

        /* Header: range = bytes=248426-252521 */
        var range = [];
        if (request.headers.range)
        {
            range = parseRange(request.headers.range);
        }

        var tracker = new TransferTracker(urlObj.pathname);

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
                response.on("error", tracker.abort);
                response.on("unpipe", function () { stream.destroy(); tracker.end(); });
                stream.on("data", function (chunk) { tracker.transfer(chunk.length); });
                stream.pipe(response);
            }
            else
            {
                response.end();
                tracker.end();
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

// setup authenticators
var codeAuthenticator = new modCodeAuth.Authenticator(CONFIG.authentication.realm);
var httpAuthenticator;
if (CONFIG.authentication.method === "basic")
{
    httpAuthenticator = new modHttpAuth.Authenticator("Basic", CONFIG.authentication.realm);
}
else if (CONFIG.authentication.method === "digest")
{
    httpAuthenticator = new modHttpAuth.Authenticator("Digest", CONFIG.authentication.realm);
}
else
{
    throw "Invalid authentication method '" + CONFIG.authentication.method + "'";
}

// setup fingerprints registry
var fingerprints = { };
CONFIG.users.forEach(function (u)
{
    if (u.fingerprints)
    {
        u.fingerprints.forEach(function (p)
        {
            fingerprints[p] = u.name;
        });
    }
});

// setup services
var services = {
    "image-of-the-day": new svcImageOfTheDay.Service(CONFIG.server.root),
    "login": new svcLogin.Service(codeAuthenticator),
    "res": new svcRes.Service(CONFIG.server.root, modPath.join(__dirname, "res")),
    "shell": new svcShell.Service(CONFIG.server.root),
    "tags": new svcTags.Service(CONFIG.server.root),
    "thumbnail": new svcThumbnail.Service(CONFIG.server.root)
};

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
console.log("  ( Pilvini ).--.  | (c) 2017 - 2019 Martin Grimme");
console.log(" (  Cloud Drive  ) | https://github.com/pycage/pilvini");
console.log("  ```````````````  |");
console.log("Listening....      | Port " + CONFIG.server.port + " " + (CONFIG.server.use_ssl ? "(SSL)" : ""));
console.log("");
