function viewAudio(href)
{
    function formatTime(seconds)
    {
        var t = seconds;
        var secs = Math.floor(t) % 60;
        t /= 60;
        var minutes = Math.floor(t) % 60;
        t /= 60;
        var hours = Math.floor(t);

        var h = hours.toFixed(0);
        var m = minutes.toFixed(0);
        var s = secs.toFixed(0);

        if (h.length === 1) { h = "0" + h; }
        if (m.length === 1) { m = "0" + m; }
        if (s.length === 1) { s = "0" + s; }

        return (hours > 0 ? h + ":" : "") + m + ":" + s;
    }


    function getAudioFiles()
    {
        var items = $("#filesbox .filelink");
        var audios = [];

        for (var i = 0; i < items.length; ++i)
        {
            var item = items[i];
            var mimeType = $(item).data("mimetype");
            var url = $(item).data("url");

            if (mimeType.indexOf("audio/") === 0)
            {
                audios.push(url);
            }
        }

        return audios;
    }


    /* Fetches metadata for the current track.
     */
    function fetchMetadata()
    {
        var uri = audio.prop("currentUri");

        $.ajax({
            url: "/::tags" + uri,
            type: "GET",
            dataType: "json"
        })
        .done(function (data, status, xhr)
        {
            console.log(JSON.stringify(data));
            audio.prop("metadata", data);
            audio.trigger("pilvini-metadata-changed");
        })
        .fail(function (xhr, status, err)
        {
            showError("Failed to retrieve tags: " + err);
            audio.prop("metadata", { });
            audio.trigger("pilvini-metadata-changed");
        });
    }

    /* Updates the current metadata.
     */
    function updateMetadata()
    {
        function extractTitle(uri)
        {
            var parts = decodeURIComponent(uri).split("/");
            var p = parts[parts.length - 1];
            return p;
        }


        var data = audio.prop("metadata");

        var title = data.TITLE || extractTitle(audio.currentUri);
        var artist = data.ARTIST || "-";
        var cover = data.PICTURE;

        getTitleLabel().html(escapeHtml(title));
        getArtistLabel().html(escapeHtml(artist));
        if (cover)
        {
            var buffer = "";
            var contentType = "";
            
            for (var i = 0; i < cover.mimeType.data.length; ++i)
            {
                contentType += String.fromCharCode(cover.mimeType.data[i]);
            }

            for (i = 0; i < cover.data.length; ++i)
            {
                buffer += String.fromCharCode(cover.data.charCodeAt(i) & 0xff);
            }

            var pic = "data:" + contentType + ";base64," + btoa(buffer);
            getCoverImage().css("background-image", "url(" + pic + ")");
        }
        else
        {
            getCoverImage().css("background-image", "");
        }
    }


    /* Updates the current player position.
     */
    function updatePosition()
    {
        var total = audio.prop("duration");
        var pos = audio.prop("currentTime");
        getProgressBar().css("width", (pos / total * 100.0) + "%");
    }


    /* Updates the play status.
     */
    function updatePlayStatus()
    {
        if (audio.prop("paused"))
        {
            getPlayButton().removeClass("sh-icon-media-pause-circle").addClass("sh-icon-media-play-circle");
        }
        else
        {
            getPlayButton().removeClass("sh-icon-media-play-circle").addClass("sh-icon-media-pause-circle");
        }
    }


    /* Plays the next track. Dismantles the controls after the last track.
     */
    function playNext()
    {
        var playlist = audio.prop("playlist");
        
        if (playlist.length === 0)
        {
            dismantleControls();
            audio.prop("currentUri", "");
            audio.prop("src", "");
            audio.prop("playlist", []);
            audio.prop("metadata", { });
            audio.trigger("pilvini-metadata-changed");
        }
        else
        {
            var nextUri = playlist[0];
            playlist.shift();
            audio.prop("playlist", playlist);

            audio.prop("currentUri", nextUri);
            audio.prop("src", nextUri);
            audio.trigger("play");
            fetchMetadata();
        }
    }


    /* Creates the audio controls.
     */
    function setupControls()
    {
        sh.set_footer("main-page", 80);
    
        var html = "";
        html += "<div class='sh-left' style='width: 80px; background-size: 80px 80px; background-repeat: no-repeat; text-align: center; font-size: 200%; line-height: 80px;'>" +
                "  <span class='sh-fw-icon sh-icon-media-play-circle' style='color: white; text-shadow: #000 0px 0px 1px;'></span>" +
                "</div>" +
        
                "<div class='progressBar sh-font-small' style='position: absolute; top: 0; left: 80px; right: 42px; height: 4px;'>" +
                "  <div style='position: absolute; top: 0; left: 0; width: 0%; height: 4px; background-color: var(--color-primary-background);'></div>" +
                //"  <span class='sh-left' style='padding-top: 4px;'>0</span>" +
                //"  <span class='sh-right' style='padding-top: 4px;'>0</span>" +
                "</div>" +
    
                "<div style='margin-left: 80px; margin-right: 42px; margin-top: 4px; padding-top: 1em; padding-left: 0.5em; text-align: left;'>" +
                "  <h1 style='line-height: 1.2em;'>Title</h1>" +
                "  <h2 style='line-height: 1.2em;' class='sh-font-small'>Artist</h2>" +
                "</div>" +

                "<div class='sh-right' style='width: 42px; text-align: center; border-left: solid 1px var(--color-border); line-height: 80px;'>" +
                "  <span class='sh-fw-icon sh-icon-close'></span>" +
                "</div>";
       
        $("#main-page > footer").html(html);
        $("#main-page > footer").addClass("sh-inverse");

        $("#main-page > footer > div").last().on("click", function ()
        {
            audio.prop("playlist", []);
            playNext();
        });

        /*
        $("#main-page > footer > div:nth-child(3)").on("click", function ()
        {
            sh.set_footer("main-page", $(window).height());

            setTimeout(function ()
            {
                sh.set_footer("main-page", 80);
            }, 1000);
        });
        */


        getPlayButton().on("click", function ()
        {
            if (audio.prop("paused"))
            {
                audio.trigger("play");
            }
            else
            {
                audio.trigger("pause");
            }
        });

        $("#main-page").off("pilvini-page-replaced.audio").on("pilvini-page-replaced.audio", function ()
        {
            setupControls();
            updateMetadata();
            updatePosition();
            updatePlayStatus();
        });
    }

    function dismantleControls()
    {
        $("#main-page").off("pilvini-page-replaced.audio");
        $("#main-page > footer").html("");
        sh.set_footer("main-page", 0);
    }

    function getPlayButton()
    {
        return $("#main-page > footer > div:nth-child(1) span");
    }

    function getCoverImage()
    {
        return $("#main-page > footer > div:nth-child(1)");
    }

    function getProgressBar()
    {
        return $("#main-page > footer div.progressBar div");
    }

    function getProgressLabels()
    {
        return $("#main-page > footer div.progressBar span");
    }

    function getTitleLabel()
    {
        return $("#main-page > footer h1");
    }

    function getArtistLabel()
    {
        return $("#main-page > footer h2");
    }


    var audio = $("#audio");

    audio.off("durationchange.audio").on("durationchange.audio", function ()
    {
        updatePosition();
    });

    audio.off("timeupdate.audio").on("timeupdate.audio", function ()
    {
        updatePosition();
    });

    audio.off("pause.audio").on("pause.audio", function ()
    {
        updatePlayStatus();
    });

    audio.off("play.audio").on("play.audio", function ()
    {
        updatePlayStatus();
    });

    audio.off("ended.audio").on("ended.audio", function ()
    {
        playNext();
    });

    audio.off("pilvini-metadata-changed.audio").on("pilvini-metadata-changed.audio", function ()
    {
        console.log("Metadata changed");
        updateMetadata();
    });


    if (getPlayButton().length === 0)
    {
        setupControls();
    }

    var playlist = audio.prop("playlist") || [];
    playlist.push(href);
    console.log("playlist: " + playlist);
    audio.prop("playlist", playlist);

    if ((audio.prop("currentUri") || "") === "")
    {
        playNext();
    }
}