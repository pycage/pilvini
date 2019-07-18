"use strict";

exports.__id = "shell/mime-registry";

function MimeRegistry()
{
    var m_mapping = { };

    this.register = function (mimeType, handler)
    {
        console.log("register handler for " + mimeType);
        if (! m_mapping[mimeType])
        {
            m_mapping[mimeType] = [];
        }

        var viewers = m_mapping[mimeType];
        viewers.push(handler);
    };

    this.fileHandlers = function (mimeType)
    {
        return m_mapping[mimeType] || [];
    }

    console.log("CREATE NEW MIME REGISTRY");
};
exports.mimeRegistry = new MimeRegistry();
