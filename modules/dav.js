"use strict";

const modPath = require("path");

const modUtils = require("./utils.js"),
      modXmlsax = require("./xmlsax.js"),
      modVfs = require("./vfs.js"),
      modZip = require("./zip.js");


var CountToken = function (count, callback)
{
    this.decrease = function ()
    {
        --count;
        if (count === 0)
        {
            callback();
        }
    };

    if (count === 0)
    {
        callback();
    }
};

function pathFromHref(href, contentRoot)
{
    return modUtils.uriToPath(href, contentRoot);
    /*
    var hrefDecoded = decodeURIComponent(href);
    var path = modPath.join(contentRoot, hrefDecoded.replace("/", modPath.sep));
    return path;
    */
}

function readCollection(path, callback)
{
    modVfs.readdir(path,
                  //"utf-8",
                  function(err, files)
                  {
                      if (err || ! files || files.length === 0)
                      {
                          callback([]);
                          return;
                      }

                      var fileStats = [];
                      for (var i = 0; i < files.length; ++i)
                      {
                          var name = files[i];
                          modVfs.stat(modPath.join(path, name),
                                     function(path, name)
                                     {
                                         return function(err, stats)
                                         {
                                             if (! err)
                                             {
                                                 fileStats.push({ "path": path, "name": name, "stats": stats });
                                             }
                                             else
                                             {
                                                 fileStats.push({ "path": path, "name": name, "stats": null });
                                             }
                                             if (fileStats.length === files.length)
                                             {
                                                 callback(fileStats);
                                             }
                                         };
                                     }(path, name));
                      }
                  });
}

function formatDate(d)
{
    function padded(v, n, c)
    {
        var s = "" + v;
        while (s.length < n) s = c + s;
        return s;
    }

    var tzOffset = d.getTimezoneOffset();
    var offsetHours = Math.abs(tzOffset) / 60;
    var offsetMinutes = Math.abs(tzOffset) % 60;

    return d.getFullYear() + "-" +
           padded(d.getMonth() + 1, 2, '0') + "-" +
           padded(d.getDate(), 2, '0') + "T" +
           padded(d.getHours(), 2, '0') + ":" +
           padded(d.getMinutes(), 2, '0') + ":" +
           padded(d.getSeconds(), 2, '0') + (tzOffset < 0 ? "+" : "-") +
           padded(offsetHours, 2, '0') + ":" + padded(offsetMinutes, 2, '0'); //1997-12-01T17:42:21-08:00
}

function hasProperty(props, prop)
{
    return props.indexOf("DAV::allprop") != -1 || props.indexOf(prop) != -1;
}

function makeResponseXml(href, fileInfo, requestedProperties)
{
    var xml = "<D:response>" +
              "<D:href>" + href + "</D:href>" +
              "<D:propstat>" +
              "<D:prop>";
    
    if (hasProperty(requestedProperties, "DAV::displayname"))
    {
        xml += "<D:displayname>" + fileInfo.name + "</D:displayname>";
    }
    if (hasProperty(requestedProperties, "DAV::creationdate"))
    {
        xml += "<D:creationdate>" + formatDate(fileInfo.stats.ctime) + "</D:creationdate>";
    }
    if (hasProperty(requestedProperties, "DAV::getlastmodified"))
    {
        xml += "<D:getlastmodified>" + fileInfo.stats.mtime.toUTCString() + "</D:getlastmodified>";
    }
    if (hasProperty(requestedProperties, "DAV::getcontentlength"))
    {
        xml += "<D:getcontentlength>" + fileInfo.stats.size + "</D:getcontentlength>";
    }
    if (hasProperty(requestedProperties, "DAV::getcontenttype"))
    {
        xml += "<D:getcontenttype>application/x-octet-string</D:getcontenttype>";
    }
    if (hasProperty(requestedProperties, "DAV::resourcetype"))
    {
        xml += "<D:resourcetype>" +
               (fileInfo.stats.isDirectory() ? "<D:collection/>"
                                             : "") +
               "</D:resourcetype>";
    }
    xml += "</D:prop>" +
           "<D:status>HTTP/1.1 200 OK</D:status>" +
           "</D:propstat>" +
           "</D:response>";
    return xml;
}


var DavSession = function(home)
{
    var that = this;
    var m_home = home;

    that.copy = function(href, destinationHref, resultCallback)
    {
        function recursiveCopy(src, dest, callback)
        {
            modVfs.stat(src, function (err, stats)
            {
                if (err)
                {
                    console.error(err);
                    callback("Internal Server Error");
                }
                else if (stats.isDirectory())
                {
                    modVfs.readdir(src, function (err, files)
                    {
                        if (err)
                        {
                            console.error(err);
                            callback("Forbidden");
                        }
                        else
                        {
                            modVfs.mkdir(dest, function (err)
                            {
                                if (err)
                                {
                                    console.error(err);
                                    callback("Forbidden");
                                }
                                else
                                {
                                    var token = new CountToken(files.length, function ()
                                    {
                                        callback();
                                    });

                                    for (var i = 0; i < files.length; ++i)
                                    {
                                        recursiveCopy(modPath.join(src, files[i]), modPath.join(dest, files[i]), function (err)
                                        {
                                            token.decrease();
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
                else
                {
                    modVfs.createReadStream(src, function (reader)
                    {
                        if (! reader)
                        {
                            callback("Forbidden");
                            return;
                        }
                        modVfs.createWriteStream(dest, function (writer)
                        {
                            if (! writer)
                            {
                                callback("Forbidden");
                                return;
                            }
                            writer.on("error", function (err)
                            {
                                console.log(err);
                                callback("Forbidden");
                            });
                            reader.on("end", function ()
                            {
                                callback();
                            });
                            reader.pipe(writer);
                        });
                    });
                }
            });
        }

        var path = pathFromHref(href, m_home);
        console.log("path " + path);
        var destinationPath = pathFromHref(destinationHref, m_home);
        console.log("destinationPath " + destinationPath);

        console.debug("Copy: " + path + " -> " + destinationPath);

        recursiveCopy(path, destinationPath, function (err)
        {
            if (err)
            {
                resultCallback(401, "Forbidden");
            }
            else
            {
                resultCallback(201, "Copied");
            }
        });
    };

    that.del = function(href, resultCallback)
    {
        var path = pathFromHref(href, m_home);

        function recursiveDelete(path, callback)
        {
            modVfs.stat(path, function (err, stats)
            {
                if (err)
                {
                    console.error(err);
                    callback("Internal Server Error");
                }
                else if (stats.isDirectory())
                {
                    modVfs.readdir(path, function (err, files)
                    {
                        if (err)
                        {
                            console.error(err);
                            callback("Failed to read directory");
                        }
                        else
                        {
                            var token = new CountToken(files.length, function ()
                            {
                                modVfs.rmdir(path, function(err)
                                {
                                    if (err)
                                    {
                                        console.error(err);
                                        callback("Forbidden");
                                    }
                                    else
                                    {
                                        console.debug("Deleted " + path);
                                        callback();
                                    }
                                });
                            });

                            for (var i = 0; i < files.length; ++i)
                            {
                                recursiveDelete(modPath.join(path, files[i]), function (err)
                                {
                                    token.decrease();
                                });
                            }
                        }
                    });
                }
                else
                {
                    modVfs.unlink(path, function(err)
                    {
                        if (err)
                        {
                            console.error(err);
                            callback("Forbidden");
                        }
                        else
                        {
                            console.debug("Deleted " + path);
                            callback();
                        }
                    });
                }
            });
        }

        recursiveDelete(path, function (err)
        {
            if (err)
            {
                resultCallback(403, "Forbidden");
            }
            else
            {
                console.debug("Deleted " + path);
                resultCallback(204, "No Content");
            }
        });
    };
    
    that.get = function(href, range, resultCallback)
    {
        var path = pathFromHref(href, m_home);
        console.debug("Get for " + path + ", range: " + range);

        // TODO: compression and chunked
        
        // try to open first to work around crash with EACCES while streaming
        modVfs.open(path, "r", function (err, fd)
        {
            if (err)
            {
                resultCallback(403, "Forbidden", 0, -1, 0, null, 0);
                return;
            }
            modVfs.close(fd, function () { });

            modVfs.stat(path, function (err, stats)
            {
                if (err)
                {
                    resultCallback(403, "Forbidden", 0, -1, 0, null, 0);
                    return;
                }
    
                if (stats.isDirectory())
                {
                    modZip.makeZip(path, function (err, stream)
                    {
                        if (err)
                        {
                            resultCallback(500, "Internal Server Error", 0, -1, 0, null, 0);
                        }
                        else
                        {
                            resultCallback(200, "OK", 0, -1, 0, stream, -1);
                        }
                    });
                    return;
                }

                console.log("read");
                if (range.length == 0)
                {
                    modVfs.createReadStream(path, function (stream)
                    {
                        resultCallback(200, "OK", 0, -1, stats.size, stream, stats.size);
                    });
                }
                else
                {
                    var from = Math.min(range[0],
                                        stats.size - 1);
                    var to = Math.min(range[1] !== -1 ? range[1] : stats.size - 1,
                                      stats.size - 1);
    
                    console.debug("Bytes Range: " + from + "-" + to + "/" + stats.size);
                    modVfs.createReadStreamRanged(path, from, to, function (stream)
                    {
                        resultCallback(206, "Partial Content", from, to, stats.size, stream, to - from + 1);
                    });
                }
            });
        });

    };

    that.head = function(href, resultCallback)
    {
        var path = pathFromHref(href, m_home);
        console.debug("Head for " + path);

        modVfs.stat(path, function(err, stats)
        {
            if (err)
            {
                resultCallback(403, "Forbidden", 0);
            }
            else
            {
                resultCallback(200, "OK", stats.size);
            }
        });
    };
    
    that.lock = function(href, depth, timeout, resultCallback)
    {
        var path = pathFromHref(href, m_home);
        
        modVfs.stat(path, function(err, stats)
        {
            if (err)
            {
                modVfs.writeFile(path, "", function (err)
                {
                    if (err)
                    {
                        resultCallback(403, "Forbidden");
                    }
                    else
                    {
                        resultCallback(200, "OK");
                    }
                });
            }
            else
            {
                resultCallback(200, "OK");
            }
        });
    };

    that.mkcol = function(href, resultCallback)
    {
        var path = pathFromHref(href, m_home);
    	
    	modVfs.mkdir(path, function(err)
        {
            if (err)
            {
                resultCallback(403, "Forbidden");
            }
            else
            {
                resultCallback(201, "Created");
            }
        });
    };
    
    that.move = function(href, destinationHref, resultCallback)
    {
        var path = pathFromHref(href, m_home);
        var destinationPath = pathFromHref(destinationHref, m_home);

        console.debug("Move: " + path + " -> " + destinationPath);
        
        modVfs.rename(path, destinationPath, function(err)
        {
            if (err)
            {
                console.error(err);
                resultCallback(409, "Conflict");
            }
            else
            {
                resultCallback(201, "Moved");
            }
        });
    };
    
    that.propfind = function(href, depth, xml, resultCallback)
    {
        if (xml === "")
        {
            xml = "<D:propstat xmlns:D='DAV:'><D:allprop/></D:propstat>";
        }

        var handler = new modXmlsax.Handler();
        var parser = new modXmlsax.Parser(handler);
        parser.parseString(xml);

        var doc = handler.document();
        if (! doc)
        {
            resultCallback(500, "Internal error", "ERROR");
            return;
        }

        // get list of requested properties
        var props = [];
        for (var i = 0; i < doc.children.length; ++i)
        {
            if (doc.children[i].name === "DAV::prop")
            {
                var propNode = doc.children[i];
                for (var j = 0; j < propNode.children.length; ++j)
                {
                    if (propNode.children[j].type !== "tag")
                    {
                        continue;
                    }
                    props.push(propNode.children[j].name);
                }
            }
            else if (doc.children[i].name === "DAV::allprop")
            {
                props.push(doc.children[i].name);
            }
        }

        console.debug("Props: " + props);

        var path = pathFromHref(href, m_home);
        modVfs.stat(path, function(err, stats)
        {
            if (err)
            {
                resultCallback(404, "Resource Not Available", "");
            }
            else if (stats.isDirectory() && depth !== "0")
            {
                readCollection(path, function(fileStats)
                {
                    var xml = "<?xml version='1.0' encoding='utf-8'?>" +
                              "<D:multistatus xmlns:D='DAV:'>";

                    for (var i = 0; i < fileStats.length; ++i)
                    {
                        var obj = fileStats[i];
                        if (! obj.stats)
                        {
                            // invalid file
                            continue;
                        }

                        var fileHref = modPath.posix.join(href, encodeURIComponent(obj.name));
                        xml += makeResponseXml(fileHref, obj, props);
                    }

                    xml += "</D:multistatus>";

                    resultCallback(207, "Multi-Status", xml);
                });
            }
            else
            {
                var fileInfo = {
                        "path": path,
                        "name": modPath.basename(path),
                        "stats": stats
                };
                var xml = "<?xml version='1.0' encoding='utf-8'?>" +
                          "<D:multistatus xmlns:D='DAV:'>" +
                          makeResponseXml(href, fileInfo, props) +
                          "</D:multistatus>";

                resultCallback(207, "Multi-Status", xml);
            }
        });
    };
    
    that.put = function(href, stream, resultCallback)
    {
        var path = pathFromHref(href, m_home);
        
        // TODO: preserve stats
        modVfs.open(path, "w", function(err, fd)
        {
            if (err)
            {
                console.error(err);
                resultCallback(409, "Conflict");
                return;
            }

            console.debug("Writing file " + path);
            
            modVfs.createWriteStreamFd(fd, function (writeStream)
            {
                stream.on("data", function(data)
                {
                    console.debug("Writing chunk: " + data.length + " bytes");
                    writeStream.write(data);
                });
                
                stream.on("end", function()
                {
                    writeStream.end();
                });
                
                writeStream.on("finish", function()
                {
                    console.debug("File written");
                    resultCallback(200, "OK");
                });
            });
        });
    };
};
exports.DavSession = DavSession;
