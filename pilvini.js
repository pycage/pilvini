"use strict";

const modCrypto = require("crypto"),
      modFs = require("fs"),
      modHttp = require("http"),
      modHttps = require("https"),
      modPath = require("path"),
      modProcess = require("process"),
      modUrl = require("url");

const modCodeAuth = require("./modules/codeauth.js"),
      modConfig = require("./modules/config.js"),
      modCookies = require("./modules/cookies"),
      modHttpAuth = require("./modules/httpauth.js"),
      modDav = require("./modules/dav.js"),
      modMime = require("./modules/mime.js"),
      modShares = require("./modules/shares.js"),
      modUserContext = require("./modules/usercontext.js"),
      modUtils = require("./modules/utils.js");


const VERSION = "0.2.0rc";

/* Loads a shared module by name.
 */
exports.requireShared = function (name)
{
    return require(modPath.join(__dirname, "modules", name + ".js"));
};

/* Returns the server's home directory.
 */
exports.serverHome = function ()
{
    return __dirname;
};

/* Registers a service.
 */
exports.registerService = function (name, handler)
{
    services[name] = handler;
};

/* Registers a resource.
 */
exports.registerResource = function (prefix, location)
{
    if (! resourceMap[prefix])
    {
        resourceMap[prefix] = location;
    }
    else
    {
        console.error("Cannot register resource location '" + location + "'. " +
                      "Prefix '" + prefix + "' is already in use.");
    }
};

/* Registers a shell extension.
 */
exports.registerShellExtension = function (uri)
{
    shellExtensions.push(uri);
};



console.debug = function(msg)
{
    if (CONFIG.root.global && CONFIG.root.global.debug)
    {
        console.log("[" + new Date().toLocaleString() + "] [DEBUG] >>>\n" +
                    msg +
                    "\n<<<");
    }
};

var resourceMap = { };
var shellExtensions = [];

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
    else if (uri.indexOf("/::jsbundle/") === 0)
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
    var contentRoot = CONFIG.root.server.root;
    var urlObj = modUrl.parse(request.url, true);
    var shares = new modShares.Shares(contentRoot);
    var serviceName = serviceOf(urlObj.pathname);

    // setup users
    var authUsers = { };
    for (var i = 0; i < CONFIG.root.users.length; ++i)
    {
        var user = CONFIG.root.users[i];
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
    if (authCookie.name() === "AuthCode" || serviceName === "shell")
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

    // get the user's properties
    var userHome = "";
    var permissions = [];

    if (shares.shares().indexOf(authUser) !== -1)
    {
        userHome = shares.info(authUser).root;
        permissions = [];
    }
    else
    {
        CONFIG.root.users.forEach(function (u)
        {
            if (u.name === authUser)
            {
                userHome = u.home;
                permissions = u.permissions || [];
            }
        });        
    }

    var userContext = new modUserContext.UserContext(authUser,
                                                     userHome,
                                                     permissions);

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
                response.on("unpipe", function () { /*stream.destroy();*/ tracker.end(); });
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
            response.setHeader("DAV", "1, 2");
            response.writeHeadLogged(200, "OK");
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


// say hello!
console.log("                   | Version " + VERSION)
console.log("   .-------.       |");
console.log("  ( Pilvini ).--.  | (c) 2017 - 2019 Martin Grimme");
console.log(" (  Cloud Drive  ) | https://github.com/pycage/pilvini");
console.log("  ```````````````  |");
console.log("                   |")

// read configuration
var configPath = modPath.join(__dirname, "config.json");
var CONFIG = new modConfig.Config(configPath);

if (! CONFIG.root.server)
{
    process.exit(1);
}

// setup authenticators
var codeAuthenticator = new modCodeAuth.Authenticator(CONFIG.root.authentication.realm);
var httpAuthenticator;
if (CONFIG.root.authentication.method === "basic")
{
    httpAuthenticator = new modHttpAuth.Authenticator("Basic", CONFIG.root.authentication.realm);
}
else if (CONFIG.root.authentication.method === "digest")
{
    httpAuthenticator = new modHttpAuth.Authenticator("Digest", CONFIG.root.authentication.realm);
}
else
{
    throw "Invalid authentication method '" + CONFIG.root.authentication.method + "'";
}

// setup fingerprints registry
var fingerprints = { };
CONFIG.root.users.forEach(function (u)
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
var services = { };

var servicesDirs = [
    modPath.join(__dirname, "services"),
    modPath.join(__dirname, "services-nonfree")
];
servicesDirs.forEach(function (path)
{
    if (! modFs.existsSync(path))
    {
        return;
    }
    var items = modFs.readdirSync(path);
    items.forEach(function (item)
    {
        if (item.endsWith(".js"))
        {
            var name = item.replace(/\.js$/, "");
            try
            {
                var module = require(modPath.join(path, item));
                module.init(CONFIG);
            }
            catch (err)
            {
                console.error("Failed to load service: " + name + " (" + err + ")");
            }
        }
    });
});
for (var svc in services)
{
    console.log("Service loaded     | " + svc);
}
console.log("                   |");

services["login"].setAuthenticator(codeAuthenticator);
services["res"].setResourceMap(resourceMap);
services["jsbundle"].setResourceMap(resourceMap);
services["shell"].setExtensions(shellExtensions);


// setup HTTP server
var server;
if (CONFIG.root.server.use_ssl)
{
    try
    {
        var sslServerKey = modFs.readFileSync(modPath.join(__dirname, CONFIG.root.server.ssl_key), "utf8");
        var sslServerCert = modFs.readFileSync(modPath.join(__dirname, CONFIG.root.server.ssl_certificate), "utf8");
        server = modHttps.createServer({ key: sslServerKey, cert: sslServerCert });
    }
    catch (err)
    {
        console.error("Invalid or missing server certificate or key: " + err);
        modProcess.exit(1);
    }
}
else
{
    server = modHttp.createServer();
}

// run HTTP server
server.on("request", handleRequest);
server.listen(CONFIG.root.server.port, CONFIG.root.server.listen);

console.log("Listening....      | Port " + CONFIG.root.server.port + " " + (CONFIG.root.server.use_ssl ? "(SSL)" : ""));
console.log("");
