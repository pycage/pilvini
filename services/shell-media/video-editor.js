"use strict";

(function ()
{
    function formatTime(seconds)
    {
        var t = seconds;
        var hsecs = Math.floor(t * 100) % 100;
        var secs = Math.floor(t) % 60;
        t /= 60;
        var minutes = Math.floor(t) % 60;
        t /= 60;
        var hours = Math.floor(t);

        var h = hours.toFixed(0);
        var m = minutes.toFixed(0);
        var s = secs.toFixed(0);
        var hs = hsecs.toFixed(0);

        if (h.length === 1) { h = "0" + h; }
        if (m.length === 1) { m = "0" + m; }
        if (s.length === 1) { s = "0" + s; }
        if (hs.length === 1) { hs = "0" + hs; }

        return (hours > 0 ? h + ":" : "") + m + ":" + s + "." + hs;
    }

    function showCutDialog(uri, ranges)
    {
        var idx = uri.lastIndexOf("/");
        var path = idx !== -1 ? uri.substr(0, idx) : "";
        var filename = decodeURIComponent(idx !== -1 ? uri.substr(idx + 1) : uri);
        idx = filename.lastIndexOf(".");
        var name = idx !== -1 ? filename.substr(0, idx) : filename;
        var ext = idx !== -1 ? filename.substr(idx) : "";

        var dlg = sh.element(sh.Dialog).title("Cut Video")
        .button(
            sh.element(sh.Button).text("Cut")
            .onClicked(function ()
            {
                var directions = { };
                for (var i = 0; i < ranges.length; ++i)
                {
                    var target = dlg.find("target." + (i + 1)).get().text;
                    var targetUri = path + "/" + encodeURIComponent(target);
                    if (! directions[targetUri])
                    {
                        directions[targetUri] = [];
                    }
                    directions[targetUri].push(ranges[i]);
                }
                cutVideo(uri, directions);
                dlg.close_();
            })
        )
        .button(
            sh.element(sh.Button).text("Cancel")
            .onClicked(function ()
            {
                dlg.close_();
            })
        )
        .add(
            sh.element(sh.Label)
            .text("You may combine multiple ranges in the same output file.")
        );

        var counter = 1;
        ranges.forEach(function (range)
        {
            dlg.add(
                sh.element(sh.Labeled)
                .text("Range " + counter + " <" + formatTime(range[0]) + " - " + formatTime(range[1]) + ">")
                .add(
                    sh.element(sh.TextInput).id("target." + counter)
                    .text(name + "_" + counter + ext)
                )
            );
            ++counter;
        });
        dlg.show_();
    }

    function cutVideo(uri, directions)
    {
        var busyIndicator = sh.element(sh.BusyPopup).text("Sending");
        busyIndicator.show_();

        var data = {
            uri: uri,
            directions: directions
        };

        $.ajax({
            type: "POST",
            url: "/::video-editor/cut",
            data: JSON.stringify(data)
        })
        .done(function (data, status, xhr)
        {
            var statusItem = new ui.StatusItem();
            statusItem.icon = "sh-icon-media-cut";
            statusItem.text = "Waiting...";
            files.pushStatus(statusItem);
            getStatus(statusItem);
        })
        .fail(function (xhr, status, err)
        {
            ui.showError("Could not submit to server: " + err);
        })
        .always(function ()
        {
            busyIndicator.hide_();
        })
    }

    function getStatus(statusItem)
    {
        $.ajax({
            type: "GET",
            url: "/::video-editor/status",
            dataType: "json"
        })
        .done(function (data, status, xhr)
        {
            if (data.name)
            {
                statusItem.text = "Cutting Video: " + data.name;
                statusItem.progress = data.seconds / data.total * 100;
                setTimeout(function () { getStatus(statusItem); }, 1000);
            }
            else
            {
                files.popStatus(statusItem);
            }
        })
        .fail(function (xhr, status, err)
        {
            files.popStatus(statusItem);
        })
        .always(function ()
        {
            
        });
    }

    function MarkersBar()
    {
        Object.defineProperties(this, {
            position: { set: setPosition, get: position, enumerable: true },
            duration: { set: setDuration, get: duration, enumerable: true },
            inverse: { set: setInverse, get: inverse, enumerable: true },
            onSeeked: { set: setOnSeeked, get: onSeeked, enumerable: true },
            onRangesChanged: { set: setOnRangesChanged, get: onRangesChanged, enumerable: true }
        });

        var m_position = 0;
        var m_duration = 0;
        var m_markers = [];
        var m_inverse = false;
        var m_onSeeked = null;
        var m_onRangesChanged = null;

        var m_item = $(
            sh.tag("div")
            .style("position", "relative")
            .style("height", "2rem")
            .style("line-height", "2rem")
            .content(
                sh.tag("div")
                .style("position", "absolute")
                .style("top", "0")
                .style("left", "0")
                .style("width", "100%")
                .style("height", "100%")
            )
            .html()
        );

        m_item.on("click", function (event)
        {
            if (m_onSeeked && m_markers.length > 0)
            {
                var p = Math.max(0, Math.min(1, event.offsetX / $(this).width()));
                var seconds = p * m_duration;
                m_onSeeked(closestMarker(seconds));
            }
        });

        function closestMarker(seconds)
        {           
            var markers = m_markers.map(function (m)
            {
                return [m, Math.abs(m - seconds)];
            })
            .sort(function (a, b)
            {
                return a[1] - b[1];
            });

            if (markers.length > 0)
            {
                return markers[0][0];
            }
            else
            {
                return null;
            }
        }

        function setPosition(pos)
        {
            m_position = pos;
        }

        function position()
        {
            return m_position;
        }

        function setDuration(duration)
        {
            m_duration = duration;
            updateRanges();
        }

        function duration()
        {
            return m_duration;
        }

        function setInverse(v)
        {
            m_inverse = v;
            updateRanges();
        }

        function inverse()
        {
            return m_inverse;
        }

        function setOnSeeked(cb)
        {
            m_onSeeked = cb;
        }

        function onSeeked()
        {
            return m_onSeeked;
        }

        function setOnRangesChanged(cb)
        {
            m_onRangesChanged = cb;
        }

        function onRangesChanged()
        {
            return m_onRangesChanged;
        }

        function updateRanges()
        {
            if (m_duration === 0)
            {
                return;
            }

            var ranges = [];
            var markers = m_markers.slice();
            if (! m_inverse)
            {
                markers.push(0);
            }
            markers.sort(function (a, b) { return a - b; });

            for (var i = 0; i < markers.length; i += 2)
            {
                var begin = markers[i];
                var end = i + 1 < markers.length ? markers[i + 1] : m_duration;
                ranges.push([begin, end]);
            }

            m_item.find("> div:nth-child(1)").each(function (i)
            {
                var box = $(this);
                while (box.find("> div").length > ranges.length)
                {
                    box.find("> div").last().remove();
                }
                while (box.find("> div").length < ranges.length)
                {
                    box.append(
                        sh.tag("div")
                        .style("position", "absolute")
                        .style("background-color", "rgba(255, 255, 0, 0.3)")
                        .style("border-left", "solid 2px var(--color-primary)")
                        .style("border-right", "solid 2px var(--color-primary)")
                        .style("top", "0")
                        .style("bottom", "0")
                        .style("pointer-events", "none")
                        .style("touch-action", "none")
                        .html()
                    );
                }
    
                var gauges = box.find("> div");
                for (var i = 0; i < ranges.length; ++i)
                {
                    console.log("range " + i + ": " + ranges[i][0] + " - " + ranges[i][1]);
                    gauges.eq(i)
                    .css("left", (ranges[i][0] / m_duration * 100) + "%")
                    .css("right", (100 - ranges[i][1] / m_duration * 100) + "%");
                }
            });

            if (m_onRangesChanged)
            {
                m_onRangesChanged(ranges);
            }
        }

        this.get = function ()
        {
            return m_item;
        };

        this.addMarker = function ()
        {
            m_markers.push(m_position);
            updateRanges();
        };

        this.removeMarker = function ()
        {
            if (m_markers.length > 0)
            {
                var marker = closestMarker(m_position);
                m_markers = m_markers.filter(function (m)
                {
                    return Math.abs(m - marker) > 0.01;
                });
                updateRanges();
            }
        }
    }

    shellMedia.VideoEditor = function ()
    {
        Object.defineProperties(this, {
            uri: { set: setUri, get: uri, enumerable: true },
            position: { set: setPosition, get: position, enumerable: true },
            duration: { set: setDuration, get: duration, enumerable: true },
            onChanged: { set: setOnChanged, get: onChanged, enumerable: true },
            onSeeked: { set: setOnSeeked, get: onSeeked, enumerable: true }
        });

        var m_uri = "";
        var m_position = 0;
        var m_duration = 0;
        var m_onChanged = null;
        var m_onSeeked = null;
        var m_ranges = [];

        sh.extend(this, new sh.Box());

        var m_markersBar = new MarkersBar();
        m_markersBar.onSeeked = function (seconds)
        {
            if (m_onSeeked)
            {
                m_onSeeked(seconds);
            }
        };
        m_markersBar.onRangesChanged = function (ranges)
        {
            m_ranges = ranges;
            cutButton.enabled = (m_ranges.length > 0);
        }
        this.add(m_markersBar);

        var m_toolbar = new sh.Toolbar();
        this.add(m_toolbar);

        var btn = new sh.IconButton();
        btn.icon = "sh-icon-scissors";
        btn.onClicked = function ()
        {
            m_markersBar.addMarker();
        };
        m_toolbar.add(btn);

        btn = new sh.IconButton();
        btn.icon = "sh-icon-trashcan";
        btn.onClicked = function ()
        {
            m_markersBar.removeMarker();
        };
        m_toolbar.add(btn);

        var gap = new sh.Gap();
        m_toolbar.add(gap);

        btn = new sh.IconButton();
        btn.icon = "sh-icon-flip-horizontal";
        btn.onClicked = function ()
        {
            m_markersBar.inverse = ! m_markersBar.inverse;
        };
        m_toolbar.add(btn);

        gap = new sh.Gap();
        m_toolbar.add(gap);

        btn = new sh.IconButton();
        btn.icon = "sh-icon-media-rwd1";
        btn.onClicked = function ()
        {
            if (m_onSeeked)
            {
                m_onSeeked(Math.max(0, m_position - 1.0));
            }
        };
        m_toolbar.add(btn);

        btn = new sh.IconButton();
        btn.icon = "sh-icon-media-rwd";
        btn.onClicked = function ()
        {
            if (m_onSeeked)
            {
                m_onSeeked(Math.max(0, m_position - 1.0 / 30));
            }
        };
        m_toolbar.add(btn);

        btn = new sh.IconButton();
        btn.icon = "sh-icon-media-fwd";
        btn.onClicked = function ()
        {
            if (m_onSeeked)
            {
                m_onSeeked(Math.min(m_duration, m_position + 1.0 / 30));
            }
        };
        m_toolbar.add(btn);

        btn = new sh.IconButton();
        btn.icon = "sh-icon-media-fwd1";
        btn.onClicked = function ()
        {
            if (m_onSeeked)
            {
                m_onSeeked(Math.min(m_duration, m_position + 1.0));
            }
        };
        m_toolbar.add(btn);

        var cutButton = new sh.IconButton();
        cutButton.icon = "sh-icon-accept";
        cutButton.enabled = false;
        cutButton.onClicked = function ()
        {
            showCutDialog(m_uri, m_ranges);
        }
        m_toolbar.right = cutButton;


        function setUri(uri)
        {
            m_uri = uri;
        }

        function uri()
        {
            return m_uri;
        }

        function setPosition(seconds)
        {
            m_position = seconds;
            m_markersBar.position = seconds;
        }

        function position()
        {
            return m_position;
        }

        function setDuration(seconds)
        {
            m_duration = seconds;
            m_markersBar.duration = seconds;
        }

        function duration()
        {
            return m_duration;
        }

        function setOnChanged(cb)
        {
            m_onChanged = cb;
        }

        function onChanged()
        {
            return m_onChanged;
        }

        function setOnSeeked(cb)
        {
            m_onSeeked = cb;
        }

        function onSeeked()
        {
            return m_onSeeked;
        }
    };

})();
