"use strict";

const modCrypto = require("crypto"),
      modFs = require("fs"),
      modHttp = require("http"),
      modHttps = require("https"),
      modLwip = require("lwip"),
      modPath = require("path"),
      modUrl = require("url"),
      modZlib = require("zlib"),
      modCookies = require("./modules/cookies"),
      modHttpAuth = require("./modules/httpauth.js"),
      modBrowser = require("./modules/browser.js"),
      modDav = require("./modules/dav.js"),
      modLockStore = require("./modules/lockstore.js"),
      modMime = require("./modules/mime.js");

const VERSION = "0.1.0";

console.debug = function(msg)
{
    if (config.global && config.global.debug)
    {
        console.log("[" + new Date().toLocaleString() + "] [DEBUG] >>>\n" +
                    msg +
                    "\n<<<");
    }
};

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

function parseRange(range)
{
    var parts = range.split("=");
    if (parts[0] === "bytes")
    {
        parts = parts[1].split("-");
        return [parts[0], parts[1]];
    }
    else
    {
        return [0, -1];
    }
}

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

function handleRequest(request, response)
{
    // check for authorization
    var authUser = basicAuth.authorize(request);
    if (! authUser)
    {
        basicAuth.requestAuthorization(response, "Users");
        response.write("Authorization required.");
        response.end();
        return;
    }

    response.request = request;
    response.user = authUser;
    response.writeHeadLogged = function (code, status)
    {
        console.log("[" + new Date().toLocaleString() + "] [Server] " +
                    "[client " + this.user + "@" + this.connection.remoteAddress + ":" + this.connection.remotePort + "] " +
                    "< " + this.request.method + " " + this.request.url + " : " +
                    "HTTP " + code + " " + status);
        this.writeHead(code, status);
    };

    var urlObj = modUrl.parse(request.url, true);

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

    var headerString = "Header:";
    for (var header in request.headers)
    {
        headerString += "\n - " + header + " = " + request.headers[header];
    }
    console.debug(headerString);

    var userHome = ".";
    for (var i = 0; i < config.users.length; ++i)
    {
        if (config.users[i].name === authUser)
        {
            userHome = config.users[i].home;
            break;
        }
    }

    // obtain or create session
    /*
    var cookie = modCookies.getCookie(request, "SessionId");
    if (! cookie.name())
    {
        modCookies.setCookie(response, new modCookies.Cookie("SessionId", "42"));
    }
    */

    var davSession = new modDav.DavSession(userHome);

    if (request.method === "COPY")
    {
        var destinationUrlObj = modUrl.parse(request.headers.destination, true);

        davSession.copy(urlObj.pathname, destinationUrlObj.pathname, function(code, status)
        {
            // TODO: multistatus
            response.writeHeadLogged(code, status);
            response.end();
        });
    }
    else if (request.method === "DELETE")
    {
    	davSession.del(urlObj.pathname,
    			       function(code, status)
    			       {
                           response.writeHeadLogged(code, status);
    					   response.end();
    			       });
    }
    else if (request.method === "GET")
    {
        if (urlObj.pathname.indexOf("/index.html") !== -1 &&
                urlObj.pathname.indexOf("/index.html") === urlObj.pathname.length - 11)
        {
            modBrowser.makeIndex(modPath.dirname(urlObj.pathname), userHome, function (ok, data)
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
            });
            return;
        }
        else if (urlObj.pathname.indexOf("/::thumbnail/") === 0)
        {
            var thumbDir = modPath.join(userHome, ".thumbnails");

            var href = urlObj.pathname.substr(12);
            var hrefUrl = decodeURI(href);
            var imageFile = modPath.join(userHome, hrefUrl.replace("/", modPath.sep));

            var hash = modCrypto.createHash("md5");
            hash.update(imageFile);
            var thumbFile = modPath.join(thumbDir, hash.digest("hex") + ".png");

            modFs.stat(thumbFile, function (err, stats)
            {
                if (! err)
                {
                    getFile(response, thumbFile);
                }
                else
                {
                    modFs.mkdir(thumbDir, function (err)
                    {
                        modLwip.open(imageFile, function (err, image)
                        {
                            if (! err)
                            {
                                var scale = Math.max(80 / image.width(), 80 / image.height());

                                console.log("Image batch start: " + imageFile + " to " + thumbFile);
                                image.batch().scale(scale).writeFile(thumbFile, function (err)
                                {
                                    console.log("Image batch end: " + imageFile);
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
                                });
                            }
                            else
                            {
                                console.error(err);
                                response.writeHeadLogged(500, "Internal Server Error");
                                response.end();
                            }
                        });
                    });
                }
            });
            return;
        }
        else if (urlObj.pathname.indexOf("/::res/") === 0)
        {
            var res = urlObj.pathname.substr(7);
            var path = modPath.join(__dirname, "res", res);

            getFile(response, path);
            return;
        }

        /* Header: range = bytes=248426-252521 */
        var range = [0, -1];
        if (request.headers.range)
        {
            range = parseRange(request.headers.range);
        }
        
        davSession.get(urlObj.pathname, range,
                       function(code, status, from, to, size, out)
                       {
                           if (code === 206 && to !== -1)
                           {
                               console.log("Ranged GET " + "bytes " + from + "-" + to + "/" + size);
                               response.setHeader("Content-Range", "bytes " + from + "-" + to + "/" + size);
                           }
                           response.setHeader("Content-Length", out.length);
                           response.setHeader("Content-Type", modMime.mimeType(urlObj.pathname));
                           console.debug("Content-Type: " + modMime.mimeType(urlObj.pathname));
                           response.writeHeadLogged(code, status);
                           response.write(out);
                           response.end();
                       });
    }
    else if (request.method === "LOCK")
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
    	readRequest(request,
    			    function(xml)
    			    {
    	                var depth = request.headers.depth || "infinity";
    	                var timeout = request.headers.timeout || "";
    	                
                        console.debug(xml);
    				  	
    				  	davSession.lock(urlObj.pathname, depth, timeout,
    				  	                function(code, status)
    				  	                {
                                            response.writeHeadLogged(code, status);
    				  	                    response.end();
    				  	                });
    			    });
    }
    else if (request.method === "MKCOL")
    {
    	davSession.mkcol(urlObj.pathname,
    					 function(code, status)
    					 {
                             response.writeHeadLogged(code, status);
    					     response.end();
    					 });
    }
    else if (request.method === "MOVE")
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
        readRequest(request,
                    function(xml)
                    {
                        console.debug(xml);
                        response.setHeader("DAV", "2");
                        response.end();
                    });
    }
    else if (request.method === "POST")
    {
        response.end();
    }
    else if (request.method === "PROPFIND")
    {
        readRequest(request, function(xml)
        {
            console.debug(xml);
            var depth = request.headers.depth || "infinity";
                        
            davSession.propfind(urlObj.pathname, depth, xml,
                                function(code, status, out)
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
    else if (request.method === "PUT")
    {
        davSession.put(urlObj.pathname, request, function(code, status)
        {
            response.writeHeadLogged(code, status);
            response.end();
        });
        /*
    	readRequest(request,
    				function(putData)
    				{
    					console.log("Writing " + putData.length + " bytes");
    					
    					davSession.put(urlObj.pathname, putData,
    							  	   function(code, status)
    							  	   {
    								   	   console.log(code + " " + status);
                                           response.writeHeadLogged(code, status);
    								   	   response.end();
    							  	   });
    				});
    				*/
    }
    else
    {
        response.writeHeadLogged(405, "Method Not Allowed");
    	response.end();
    }
}

var config = JSON.parse(modFs.readFileSync(modPath.join(__dirname, "config.json"), "utf8"));

var authUsers = { };
for (var i = 0; i < config.users.length; ++i)
{
    var user = config.users[i];
    authUsers[user.name] = user.password_hash;
}
var basicAuth = new modHttpAuth.Authenticator("Basic", authUsers);

var server;
if (config.server.use_ssl)
{
    var sslServerKey = modFs.readFileSync(modPath.join(__dirname, config.server.ssl_key), "utf8");
    var sslServerCert = modFs.readFileSync(modPath.join(__dirname, config.server.ssl_certificate), "utf8");
    server = modHttps.createServer({ key: sslServerKey, cert: sslServerCert });
}
else
{
    server = modHttp.createServer();
}

server.on("request", handleRequest);
server.listen(config.server.port, config.server.listen);

console.log("                   | Version " + VERSION)
console.log("   .-------.       |");
console.log("  ( Pilvini ).--.  | (c) 2017 Martin Grimme");
console.log(" (  Cloud Drive  ) | https://github.com/pycage/pilvini");
console.log("  ```````````````  |");
console.log("Listening....      | Port " + config.server.port + " " + (config.server.use_ssl ? "(SSL)" : ""));
console.log("");
