"use strict";

require(__dirname + "/../low.js", function (low)
{

    /* Extends from a base object.
     */
    function extend(target, base)
    {
        Object.getOwnPropertyNames(base).forEach(function (prop)
        {
            var descriptor = Object.getOwnPropertyDescriptor(base, prop);
            Object.defineProperty(target, prop, descriptor);
        });
    }
    exports.extend = extend;

    function defineProperties(target, props)
    {
        for (var key in props)
        {
            var description = props[key];
            addProperty(target, key, description.set, description.get);
        }
    }
    exports.defineProperties = defineProperties;

    /* Adds a property with notification callback.
     */
    function addProperty(target, name, setter, getter)
    {
        var callback = null;

        var uname = name[0].toUpperCase() + name.substr(1);
        Object.defineProperty(target, "on" + uname + "Changed", {
            set: function (cb) { callback = cb; },
            get: function () { return callback; },
            enumerable: true
        });

        target[name + "Changed"] = function ()
        {
            if (callback) { callback(); }
        };

        Object.defineProperty(target, name, {
            set: function (v)
            {
                setter(v);
                target[name + "Changed"]();
            },
            get: getter,
            enumerable: true
        });
    }
    exports.addProperty = addProperty;

    /* Wraps an existing callback to invoke an additional one.
     */
    exports.chainCallback = function (callbackProperty, callback)
    {
        if (callbackProperty)
        {
            return function ()
            {
                callbackProperty.apply(this, arguments);
                callback(this, arguments);
            };
        }
        else
        {
            return callback;
        }
    };

});