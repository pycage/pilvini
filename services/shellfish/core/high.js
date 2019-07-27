"use strict";

exports.__id = "shellfish/high";

require(__dirname + "/mid.js", function (mid)
{
    var Binding = function (value)
    {
        var that = this;
        var m_idCounter = 0;
        var m_value = value;
        var m_watchers = { };
        var m_onUnwatched = null;
    
        /* Notifies the watchers of this binding about an update.
         */
        this.update = function ()
        {
            for (var watchId in m_watchers)
            {
                try
                {
                    m_watchers[watchId](m_value);
                }
                catch (err)
                {
                    console.error("Binding error: " + err);
                }
            }
        }
    
        /* Registers a callback for watching this binding and returns the
         * watch handle.
         */
        this.watch = function (watchCallback)
        {
            var watchId = m_idCounter;
            ++m_idCounter;
            m_watchers[watchId] = watchCallback;
            return {
                unwatch: function ()
                {
                    delete m_watchers[watchId];
                    if (Object.keys(m_watchers).length === 0 && m_onUnwatched)
                    {
                        m_onUnwatched();
                    }
                }
            }
        };
    
        /* Registers a callback for when the last watcher was removed.
         */
        this.unwatched = function (callback)
        {
            m_onUnwatched = callback;
        };
    
        /* Assigns a new value to this binding.
         */
        this.assign = function (value)
        {
            if (m_value !== value)
            {
                m_value = value;
                that.update();
            }
        };
    
        /* Returns the value of this binding.
         */
        this.value = function ()
        {
            return m_value;
        };
    
        /* Pushes a new value to an array.
         */
        this.push = function (v)
        {
            m_value.push(v);
            that.update();
        };
    };
       
    var Element = function (type)
    {
        var that = this;
        var m_element = null;
        var m_children = [];
        var m_id = "";
        var m_watchHandles = [];
        var m_inits = [];
        var m_bindings = { };
        var m_isInitialized = false;
        var m_status = binding("created");
    
        /* Returns the underlying mid-level element.
         */
        this.get = function ()
        {
            if (! m_isInitialized)
            {
                that.init();
            }
            return m_element;
        };
    
        /* Returns a binding to this element's current status.
         */
        this.status = function ()
        {
            return m_status;
        };

        /* Initializes this element and its children.
         * It is usually not required to call this method explicitly.
         */
        this.init = function ()
        {
            if (! m_isInitialized)
            {
                m_isInitialized = true;
                m_inits.forEach(function (init) { init(); });
                m_inits = [];
    
                m_children.forEach(function (child) { child.init(); });
                m_status.assign("initialized");
            }
        };
    
        /* Disposes of this element and all its child element.
         * This will release references for garbage collecting.
         */
        this.dispose = function ()
        {
            m_watchHandles.forEach(function (handle)
            {
                handle.unwatch();
            });
            m_children.forEach(function (child)
            {
                child.dispose();
            });
            m_element = null;
            m_children = [];
            m_bindings = { };

            var status = m_status;
            m_status = null;
            status.assign("disposed");
        }
    
        /* Sets or returns the ID of this element.
         */
        this.id = function (i)
        {
            if (i === undefined)
            {
                return m_id;
            }
            else
            {
                m_id = i;
                return that;
            }
        };
    
        /* Adds a child element to this element.
         */
        this.add = function (element)
        {
            m_children.push(element);
            m_element.add(element.get());
            return that;
        };
    
        /* Returns the nth child element of this element.
         * Negative values count from backwards.
         */
        this.child = function (n)
        {
            if (n >= 0)
            {
                return m_children[n];
            }
            else
            {
                return m_children[m_children.length + n];
            }
        };

        /* Returns a list of children of the given element type.
         * Returns all children if type is undefined.
         */
        this.children = function (type)
        {
            return m_children.filter(function (c)
            {
                return type === undefined || c.get() instanceof type;
            });
        };
    
        /* Returns the child element with the given ID.
         */
        this.find = function (id)
        {
            if (id === m_id)
            {
                return that;
            }
            else
            {
                for (var i = 0; i < m_children.length; ++i)
                {
                    var obj = m_children[i].find(id);
                    if (obj)
                    {
                        return obj;
                    }
                }
            }
            return null;
        };
    
        /* Returns a binding for the given property.
         */
        this.binding = function (prop)
        {
            if (m_bindings[prop])
            {
                return m_bindings[prop];
            }
    
            var blocked = false;
            var b = binding(m_element[prop]);
    
            var uprop = prop[0].toUpperCase() + prop.substr(1);
            m_element["on" + uprop + "Changed"] = function ()
            {
                blocked = true;
                b.assign(m_element[prop]);
                blocked = false;
            };
            
            b.watch(function ()
            {
                if (! blocked)
                {
                    m_element[prop] = b.value();
                }
            });
    
            m_bindings[prop] = b;
            return b;
        };
    
        function setProperty(prop, value)
        {           
            if (value instanceof Binding)
            {
                // watch binding for value changes to apply
                var handle = value.watch(function (v) { m_element[prop] = v; });
                m_watchHandles.push(handle);
                m_element[prop] = value.value();
            }
            else if (value instanceof Element)
            {
                // nest another element and assign mid-level element to the property
                m_children.push(value);
                m_element[prop] = value.get();
            }
            else
            {
                m_element[prop] = value;
            }
            return that;
        }
    
        function getProperty(prop)
        {
            return m_element[prop];        
        }
    
        // setup properties
        m_element = new type();
        var properties = Object.keys(m_element);
    
        properties.forEach(function (prop)
        {
            if (m_element.hasOwnProperty(prop))
            {
                if (typeof m_element[prop] === "function")
                {
                    that[prop + "_"] = function ()
                    {
                        return that.get()[prop].apply(that.get(), arguments);
                    };
                }
                else
                {
                    // build property setter and getter function
                    that[prop] = function (v) { return v !== undefined ? setProperty(prop, v) : getProperty(prop); };
                }
            }
        });
    };
    
    /* Creates and returns a high-level element of the given type.
     */
    function element(type)
    {
        return new Element(type);
    }
    exports.element = element;
    
    /* Creates and returns a binding value.
     */
    function binding(value)
    {
        return new Binding(value);
    }
    exports.binding = binding;
    
    /* Creates and returns a predicate binding that re-evaluates the predicate
     * whenever one of its dependency bindings change.
     */
    function predicate(dependencies, pred)
    {
        var handles = [];
        var b = binding(pred.apply(null, dependencies));
        dependencies.forEach(function (dep)
        {
            var handle = dep.watch(function (v)
            {
                b.assign(pred.apply(null, dependencies));
            });
            handles.push(handle);
        });
        b.unwatched(function ()
        {
            handles.forEach(function (handle)
            {
                handle.unwatch();
            });
        });
        return b;
    }
    exports.predicate = predicate;
    
    /* Creates and returns a binding that references another high-level
     * element's property.
     */
    function ref(elem, id, prop)
    {
        var targetElement = elem.find(id);
        if (targetElement)
        {
            return targetElement.binding(prop);
        }
        else
        {
            var b = binding(undefined);
    
            var status = elem.status();
            status.watch(function ()
            {
                if (status.value() === "initialized")
                {
                    var targetBinding = elem.find(id).binding(prop);
                    b.assign(targetBinding.value());
                    targetBinding.watch(function ()
                    {
                        b.assign(targetBinding.value());
                    });
                }
            });
    
            return b;
        }
    }
    exports.ref = ref;    
});
