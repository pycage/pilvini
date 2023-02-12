shRequire(["shellfish/core"], core =>
{

    const d = new WeakMap();

    /**
     * Class representing an engine for simulating the physics of inertial motion.
     * 
     * @extends core.Object
     * 
     * @property {number} friction - (default: `0.1`) The friction coefficient. A friction of `0` lets the inertial motion continue forever, while a friction of `1` allows no inertial motion.
     * @property {bool} running - [readonly] If the engine is currently running.
     */
    class InertialEngine extends core.Object
    {

        constructor()
        {
            super();
            d.set(this, {
                friction: 0.1,
                velocityX: 0,
                velocityY: 0,
                sampleX: 0,
                sampleY: 0,
                sampleTime: 0,
                running: false,
                timerHandle: null
            });

            this.notifyable("friction");
            this.notifyable("running");

            this.registerEvent("motion");

            this.onDestruction = () =>
            {
                const priv = d.get(this);
                if (priv.timerHandle)
                {
                    clearInterval(priv.timerHandle);
                    priv.timerHandle = null;
                }
            };
        }

        get running() { return d.get(this).running; }

        get friction() {return d.get(this).friction; }
        set friction(f)
        {
            d.get(this).friction = f;
            this.frictionChanged();
        }

        /**
         * Resets the engine to the given initial coordinates.
         * 
         * @param {number} x - The X coordinate.
         * @param {number} y - The Y coordinate.
         */
        reset(x, y)
        {
            const priv = d.get(this);

            priv.running = false;
            this.runningChanged();
            if (priv.timerHandle)
            {
                clearInterval(priv.timerHandle);
                priv.timerHandle = null;
            }

            priv.sampleTime = Date.now();
            priv.sampleX = x;
            priv.sampleY = y;
            priv.velocityX = 0;
            priv.velocityY = 0;
        }

        /**
         * Takes a sample with the given coordinates.
         * 
         * @param {number} x - The X coordinate.
         * @param {number} y - The Y coordinate.
         */
        takeSample(x, y)
        {
            const priv = d.get(this);

            const dx = priv.sampleX - x;
            const dy = priv.sampleY - y;
            const now = Date.now();
            const dt = now - priv.sampleTime;
    
            if (dt > 0)
            {
                priv.velocityX = dx / dt;
                priv.velocityY = dy / dt;
            }
    
            priv.sampleTime = now;
            priv.sampleX = x;
            priv.sampleY = y;
    
            this.motion(dx, dy);
        }

        /**
         * Starts the engine. This will emit a series of `motion` events until
         * the friction stopped the motion.
         */
        start()
        {
            const priv = d.get(this);

            priv.running = true;
            this.runningChanged();

            priv.timerHandle = setInterval(this.safeCallback(() =>
            {
                // apply simple physics
                const now = Date.now();
                const dt = now - priv.sampleTime;
                priv.sampleTime = now;

                const dx = priv.velocityX * dt;
                const dy = priv.velocityY * dt;

                if (dt < 100)
                {
                    this.motion(dx, dy);                    
                    priv.velocityX = priv.velocityX * (1.0 - priv.friction);
                    priv.velocityY = priv.velocityY * (1.0 - priv.friction);
                }

                if (dt >= 100 || (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1))
                {
                    priv.running = false;
                    this.runningChanged;
                    clearInterval(priv.timerHandle);
                    priv.timerHandle = null;
                }
            }), 10);
        }

        /**
         * Stops the engine abruptly.
         */
        stop()
        {
            this.reset(d.get(this).sampleX, d.get(this).sampleY);
        }

    }
    exports.InertialEngine = InertialEngine;

});