const GameState = require('./GameState');
const { v4: uuidv4 } = require('uuid');

const BOSS_TYPES = [
    { name: 'O Rei Slime', type: 'slime_boss', hp: 3000, dmg: 10, speed: 60, size: 80, color: 0x00ff00, ability: 'split' },
    { name: 'Cavaleiro Negro', type: 'dark_knight', hp: 5000, dmg: 15, speed: 90, size: 60, color: 0x333333, ability: 'charge' },
    { name: 'O Colosso', type: 'colossus', hp: 12000, dmg: 20, speed: 40, size: 100, color: 0x8b4513, ability: 'smash' },
    { name: 'Aranha Rainha', type: 'spider_queen', hp: 6000, dmg: 12, speed: 120, size: 70, color: 0x800080, ability: 'web' },
    { name: 'Infernal', type: 'infernal', hp: 8000, dmg: 18, speed: 70, size: 85, color: 0xff4500, ability: 'burn' },
    { name: 'Lich', type: 'lich', hp: 4000, dmg: 25, speed: 100, size: 55, color: 0x4b0082, ability: 'freeze' },
    { name: 'Dragão de Pedra', type: 'stone_dragon', hp: 15000, dmg: 30, speed: 50, size: 120, color: 0x708090, ability: 'quake' },
    { name: 'Valkyria Caída', type: 'valkyrie', hp: 7000, dmg: 22, speed: 160, size: 60, color: 0xffd700, ability: 'dive' },
    { name: 'Sombra Viva', type: 'shadow', hp: 5000, dmg: 28, speed: 150, size: 50, color: 0x000000, ability: 'flicker' },
    { name: 'DEUS DA GUERRA', type: 'god_war', hp: 50000, dmg: 50, speed: 85, size: 150, color: 0xff0000, ability: 'obliterate' }
];

class BossColosseumGame extends GameState {
    constructor(roomId) {
        super(roomId);

        // Remove Base (Not needed for Colosseum)
        this.base = null;

        // Boss State
        this.currentLevel = 0; // 0 to 9
        this.roundState = 'waiting'; // waiting, fighting, victory
        this.roundTimer = 5; // 5s prep
    }

    initMap() {
        // Clear collision map (Open Arena)
        this.collisionMap.fill(0);

        // Circular Arena Walls
        const centerX = this.mapWidth / 2;
        const centerY = this.mapHeight / 2;
        const radius = 45; // slightly smaller than map

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const dist = Math.hypot(x - centerX, y - centerY);
                if (dist > radius) {
                    this.collisionMap[y * this.mapWidth + x] = 1;
                }
            }
        }
    }

    updateGameLogic(dt) {
        if (this.roundState === 'waiting') {
            this.roundTimer -= dt;
            if (this.roundTimer <= 0) {
                this.startRound();
            }
        } else if (this.roundState === 'fighting') {
            // Process Boss AI
            this.enemies.forEach(boss => this.processBossAI(boss, dt));

            if (this.enemies.length === 0) {
                this.roundState = 'waiting';
                this.roundTimer = 5; // 5s rest between rounds
                this.currentLevel++;

                // Heal players slightly
                Object.values(this.players).forEach(p => {
                    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
                });

                if (this.currentLevel >= BOSS_TYPES.length) {
                    this.state = 'victory';
                    console.log("PLAYERS WON THE COLOSSEUM!");
                }
            }
        }
    }

    processBossAI(boss, dt) {
        if (boss.hp <= 0) return;

        // Cooldowns
        if (boss.abilityTimer > 0) boss.abilityTimer -= dt;

        // Custom Ability Logic
        if (boss.abilityTimer <= 0) {
            this.triggerBossAbility(boss);
            boss.abilityTimer = 3 + Math.random() * 2; // Random CD 3-5s
        }

        // Specific Behavior overrides
        if (boss.type === 'slime_boss' && boss.hp < boss.maxHp * 0.5 && !boss.hasSplit) {
            // Split logic handled in onEnemyKilled/Hit usually, but here is fine for phase change
        }
    }

    triggerBossAbility(boss) {
        const ability = boss.ability;
        console.log(`[Boss AI] ${boss.name} used ${ability}!`);

        // Find random target
        const playerIds = Object.keys(this.players);
        if (playerIds.length === 0) return;
        const targetId = playerIds[Math.floor(Math.random() * playerIds.length)];
        const target = this.players[targetId];

        switch (ability) {
            case 'charge':
                // Rush towards target at 3x speed
                boss.speedMultiplier = 3;
                setTimeout(() => boss.speedMultiplier = 1, 1000);
                this.broadcastEffect(boss.x, boss.y, 'charge');
                break;
            case 'smash':
                // AoE Damage around boss
                this.dealAreaDamage(boss.x, boss.y, 150, boss.damage * 0.5);
                this.broadcastEffect(boss.x, boss.y, 'smash');
                break;
            case 'web':
                // Slow all players
                Object.values(this.players).forEach(p => {
                    p.effects.push({ type: 'slow', duration: 3, stats: { speedMultiplier: 0.5 } });
                });
                break;
            case 'burn':
                // DoT to all players
                Object.values(this.players).forEach(p => {
                    p.effects.push({ type: 'burn', duration: 5, damage: 10 });
                });
                break;
            case 'split':
                // Spawn minions
                for (let i = 0; i < 3; i++) {
                    this.spawnMinion(boss.x + (Math.random() * 60 - 30), boss.y + (Math.random() * 60 - 30), 'slime_minion');
                }
                break;
            case 'freeze':
                // Stun random player
                if (target) target.effects.push({ type: 'stun', duration: 1.5, stats: { speedMultiplier: 0 } });
                break;
            case 'dive':
                boss.x = target.x;
                boss.y = target.y;
                this.dealAreaDamage(boss.x, boss.y, 100, boss.damage);
                break;
            case 'obliterate':
                // Massive Damage to all
                Object.values(this.players).forEach(p => p.hp -= 50);
                break;
        }
    }

    dealAreaDamage(x, y, radius, damage) {
        Object.values(this.players).forEach(p => {
            const dist = Math.hypot(p.x - x, p.y - y);
            if (dist <= radius) {
                p.hp -= damage;
            }
        });
    }

    broadcastEffect(x, y, type) {
        // This would ideally define a visual event for clients
        // For now, we rely on state updates or generic feedback
    }

    spawnMinion(x, y, type) {
        const minion = {
            id: uuidv4(),
            x: x, y: y,
            type: 'monster', // Generic
            bossType: 'minion', // Visual
            name: 'Minion',
            hp: 200, maxHp: 200,
            speed: 100, damage: 20, size: 20,
            color: 0x00ff00,
            aggroRange: 500,
            attackRange: 40,
            attackCooldown: 1, attackTimer: 0
        };
        this.enemies.push(minion);
    }

    startRound() {
        if (this.currentLevel >= BOSS_TYPES.length) return;

        this.roundState = 'fighting';
        const bossConfig = BOSS_TYPES[this.currentLevel];

        const playerCount = Object.keys(this.players).length || 1;
        const hpScale = 1 + (playerCount - 1) * 0.5; // +50% HP per extra player
        const dmgScale = 1 + (playerCount - 1) * 0.2; // +20% Dmg per extra player

        const boss = {
            id: uuidv4(),
            x: 50 * 32,
            y: 50 * 32, // Center of Arena
            type: 'boss',
            bossType: bossConfig.type,
            name: bossConfig.name,
            hp: bossConfig.hp * hpScale,
            maxHp: bossConfig.hp * hpScale,
            speed: bossConfig.speed,
            speedMultiplier: 1,
            damage: bossConfig.dmg * dmgScale,
            size: bossConfig.size,
            color: bossConfig.color,
            aggroRange: 9999, // Always sees players
            attackRange: bossConfig.size + 30,
            attackCooldown: 1.5,
            attackTimer: 1.0,
            abilityTimer: 5.0, // First ability after 5s
            state: 'idle',
            ability: bossConfig.ability,
            movementType: ['lich', 'shadow', 'valkyrie'].includes(bossConfig.type) ? 'hover' : 'direct'
        };

        this.enemies.push(boss);
        console.log(`[BossColosseum] Spawning ${boss.name} (HP: ${boss.hp}, Dmg: ${boss.damage})`);
    }

    onEnemyKilled(enemy) {
        // Nothing special, updateGameLogic handles "enemies.length === 0"
    }

    // Override: Random players spawn in a circle
    addPlayer(socketId, userId) {
        super.addPlayer(socketId, userId);
        const randAngle = Math.random() * Math.PI * 2;
        const radius = 15 * 32; // Reduced from 30 to 15 (480px) so boss is visible
        this.players[socketId].x = 50 * 32 + Math.cos(randAngle) * radius;
        this.players[socketId].y = 50 * 32 + Math.sin(randAngle) * radius;

        // Safety: ensure HP is full
        this.players[socketId].hp = this.players[socketId].maxHp;
    }

    // Override movement to handle speedMultiplier & movement types
    moveEnemyTowards(enemy, target, dt) {
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= enemy.attackRange) {
            if (enemy.attackTimer <= 0) {
                this.enemyAttackPlayer(enemy, target);
                enemy.attackTimer = enemy.attackCooldown;
            }
        } else {
            let speed = enemy.speed * (enemy.speedMultiplier || 1);

            // Movement Logic
            if (enemy.movementType === 'hover') {
                // Hover: Keep some distance, circle around? 
                // For now, just a bit wobbly approach
                const wobble = Math.sin(Date.now() * 0.005) * 50;
                enemy.x += (dx / dist) * speed * dt + (Math.sin(Date.now() * 0.01) * speed * 0.5 * dt);
                enemy.y += (dy / dist) * speed * dt + (Math.cos(Date.now() * 0.01) * speed * 0.5 * dt);
            } else {
                // Direct
                enemy.x += (dx / dist) * speed * dt;
                enemy.y += (dy / dist) * speed * dt;
            }
        }
    }

    getState() {
        return {
            ...super.getState(),
            bossGame: {
                level: this.currentLevel + 1,
                maxLevels: BOSS_TYPES.length,
                roundState: this.roundState,
                timer: this.roundTimer,
                currentBoss: this.enemies.find(e => e.type === 'boss')?.name || null
            }
        };
    }
}

module.exports = BossColosseumGame;
