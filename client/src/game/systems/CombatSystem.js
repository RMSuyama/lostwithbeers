
export class CombatSystem {
    constructor() {
        this.projectiles = [];
        this.damageNumbers = [];
        this.attackEffects = [];
    }

    update(dt, mobs, spawnDamage) {
        // Update Projectiles
        this.projectiles = this.projectiles.filter(p => {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.life -= dt;

            // Collision with Mobs
            mobs.forEach(m => {
                if (p.life <= 0) return;
                const dist = Math.hypot(m.x - p.x, m.y - p.y);
                if (dist < 30) { // Mob Radius approx
                    m.hp -= p.dmg;
                    spawnDamage(m.x, m.y, p.dmg);
                    p.life = 0; // Destroy projectile

                    // Knockback (simple)
                    m.x += Math.cos(p.angle) * 10;
                    m.y += Math.sin(p.angle) * 10;
                }
            });

            return p.life > 0;
        });

        // Update Damage Numbers
        this.damageNumbers = this.damageNumbers
            .map(d => ({ ...d, anim: d.anim + 1 }))
            .filter(d => d.anim < 60);

        // Update Effects
        this.attackEffects = this.attackEffects.filter(e => Date.now() - e.time < 200);
    }

    spawnProjectile(x, y, angle, stats, color) {
        this.projectiles.push({
            x, y, angle,
            speed: 12,
            life: 1.5,
            dmg: stats.atk, // Use stat attack
            color: color || '#fff'
        });
    }

    spawnDamage(x, y, value, color) {
        const displayValue = typeof value === 'number' ? Math.floor(value) : value;
        this.damageNumbers.push({ x, y, value: displayValue, color, anim: 0 });
    }

    addAttackEffect(x, y, angle, type) {
        this.attackEffects.push({ x, y, angle, time: Date.now(), type });
    }
}
