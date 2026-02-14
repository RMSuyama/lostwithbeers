const { v4: uuidv4 } = require('uuid');

// Effect Types
const EFFECT_TYPES = {
    BUFF: 'BUFF',
    DEBUFF: 'DEBUFF'
};

class Effect {
    constructor(id, name, duration, stats, type = EFFECT_TYPES.BUFF) {
        this.id = id;
        this.name = name;
        this.duration = duration; // seconds
        this.stats = stats; // { speedMultiplier, damageMultiplier, etc }
        this.type = type;
    }
}

class Skill {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.cooldown = config.cooldown || 0;
        this.manaCost = config.manaCost || 0;
        this.staminaCost = config.staminaCost || 0; // NEW: Stamina cost
        this.castTime = config.castTime || 0;
        this.range = config.range || 0;
        this.onCast = config.onCast || (() => { });
    }
}

const SKILLS = {
    'fireball': new Skill({
        id: 'fireball',
        name: 'Fireball',
        cooldown: 2.0,
        manaCost: 0,      // Reduced from 15
        staminaCost: 25,  // NEW: Stamina cost
        castTime: 0.3,
        range: 600,
        onCast: (gameState, casterId, target) => {
            // Spawn Projectile
            const caster = gameState.players[casterId];
            if (!caster) return;

            // Vector to target
            // If target is just direction, use input vector?
            // For now assume target is normalized vector

            const speed = 500;
            gameState.projectiles.push({
                id: uuidv4(),
                ownerId: casterId,
                x: caster.x,
                y: caster.y,
                vx: target.x * speed,
                vy: target.y * speed,
                range: 600,
                traveled: 0,
                damage: 10,  // Reduced from 20 to balance with increased mob HP
                type: 'fireball'
            });
        }
    }),

    'dash': new Skill({
        id: 'dash',
        name: 'Dash',
        cooldown: 3.0,
        manaCost: 0,      // Reduced from 10
        staminaCost: 30,  // NEW: Stamina cost
        castTime: 0,
        onCast: (gameState, casterId, target) => {
            const caster = gameState.players[casterId];
            if (!caster) return;

            // Apply Buff
            // We can reuse the mechanics from before but formalized
            caster.effects.push({
                id: uuidv4(),
                name: 'Dash',
                duration: 0.2,
                stats: { speedMultiplier: 3.0, invulnerable: true },
                type: EFFECT_TYPES.BUFF,
                timer: 0.2
            });
        }
    })
};

module.exports = { SKILLS, Effect, EFFECT_TYPES };
