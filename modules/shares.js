"use strict";

const modCrypto = require("crypto"),
      modFs = require("fs"),
      modPath = require("path");

function md5(data)
{
    return modCrypto.createHash("md5").update(data).digest("hex");
}

function Shares(contentRoot)
{
    var that = this;
    var m_shares = [];

    var m_sharesFile = modPath.join(contentRoot, ".pilvini", "shares.json");
    if (modFs.existsSync(m_sharesFile))
    {
        try
        {
            m_shares = JSON.parse(modFs.readFileSync(m_sharesFile, "utf8"));
        }
        catch (err)
        {
            console.error("Failed to read shares: " + err);
            return;
        }
    }

    /* Returns if the given path is covered by at least one share.
     */
    this.isCovered = function (path)
    {
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

    /* Returns the IDs of the available shares.
     */
    this.shares = function ()
    {
        var result = [];
        m_shares.forEach(function (s)
        {
            result.push(s.id);
        });
        return result;
    }

    /* Returns if the given path is a share.
     */
    this.isShare = function (path)
    {
        for (var i = 0; i < m_shares.length; ++i)
        {
            if (m_shares[i].root === path)
            {
                return true;
            }
        }
        return false;
    }

    /* Returns the ID of the share at the given path.
     */
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

    /* Returns the share info object for the given share, or undefined if
     * the share does not exist.
     */
    this.info = function (shareId)
    {
        for (var i = 0; i < m_shares.length; ++i)
        {
            var obj = m_shares[i];
            if (obj.id === shareId)
            {
                return obj;
            }
        }
        return undefined;
    }

    this.share = function (shareId, shareRoot, sharePassword)
    {
        m_shares.push({
            "id": shareId,
            "root": shareRoot,
            "password_hash": md5(shareId + ":pilvini:" + sharePassword)
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