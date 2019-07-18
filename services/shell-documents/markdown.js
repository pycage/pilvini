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
            text: { set: setText, get: text, enumerable: true },
            visible: { set: setVisible, get: visible, enumerable: true }
        });

        var m_text = "";
        var m_visible = false;
        var m_box = $(
            low.tag("div").class("sh-html")
            .style("display: none")
            .style("padding", "0.5em")
            .html()
        );

        function setText(text)
        {
            try
            {
                var converter = new Showdown.converter();
                m_box.html(converter.makeHtml(text));
                m_text = text;
            }
            catch (err)
            {
                console.log(err);
            }
        }

        function text()
        {
            return m_text;
        }

        function setVisible(value)
        {
            if (value)
            {
                m_box.css("display", "block");
            }
            else
            {
                m_box.css("display", "none");
            }
            m_visible = value;
        }

        function visible()
        {
            return m_visible;
        }

        this.get = function ()
        {
            return m_box;
        }
    }

    function EditBox()
    {
        Object.defineProperties(this, {
            text: { set: setText, get: text, enumerable: true },
            visible: { set: setVisible, get: visible, enumerable: true }
        });

        var m_visible = false;
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

        function setVisible(value)
        {
            if (value)
            {
                m_box.css("display", "block");
            }
            else
            {
                m_box.css("display", "none");
            }
            m_visible = value;
        }

        function visible()
        {
            return m_visible;
        }

        this.get = function ()
        {
            return m_box;
        }
    }


    function viewMarkdown(href)
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
                contentType: "text/x-markdown",
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
    
        var page = high.element(mid.Page)
        .script("/::res/shell-documents/markdown/showdown.js")
        .onSwipeBack(function () { page.pop_(); })
        .onClosed(function ()
        {
            m_data.assign(page.find("editbox").get().text);
            if (m_data.value() !== m_originalContent)
            {
                upload(href, m_data.value());
            }
        })
        .header(
            high.element(mid.PageHeader)
            .title(high.predicate([m_data], function ()
            {
                return name + (m_data.value() !== m_originalContent ? "*" : "");
            }))
            .left(
                high.element(mid.IconButton)
                .icon("sh-icon-back")
                .onClicked(function () { page.pop_(); })
            )
            .right(
                high.element(mid.IconButton)
                .icon(high.predicate([m_displayMode], function ()
                {
                    return m_displayMode.value() === 0 ? "sh-icon-edit" : "sh-icon-checked";
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
            beforeSend: function (xhr) {xhr.overrideMimeType("text/x-markdown"); }
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

    mimeReg.mimeRegistry.register("text/x-markdown", viewMarkdown);
});
