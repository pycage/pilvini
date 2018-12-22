"use strict";

function UserContext(authUser, home)
{
    var m_user = authUser;
    var m_home = home;

    this.name = function ()
    {
        return m_user;
    }

    this.home = function ()
    {
        return m_home;
    };

    this.mayCreate = function () { return authUser !== null; };
    this.mayDelete = function () { return authUser !== null; };
    this.mayModify = function () { return authUser !== null; };
    this.mayShare = function () { return authUser !== null; };
}
exports.UserContext = UserContext;