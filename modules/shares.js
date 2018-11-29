const modFs = require("fs"),
      modPath = require("path");

function Shares(contentRoot)
{
    var that = this;
    var m_shares = [];

    var m_sharesFile = modPath.join(contentRoot, ".pilvini", "shares.json");
    if (! modFs.existsSync(m_sharesFile))
    {
        return;
    }
    try
    {
        m_shares = JSON.parse(modFs.readFileSync(m_sharesFile, "utf8"));
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
            console.log("Share root: " + m_shares[i].root);
            if (path.indexOf(m_shares[i].root) === 0)
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

    this.isShare = function (path)
    {
        console.log("IS SHARE? " + path);
        for (var i = 0; i < m_shares.length; ++i)
        {
            if (m_shares[i].root === path)
            {
                return true;
            }
        }
        return false;
    }

    this.id = function (path)
    {
        for (var i = 0; i < m_shares.length; ++i)
        {
            if (m_shares[i].root === path)
            {
                return m_shares[i].id;
            }
        }
        return "";
    }

    this.share = function (id, path)
    {
        m_shares.push({
            "id": id,
            "root": path
        });

        try
        {
            modFs.writeFileSync(m_sharesFile, JSON.stringify(m_shares), "utf8");
        }
        catch (err)
        {
            console.error("Failed to write shares: " + err);
            return;
        }
    }

    this.unshare = function (id)
    {
        var newShares = [];
        m_shares.forEach(function (s)
        {
            if (s.id !== id)
            {
                newShares.push(s);
            }
        });
        m_shares = newShares;

        try
        {
            modFs.writeFileSync(m_sharesFile, JSON.stringify(m_shares), "utf8");
        }
        catch (err)
        {
            console.error("Failed to write shares: " + err);
            return;
        }
    }
}
exports.Shares = Shares;