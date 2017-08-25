exports.attempt = function (f)
{
    try
    {
        return f();
    }
    catch (err)
    {
        console.error(err);
        return undefined;
    }
};
