"use strict";

function UserContext(authUser, home)
{
    var m_home = home;

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