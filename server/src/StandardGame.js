const GameState = require('./GameState');
const { v4: uuidv4 } = require('uuid');

// Standard MOBA/TD Mob Types
const MOB_TYPES = {
    scout: { baseHp: 100, baseSpeed: 140, baseDamage: 5, gold: 5, size: 20, aggroRange: 350, attackRange: 40, attackCooldown: 1.0, color: 0xff8c00, emoji: '🏴' },
    warrior: { baseHp: 250, baseSpeed: 90, baseDamage: 10, gold: 10, size: 30, aggroRange: 300, attackRange: 45, attackCooldown: 1.2, color: 0xff0000, emoji: '⚔️' },
    brute: { baseHp: 600, baseSpeed: 50, baseDamage: 20, gold: 25, size: 50, aggroRange: 200, attackRange: 60, attackCooldown: 2.5, color: 0x9932cc, emoji: '💪' },
    ghost: { baseHp: 150, baseSpeed: 180, baseDamage: 8, gold: 15, size: 25, aggroRange: 400, attackRange: 35, attackCooldown: 0.8, color: 0x00ff00, emoji: '👻' },
    boss: { baseHp: 3000, baseSpeed: 70, baseDamage: 35, gold: 100, size: 70, aggroRange: 600, attackRange: 80, attackCooldown: 1.5, color: 0xffd700, emoji: '👑' }
};

// ... (POSITIONS kept same)

// ... (Inside spawnEnemy)
spawnEnemy() {
    const wave = this.wave.current;
    const isLeft = this.enemySpawnCount % 2 === 0;
    const laneKey = isLeft ? 'LEFT' : 'RIGHT';
    const startPos = isLeft ? POSITIONS.SPAWN_L : POSITIONS.SPAWN_R;
    const path = POSITIONS.LANES[laneKey];
    this.enemySpawnCount++;

    let mobType = this.selectMobType(wave);
    const mobConfig = MOB_TYPES[mobType];

    const playerCount = Math.max(1, Object.keys(this.players).length);

    // New Scaling Logic:
    // HP: +15% per wave
    // DMG: +10% per wave
    const waveScaleHp = Math.pow(1.15, wave - 1);
    const waveScaleDmg = Math.pow(1.10, wave - 1);
    const playerScale = 1 + (playerCount - 1) * 0.5; // +50% stats per extra player

    const enemy = {
        id: uuidv4(),
        x: startPos.x,
        y: startPos.y,
        path: path,
        pathIndex: 0,
        type: mobType,
        hp: Math.floor(mobConfig.baseHp * waveScaleHp * playerScale),
        maxHp: Math.floor(mobConfig.baseHp * waveScaleHp * playerScale),
        speed: mobConfig.baseSpeed * (1 + Math.min(0.5, (wave - 1) * 0.02)), // Speed caps at +50%
        damage: Math.floor(mobConfig.baseDamage * waveScaleDmg),
        size: mobConfig.size,
        aggroRange: mobConfig.aggroRange,
        attackRange: mobConfig.attackRange,
        attackCooldown: mobConfig.attackCooldown,
        attackTimer: 0,
        target: null,
        state: 'pathing'
    };
    this.enemies.push(enemy);
}
selectMobType(wave) {
    if (wave % 5 === 0 && Math.random() < 0.2) return 'boss';
    if (wave < 3) return Math.random() < 0.7 ? 'scout' : 'warrior';
    const r = Math.random();
    if (r < 0.3) return 'warrior';
    if (r < 0.6) return 'brute';
    return 'ghost';
}

// Hooks
onEnemyKilled(enemy, killerId) {
    this.wave.deadEnemies++;
    if (killerId && this.players[killerId]) {
        const gold = MOB_TYPES[enemy.type]?.gold || 10;
        this.players[killerId].gold = (this.players[killerId].gold || 0) + gold;
    }
}

handleBuyUpgrade(socketId, { type, cost }) {
    const player = this.players[socketId];
    if (!player || (player.gold || 0) < cost) return;

    player.gold -= cost;

    switch (type) {
        case 'dmg':
            player.atk = (player.atk || 1) * 1.05;
            break;
        case 'atk_speed':
            player.cooldownMultiplier = (player.cooldownMultiplier || 1) * 0.95;
            break;
        case 'max_hp':
            player.maxHp += 20;
            player.hp += 20;
            break;
        case 'regen':
            player.hpRegen = (player.hpRegen || 0) + 1;
            break;
        case 'speed':
            player.speedMultiplier = (player.speedMultiplier || 1) * 1.05;
            break;
    }
}

onEnemyReachedBase() {
    this.wave.deadEnemies++;
}

skipWave() {
    if (!this.wave.active && this.wave.timer > 0) {
        this.wave.timer = 0;
    }
}

spawnInstant() {
    if (this.wave.active && this.wave.spawnedEnemies < this.wave.totalEnemies) {
        const count = this.wave.totalEnemies - this.wave.spawnedEnemies;
        for (let i = 0; i < count; i++) {
            this.spawnEnemy();
            this.wave.spawnedEnemies++;
        }
    }
}

getState() {
    return {
        ...super.getState(),
        wave: {
            current: this.wave.current,
            timer: this.wave.timer,
            total: this.wave.totalEnemies,
            dead: this.wave.deadEnemies,
            active: this.wave.active
        }
    };
}
}

module.exports = StandardGame;
