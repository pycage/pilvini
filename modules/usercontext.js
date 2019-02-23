"use strict";

function UserContext(authUser, home, permissions)
{
    var m_user = authUser;
    var m_home = home;
    var m_permissions = permissions;

    function hasPermission(name)
    {
        var v = m_permissions.indexOf(name) !== -1;
        return function () { return v; };
    }

    this.permissions = function ()
    {
        return m_permissions;
    }

    this.name = function ()
    {
        return m_user;
    }

    this.home = function ()
    {
        return m_home;
    };

    this.mayAdmin = hasPermission("ADMIN");
    this.mayCreate = hasPermission("CREATE");
    this.mayDelete = hasPermission("DELETE");
    this.mayModify = hasPermission("MODIFY");
    this.mayShare = hasPermission("SHARE");
}
exports.UserContext = UserContext;