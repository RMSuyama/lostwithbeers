/**
 * Manages status effects (burn, poison, slow, etc.) for any entity.
 */
export class StatusSystem {
    constructor() {
        this.effects = new Map(); // entityId -> Array of effects
    }

    apply(entityId, effect) {
        // effect: { type, duration, value, startTime, sourceId }
        if (!this.effects.has(entityId)) {
            this.effects.set(entityId, []);
        }

        const entityEffects = this.effects.get(entityId);
        const existing = entityEffects.find(e => e.type === effect.type);

        if (existing) {
            // Refresh duration or stack value
            existing.startTime = Date.now();
            existing.duration = Math.max(existing.duration, effect.duration);
            existing.value = Math.max(existing.value, effect.value);
        } else {
            entityEffects.push({
                ...effect,
                startTime: Date.now()
            });
        }
    }

    update(entity, dt) {
        const entityId = entity.id;
        if (!this.effects.has(entityId)) return;

        const now = Date.now();
        const activeEffects = [];

        this.effects.get(entityId).forEach(effect => {
            const elapsed = now - effect.startTime;
            if (elapsed > effect.duration) return;

            // Apply Effect Logic
            switch (effect.type) {
                case 'burn':
                case 'poison':
                    entity.hp -= effect.value * dt; // DOT
                    break;
                case 'slow':
                    if (!entity.originalSpeed) entity.originalSpeed = entity.speed;
                    entity.speed = entity.originalSpeed * (1 - effect.value);
                    break;
                case 'stun':
                    entity.isStunned = true;
                    break;
            }

            activeEffects.push(effect);
        });

        if (activeEffects.length === 0) {
            this.effects.delete(entityId);
            if (entity.originalSpeed) {
                entity.speed = entity.originalSpeed;
                delete entity.originalSpeed;
            }
            entity.isStunned = false;
        } else {
            this.effects.set(entityId, activeEffects);
        }
    }
}
