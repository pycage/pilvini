exports.attempt = function (f)
{
    try
    {
        return f();
    }
    catch (err)
    {
        return undefined;
    }
};
