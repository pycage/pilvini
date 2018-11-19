const modFs = require("fs"),
      modPath = require("path");

function Shares(contentRoot)
{
    var that = this;
    var m_shares = [];

    var sharesFile = modPath.join(contentRoot, ".pilvini", "shares.json");
    if (! modFs.existsSync(sharesFile))
    {
        return;
    }
    try
    {
        m_shares = JSON.parse(modFs.readFileSync(sharesFile, "utf8"));
    }
    catch (err)
    {
        console.error("Failed to read shares: " + err);
        return;
    }

    this.root = function (id)
    {
        for (var i = 0; i < m_shares.length; ++i)
        {
            if (m_shares[i].id === id)
            {
                return m_shares[i].root;
            }
        }
        return undefined;
    }

    this.depth = function (id)
    {
        var shareRoot = that.root(id);
        var parts = shareRoot.split("/")
            .filter(function (a) { return a !== ""; });
        return parts.length;
    }

    this.isCovered = function (path)
    {
        console.log("isCovered? " + path);
        for (var i = 0; i < m_shares.length; ++i)
        {
            console.log("Share root: " + contentRoot + m_shares[i].root);
            if (path.indexOf(contentRoot + m_shares[i].root) === 0)
            {
                return true;
            }
        }
        return false;
    }

    this.shares = function ()
    {
        var result = [];
        m_shares.forEach(function (s)
        {
            result.push(s.id);
        });
        return result;
    }
}
exports.Shares = Shares;