export class ProjectileSystem {
    constructor(performanceSystem) {
        this.projectiles = [];
        this.performanceSystem = performanceSystem;
    }

    spawn(config) {
        // PERFORMANCE: Cap max projectiles
        if (this.projectiles.length >= 100) {
            // Remove oldest projectile
            const oldest = this.projectiles.shift();
            if (this.performanceSystem) this.performanceSystem.release('projectiles', oldest);
        }

        const factory = () => ({
            id: '', x: 0, y: 0, vx: 0, vy: 0,
            type: 'linear', ownerId: '',
            dmg: 0, lifetime: 0, createdAt: 0,
            distanceTravelled: 0,
            originalX: 0, originalY: 0,
            pierceCount: 0, maxPierce: 0,
            hitTargets: new Set(),
            target: null,
            bounceLeft: 0,
            curve: 0,
            trail: false
        });

        const p = this.performanceSystem
            ? this.performanceSystem.acquire('projectiles', factory)
            : factory();

        p.id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        p.x = config.x;
        p.y = config.y;

        const speed = config.speed || 6;
        p.vx = Math.cos(config.angle) * speed;
        p.vy = Math.sin(config.angle) * speed;

        p.type = config.type || 'linear';
        p.ownerId = config.ownerId;
        p.dmg = config.dmg || 10;
        p.lifetime = config.lifetime || 2000;
        p.createdAt = Date.now();
        p.originalX = config.x;
        p.originalY = config.y;
        p.maxPierce = config.maxPierce || 0;
        p.pierceCount = 0; // Reset pierce count on spawn
        p.bounceLeft = config.bounce || 0;
        p.curve = config.curve || 0;
        p.color = config.color || '#fff';
        p.trail = config.trail || false;
        p.hitTargets = new Set(); // Ensure fresh set

        this.projectiles.push(p);
        return p;
    }

    update(dt, mobs, players, onHit) {
        const now = Date.now();
        const alive = [];

        for (const p of this.projectiles) {
            if (now - p.createdAt > p.lifetime) {
                if (this.performanceSystem) this.performanceSystem.release('projectiles', p);
                continue;
            }

            this.moveProjectile(p, dt);

            let destroyed = false;

            for (const m of mobs) {
                if (m.hp <= 0 || p.hitTargets.has(m.id)) continue;

                const dist = Math.hypot(p.x - m.x, p.y - m.y);
                if (dist < 22) {
                    p.hitTargets.add(m.id);
                    onHit(p, m);

                    if (p.type === 'chain') {
                        if (p.bounceLeft > 0) {
                            this.redirectToNearest(p, mobs, m.id);
                            p.bounceLeft--;
                            p.trail = true;
                        } else {
                            p.type = 'boomerang';
                        }
                    }

                    if (p.type === 'lastHitReturn') {
                        if (!this.findNextTarget(mobs, m.id)) {
                            p.type = 'boomerang';
                        }
                    }

                    if (p.pierceCount < p.maxPierce) {
                        p.pierceCount++;
                    } else if (p.type !== 'boomerang' && p.type !== 'chain' && p.type !== 'lastHitReturn') {
                        destroyed = true;
                    }
                }
            }

            if (destroyed) {
                if (this.performanceSystem) this.performanceSystem.release('projectiles', p);
            } else {
                alive.push(p);
            }
        }

        this.projectiles = alive;
    }

    moveProjectile(p, dt) {
        if (p.type === 'boomerang') return this.updateBoomerang(p, dt);

        if (p.type === 'curve') {
            const angle = Math.atan2(p.vy, p.vx) + p.curve * dt * 5;
            const speed = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
        }

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
    }

    updateBoomerang(p, dt) {
        const ang = Math.atan2(p.originalY - p.y, p.originalX - p.x);
        const speed = Math.hypot(p.vx, p.vy);

        p.vx = Math.cos(ang) * speed;
        p.vy = Math.sin(ang) * speed;

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
    }

    redirectToNearest(p, mobs, ignoreId) {
        let best = null;
        let bestDist = Infinity;

        for (const m of mobs) {
            if (m.hp <= 0 || m.id === ignoreId || p.hitTargets.has(m.id)) continue;
            const d = Math.hypot(p.x - m.x, p.y - m.y);
            if (d < bestDist) {
                best = m;
                bestDist = d;
            }
        }

        if (!best) return;

        const angle = Math.atan2(best.y - p.y, best.x - p.x);
        const speed = Math.hypot(p.vx, p.vy);

        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
    }

    findNextTarget(mobs, ignoreId) {
        return mobs.some(m => m.hp > 0 && m.id !== ignoreId);
    }
}
