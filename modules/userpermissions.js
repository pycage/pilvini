"use strict";

function UserPermissions(authUser)
{
    this.mayCreate = function () { return authUser !== null; }
    this.mayDelete = function () { return authUser !== null; }
    this.mayModify = function () { return authUser !== null; }
    this.mayShare = function () { return authUser !== null; }
}
exports.UserPermissions = UserPermissions;