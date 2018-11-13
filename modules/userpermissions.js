function UserPermissions()
{
    this.mayCreate = function () { return true; }
    this.mayDelete = function () { return true; }
    this.mayModify = function () { return true; }
    this.mayShare = function () { return true; }
}
exports.UserPermissions = UserPermissions;