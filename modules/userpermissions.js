function UserPermissions(authUser)
{
    this.mayCreate = function () { return authUser !== ""; }
    this.mayDelete = function () { return authUser !== ""; }
    this.mayModify = function () { return authUser !== ""; }
    this.mayShare = function () { return authUser !== ""; }
}
exports.UserPermissions = UserPermissions;