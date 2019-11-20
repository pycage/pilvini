"use strict";

const mods = [
    "shellfish/low",
    "shellfish/mid",
    "shellfish/high",
    "shell/mime-registry"
];

require(mods, function (low, mid, high, mimeReg)
{
    function ViewBox()
    {
        Object.defineProperties(this, {
            text: { set: setText, get: text, enumerable: true }
        });

        var m_text = "";
        var m_box = $(
            low.tag("pre")
            .style("display: none")
            .style("padding", "0.5em")
            .html()
        );

        function setText(text)
        {
            m_box.html(low.escapeHtml(text));
            m_text = text;
        }

        function text()
        {
            return m_text;
        }

        this.get = function ()
        {
            return m_box;
        };

        mid.initAs(this, mid.VISUAL);
    }

    function EditBox()
    {
        Object.defineProperties(this, {
            text: { set: setText, get: text, enumerable: true }
        });

        var m_box = $(
            low.tag("textarea")
            .style("display: none")
            .style("padding", "1em")
            .style("width", "100vw")
            .style("height", "calc(100vh - 3rem)")
            .html()
        );

        function setText(text)
        {
            m_box.val(text);
        }

        function text()
        {
            return m_box.val();
        }

        this.get = function ()
        {
            return m_box;
        };

        mid.initAs(this, mid.VISUAL);
    }


    function viewText(href)
    {
        // 0 = view, 1 = edit
        var m_displayMode = high.binding(0);
        var m_data = high.binding("");
        var m_originalContent = "";
  
        function toggleMode()
        {
            if (m_displayMode.value() === 0)
            {
                m_displayMode.assign(1);
            }
            else
            {
                m_displayMode.assign(0);
                m_data.assign(page.find("editbox").get().text);
            }
        }
    
        function upload(href, text)
        {
            var busyIndicator = high.element(mid.BusyPopup).text("Saving");
            busyIndicator.show_();
    
            $.ajax({
                url: href,
                type: "PUT",
                contentType: "text/plain",
                processData: false,
                data: text
            })
            .done(function ()
            {
            })
            .fail(function ()
            {
                ui.showError("Failed to upload.");
            })
            .always(function ()
            {
                busyIndicator.hide_();
            });
        }
    
        
        var parts = href.split("/");
        var name = decodeURI(parts[parts.length - 1]);
    
        var page = high.element(mid.Page);
        page
        .onSwipeBack(function () { page.pop_(); })
        .onClosed(function ()
        {
            m_data.assign(page.find("editbox").get().text);
            if (m_data.value() !== m_originalContent)
            {
                upload(href, m_data.value());
            }
            page.discard();
        })
        .header(
            high.element(mid.PageHeader)
            .title(high.predicate([m_data], function ()
            {
                return name + (m_data.value() !== m_originalContent ? "*" : "");
            }))
            .left(
                high.element(mid.Button)
                .icon("arrow_back")
                .onClicked(function () { page.pop_(); })
            )
            .right(
                high.element(mid.Button)
                .icon(high.predicate([m_displayMode], function ()
                {
                    return m_displayMode.value() === 0 ? "edit" : "check";
                }))
                .onClicked(toggleMode)
            )
        )
        .add(
            high.element(ViewBox).text(m_data)
            .visible(high.predicate([m_displayMode], function ()
            {
                return m_displayMode.value() === 0;
            }))
        )
        .add(
            high.element(EditBox).id("editbox").text(m_data)
            .visible(high.predicate([m_displayMode], function ()
            {
                return m_displayMode.value() === 1;
            }))
        );
        
        page.push_();
    
        var busyIndicator = high.element(mid.BusyPopup).text("Loading");
        busyIndicator.show_();
    
        $.ajax(href, {
            beforeSend: function (xhr) {xhr.overrideMimeType("text/plain"); }
        })
        .success(function (data, status, xhr)
        {
            m_originalContent = data;
            m_data.assign(data);
        })
        .fail(function (xhr, status, err)
        {
            var message = status;
            if (xhr.status === 0)
            {
                // no response from server
                message = "Connection failed.";
            }
            ui.showError("Failed to load: " + message);
        })
        .complete(function ()
        {
            busyIndicator.hide_();
        });
    }

    mimeReg.mimeRegistry.register("application/x-batch", viewText);
    mimeReg.mimeRegistry.register("application/x-json", viewText);
    mimeReg.mimeRegistry.register("application/x-python", viewText);
    mimeReg.mimeRegistry.register("application/x-qml", viewText);
    mimeReg.mimeRegistry.register("application/x-shellscript", viewText);
    mimeReg.mimeRegistry.register("text/plain", viewText);
    mimeReg.mimeRegistry.register("text/javascript", viewText);
    mimeReg.mimeRegistry.register("text/xml", viewText);
});
