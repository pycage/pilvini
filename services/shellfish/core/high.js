"use strict";

(function ()
{
    var Binding = function (value)
    {
        var that = this;
        var m_idCounter = 0;
        var m_value = value;
        var m_watchers = { };
        var m_onceWatchers = [];
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

            m_onceWatchers.forEach(function (watchCallback)
            {
                try
                {
                    watchCallback(m_value);
                }
                catch (err)
                {
                    console.error("Binding error: " + err);
                }
            });
            m_onceWatchers = [];
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

        /* Registers a one-shot callback for watching this binding.
         */
        this.watchOnce = function (watchCallback)
        {
            m_onceWatchers.push(watchCallback);
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
    
        this.get = function ()
        {
            return m_element;
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
        }

        /* Sets the ID of this element.
         */
        this.id = function (i)
        {
            m_id = i;
            return that;
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
    
        function setProperty(prop, value)
        {           
            if (value instanceof Binding)
            {
                var handle = value.watch(function (v) { m_element[prop] = v; });
                m_watchHandles.push(handle);
                m_element[prop] = value.value();
            }
            else if (value instanceof Element)
            {
                m_children.push(value);
                m_element[prop] = value.get();
            }
            else if (typeof value.get === "function")
            {
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
            var getter = m_element[prop];        
            return getter(prop);
        }
    
        // initialize
        m_element = new type();
        var properties = Object.keys(m_element);
    
        properties.forEach(function (prop)
        {
            if (m_element.hasOwnProperty(prop))
            {
                if (typeof m_element[prop] === "function")
                {
                    that[prop + "_"] = m_element[prop];
                }
                else
                {
                    that[prop] = function (v) { return setProperty(prop, v); };
                }
            }
        });
    };
    
    /* Creates and returns an element of the given type.
     */
    sh.element = function (type)
    {
        return new Element(type);
    };
    
    /* Creates and returns a binding value.
     */
    sh.binding = function (value)
    {
        return new Binding(value);
    };
    
    /* Creates and returns a predicate binding that re-evaluates the predicate
     * whenever one of its dependency bindings change.
     */
    sh.predicate = function (dependencies, pred)
    {
        var handles = [];
        var b = sh.binding(pred());
        dependencies.forEach(function (dep)
        {
            var handle = dep.watch(function (v) { b.assign(pred()); });
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
    };
})();
