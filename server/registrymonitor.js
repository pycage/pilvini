shRequire(["shellfish/core"], core =>
{

    const d = new WeakMap();

    class RegistryMonitor extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                registry: null,
                mapping: new Map()
            });
        }

        get registry() { return d.get(this).registry; }
        set registry(r)
        {
            const priv = d.get(this);
            priv.registry = r;

            r.onChangeValue = key =>
            {
                if (priv.mapping[key])
                {
                    const propName = priv.mapping[key];
                    this[propName] = r.read(key);
                }
            };
        }

        get mapping() { return d.get(this).mapping; }
        set mapping(m)
        {
            const priv = d.get(this);
            priv.mapping = m;

            if (priv.registry)
            {
                Object.keys(m).forEach(key =>
                {
                    const propName = m[key];
                    this[propName] = priv.registry.read(key);
                });
            }
        }
    }
    exports.RegistryMonitor = RegistryMonitor;

});