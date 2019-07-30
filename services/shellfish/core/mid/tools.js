"use strict";

require(__dirname + "/../low.js", function (low)
{
    const VISUAL = 1;
    const INTERACTIVE = 2;
    const CLICK_THROUGH = 4;
    exports.VISUAL = VISUAL;
    exports.INTERACTIVE = INTERACTIVE;
    exports.CLICK_THROUGH = CLICK_THROUGH;

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

    /* Initializes the given element for the given type(s).
     */
    function initAs(target, types)
    {
        if (types & VISUAL)
        {
            var visible = true;
            addProperty(target, "visible", function (v)
            {
                visible = v;
                if (v)
                {
                    target.get().removeClass("sh-hidden");
                }
                else
                {
                    target.get().addClass("sh-hidden");
                }
            },
            function ()
            {
                return visible;
            });
        }
        
        if (types & INTERACTIVE)
        {
            var enabled = true;
            var onClicked = null;

            target.get().on("click", function (event)
            {
                if (! (types & CLICK_THROUGH))
                {
                    event.stopPropagation();
                }
                if (onClicked)
                {
                    onClicked();
                }
            });

            addProperty(target, "enabled", function (e)
            {
                enabled = e;
                if (e)
                {
                    target.get().removeClass("sh-disabled");
                }
                else
                {
                    target.get().addClass("sh-disabled");
                }
            },
            function ()
            {
                return enabled;
            });

            addProperty(target, "onClicked", function (cb)
            {
                onClicked = cb;
            },
            function ()
            {
                return onClicked;
            });

            addProperty(target, "action", function (cb)
            {
                onClicked = cb;
            },
            function ()
            {
                return onClicked;
            });
        }
    }
    exports.initAs = initAs;

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