"use strict";

(function ()
{
    var Binding = function (value)
    {
        var m_value = value;
        var m_watchers = [];
    
        /* Notifies the watchers of this binding about an update.
         */
        function update()
        {
            m_watchers.forEach(function (watchCallback)
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
        }
    
        /* Registers a callback for watching this binding.
         */
        this.watch = function (watchCallback)
        {
            m_watchers.push(watchCallback);
        };
    
        /* Assigns a new value to this binding.
         */
        this.assign = function (value)
        {
            if (m_value !== value)
            {
                m_value = value;
                update();
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
            update();
        };
    };
    
    var Element = function (type)
    {
        var that = this;
        var m_element = null;
        var m_children = [];
        var m_id = "";
    
        this.get = function ()
        {
            return m_element;
        };
    
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
                value.watch(function (v) { m_element[prop] = v; });
                m_element[prop] = value.value();
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
        var b = sh.binding(pred());
        dependencies.forEach(function (dep)
        {
            dep.watch(function (v) { b.assign(pred()); });
        });
        return b;
    };
})();
