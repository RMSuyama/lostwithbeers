/**
 * Handles object pooling and performance optimizations.
 */
export class PerformanceSystem {
    constructor() {
        this.pools = {
            mobs: [],
            projectiles: [],
            effects: []
        };
        this.limits = {
            mobs: 50,
            projectiles: 100,
            effects: 30
        };
    }

    /**
     * Retrieves an object from the pool or creates a new one.
     */
    acquire(type, factory) {
        if (this.pools[type].length > 0) {
            const obj = this.pools[type].pop();
            // Reset object state (must be handled by factory or caller)
            return obj;
        }
        return factory();
    }

    /**
     * Returns an object to the pool.
     */
    release(type, obj) {
        if (this.pools[type].length < this.limits[type]) {
            this.pools[type].push(obj);
        }
    }

    /**
     * Simple LOD (Level of Detail) check.
     */
    shouldRenderParticles(count) {
        return count < 50; // Throttle if too many particles
    }
}
