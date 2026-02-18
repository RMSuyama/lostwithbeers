const GameState = require('./GameState');
const { v4: uuidv4 } = require('uuid');

// Standard MOBA/TD Mob Types
const MOB_TYPES = {
    scout: { baseHp: 600, baseSpeed: 150, baseDamage: 50, gold: 10, size: 20, aggroRange: 400, attackRange: 40, attackCooldown: 1.5, color: 0xff8c00, emoji: '🏴' },
    warrior: { baseHp: 1600, baseSpeed: 100, baseDamage: 100, gold: 20, size: 30, aggroRange: 300, attackRange: 45, attackCooldown: 1.0, color: 0xff0000, emoji: '⚔️' },
    brute: { baseHp: 4000, baseSpeed: 60, baseDamage: 150, gold: 40, size: 50, aggroRange: 200, attackRange: 60, attackCooldown: 2.0, color: 0x9932cc, emoji: '💪' },
    ghost: { baseHp: 1000, baseSpeed: 200, baseDamage: 80, gold: 30, size: 25, aggroRange: 500, attackRange: 35, attackCooldown: 0.8, color: 0x00ff00, emoji: '👻' },
    boss: { baseHp: 10000, baseSpeed: 80, baseDamage: 300, gold: 100, size: 70, aggroRange: 600, attackRange: 80, attackCooldown: 1.5, color: 0xffd700, emoji: '👑' }
};

const POSITIONS = {
    BASE: { x: 50 * 32, y: 92 * 32 },
    SPAWN_L: { x: 15 * 32, y: 10 * 32 },
    SPAWN_R: { x: 85 * 32, y: 10 * 32 },
    LANES: {
        LEFT: [{ x: 15 * 32, y: 25 * 32 }, { x: 25 * 32, y: 40 * 32 }, { x: 15 * 32, y: 60 * 32 }, { x: 30 * 32, y: 80 * 32 }, { x: 50 * 32, y: 92 * 32 }],
        RIGHT: [{ x: 85 * 32, y: 25 * 32 }, { x: 75 * 32, y: 40 * 32 }, { x: 85 * 32, y: 60 * 32 }, { x: 70 * 32, y: 80 * 32 }, { x: 50 * 32, y: 92 * 32 }]
    }
};

class StandardGame extends GameState {
    constructor(roomId) {
        super(roomId);

        // Wave State
        this.wave = {
            current: 1,
            active: false,
            timer: 0,
            totalEnemies: 0,
            deadEnemies: 0,
            spawnedEnemies: 0,
            spawnTimer: 0
        };

        this.enemySpawnCount = 0;

        // Init Map Borders & Obstacles
        this.initMap();
    }

    initMap() {
        // Borders
        for (let x = 0; x < this.mapWidth; x++) {
            this.collisionMap[x] = 1;
            this.collisionMap[(this.mapHeight - 1) * this.mapWidth + x] = 1;
        }
        for (let y = 0; y < this.mapHeight; y++) {
            this.collisionMap[y * this.mapWidth] = 1;
            this.collisionMap[y * this.mapWidth + (this.mapWidth - 1)] = 1;
        }
        // Random Obstacles
        for (let i = 0; i < 200; i++) {
            let r_x = Math.floor(Math.random() * (this.mapWidth - 2)) + 1;
            let r_y = Math.floor(Math.random() * (this.mapHeight - 2)) + 1;
            this.collisionMap[r_y * this.mapWidth + r_x] = 1;
        }
    }

    updateGameLogic(dt) {
        if (!this.wave.active) {
            if (this.wave.timer > 0) {
                this.wave.timer -= dt;
            } else {
                this.startWave(this.wave.current);
            }
        } else {
            this.wave.spawnTimer -= dt;
            if (this.wave.spawnedEnemies < this.wave.totalEnemies && this.wave.spawnTimer <= 0) {
                this.spawnEnemy();
                this.wave.spawnedEnemies++;
                this.wave.spawnTimer = 1.5;
            }

            // End Wave condition: Spawning done AND NO enemies alive
            if (this.wave.spawnedEnemies >= this.wave.totalEnemies && this.enemies.length === 0) {
                this.wave.active = false;
                this.wave.timer = 10;
                this.wave.current++;
                console.log(`[StandardGame] Wave ${this.wave.current - 1} finished.`);
            }
        }
    }

    startWave(waveNum) {
        console.log(`[StandardGame] Starting Wave ${waveNum}`);
        this.wave.active = true;
        this.wave.timer = 0;
        this.wave.spawnedEnemies = 0;
        this.wave.deadEnemies = 0;

        const playerCount = Object.keys(this.players).length || 1;
        this.wave.totalEnemies = 6 + waveNum * 2 + (playerCount - 1) * 4;
        this.wave.spawnTimer = 0;
    }

    spawnEnemy() {
        const wave = this.wave.current;
        const isLeft = this.enemySpawnCount % 2 === 0;
        const laneKey = isLeft ? 'LEFT' : 'RIGHT';
        const startPos = isLeft ? POSITIONS.SPAWN_L : POSITIONS.SPAWN_R;
        const path = POSITIONS.LANES[laneKey]; // Standard Games force pathing
        this.enemySpawnCount++;

        let mobType = this.selectMobType(wave);
        const mobConfig = MOB_TYPES[mobType];

        const playerCount = Object.keys(this.players).length || 1;
        const scale = 1 + (playerCount - 1) * 0.4 + (wave - 1) * 0.2;

        const enemy = {
            id: uuidv4(),
            x: startPos.x,
            y: startPos.y,
            path: path,
            pathIndex: 0,
            type: mobType,
            hp: mobConfig.baseHp * scale,
            maxHp: mobConfig.baseHp * scale,
            speed: mobConfig.baseSpeed * (1 + (wave - 1) * 0.03),
            damage: mobConfig.baseDamage * scale,
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
    onEnemyKilled(enemy) {
        this.wave.deadEnemies++;
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
