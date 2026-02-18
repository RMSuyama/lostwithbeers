const { SKILLS, Effect } = require('./systems/skills');
const { v4: uuidv4 } = require('uuid');

// Mob Type Definitions
const MOB_TYPES = {
    scout: {
        baseHp: 600,
        baseSpeed: 150,
        baseDamage: 50,
        gold: 10,
        size: 20,
        aggroRange: 400,
        attackRange: 40,
        attackCooldown: 1.5,
        color: 0xff8c00, // Orange
        emoji: '🏴'
    },
    warrior: {
        baseHp: 1600,
        baseSpeed: 100,
        baseDamage: 100,
        gold: 20,
        size: 30,
        aggroRange: 300,
        attackRange: 45,
        attackCooldown: 1.0,
        color: 0xff0000, // Red
        emoji: '⚔️'
    },
    brute: {
        baseHp: 4000,
        baseSpeed: 60,
        baseDamage: 150,
        gold: 40,
        size: 50,
        aggroRange: 200,
        attackRange: 60,
        attackCooldown: 2.0,
        color: 0x9932cc, // Purple
        emoji: '💪'
    },
    ghost: {
        baseHp: 1000,
        baseSpeed: 200,
        baseDamage: 80,
        gold: 30,
        size: 25,
        aggroRange: 500,
        attackRange: 35,
        attackCooldown: 0.8,
        color: 0x00ff00, // Green
        emoji: '👻'
    },
    boss: {
        baseHp: 10000,
        baseSpeed: 80,
        baseDamage: 300,
        gold: 100,
        size: 70,
        aggroRange: 600,
        attackRange: 80,
        attackCooldown: 1.5,
        color: 0xffd700, // Gold
        emoji: '👑'
    }
};

// Map Setup (Synced with Client)
const TILE_SIZE = 32;
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;

const POSITIONS = {
    BASE: { x: 50 * TILE_SIZE, y: 92 * TILE_SIZE },
    SPAWN_L: { x: 15 * TILE_SIZE, y: 10 * TILE_SIZE },
    SPAWN_R: { x: 85 * TILE_SIZE, y: 10 * TILE_SIZE },
    LANES: {
        LEFT: [
            { x: 15 * TILE_SIZE, y: 25 * TILE_SIZE },
            { x: 25 * TILE_SIZE, y: 40 * TILE_SIZE },
            { x: 15 * TILE_SIZE, y: 60 * TILE_SIZE },
            { x: 30 * TILE_SIZE, y: 80 * TILE_SIZE },
            { x: 50 * TILE_SIZE, y: 92 * TILE_SIZE }
        ],
        RIGHT: [
            { x: 85 * TILE_SIZE, y: 25 * TILE_SIZE },
            { x: 75 * TILE_SIZE, y: 40 * TILE_SIZE },
            { x: 85 * TILE_SIZE, y: 60 * TILE_SIZE },
            { x: 70 * TILE_SIZE, y: 80 * TILE_SIZE },
            { x: 50 * TILE_SIZE, y: 92 * TILE_SIZE }
        ]
    }
};

class GameState {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = {};
        this.enemies = [];
        this.projectiles = [];
        this.lastTick = Date.now();

        // Internals
        this.gridSize = TILE_SIZE;
        this.mapWidth = MAP_WIDTH;
        this.mapHeight = MAP_HEIGHT;
        this.collisionMap = new Array(this.mapWidth * this.mapHeight).fill(0);

        // Define Base HP
        this.base = {
            ...POSITIONS.BASE,
            hp: 1000,
            maxHp: 1000,
            width: 128,
            height: 128
        };

        // Wave State
        this.wave = {
            current: 1,      // The active wave number
            active: false,
            timer: 0,
            totalEnemies: 0,
            deadEnemies: 0,
            spawnedEnemies: 0,
            spawnTimer: 0
        };

        this.enemySpawnCount = 0;

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

    addPlayer(socketId, userId) {
        this.players[socketId] = {
            id: socketId,
            userId: userId,
            x: 50 * TILE_SIZE, y: 85 * TILE_SIZE,
            hp: 100,
            maxHp: 100,
            mana: 100,
            maxMana: 100,
            stamina: 100,
            maxStamina: 100,
            input: { vector: { x: 0, y: 0 }, actions: {} },
            effects: [],
            cooldowns: {},
            casting: null,
            loadout: {
                skill_q: 'fireball',
                skill_space: 'dash'
            }
        };
    }

    removePlayer(socketId) {
        delete this.players[socketId];
    }

    handleInput(socketId, inputData) {
        if (this.players[socketId]) {
            this.players[socketId].input = inputData;
            // Snap position if client sent it
            if (inputData.pos) {
                this.players[socketId].x = inputData.pos.x;
                this.players[socketId].y = inputData.pos.y;
            }
        }
    }

    checkCollision(x, y) {
        if (x < 0 || x > this.mapWidth * this.gridSize || y < 0 || y > this.mapHeight * this.gridSize) return true;
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        if (gridX < 0 || gridX >= this.mapWidth || gridY < 0 || gridY >= this.mapHeight) return true;
        return this.collisionMap[gridY * this.mapWidth + gridX] === 1;
    }

    castSkill(player, slot, targetVector) {
        const skillId = player.loadout[slot];
        if (!skillId) return;
        const skill = SKILLS[skillId];
        if (!skill) return;
        if (player.cooldowns[skillId] > 0) return;
        if (player.mana < skill.manaCost) return;
        if (player.stamina < skill.staminaCost) return;

        if (skill.castTime > 0) {
            player.casting = { skillId, timer: skill.castTime, target: targetVector };
        } else {
            this.executeSkill(player, skill, targetVector);
        }
    }

    executeSkill(player, skill, targetVector) {
        player.mana -= skill.manaCost;
        player.stamina -= skill.staminaCost;
        player.cooldowns[skill.id] = skill.cooldown;
        skill.onCast(this, player.id, targetVector);
    }

    update() {
        const now = Date.now();
        const dt = Math.min((now - this.lastTick) / 1000, 0.1);
        this.lastTick = now;

        // Debug timer every 5 seconds
        if (now % 5000 < 20) {
            console.log(`[GameState] ${this.roomId} Tick - dt: ${dt.toFixed(4)}, Wave: ${this.wave.current}, Active: ${this.wave.active}, Timer: ${this.wave.timer.toFixed(1)}`);
        }

        // Wave Sync & Spawning
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
                console.log(`[GameState] Spawning enemy ${this.wave.spawnedEnemies}/${this.wave.totalEnemies}`);
            }

            // End Wave
            if (this.wave.spawnedEnemies >= this.wave.totalEnemies && this.enemies.length === 0) {
                this.wave.active = false;
                this.wave.timer = 10;
                this.wave.current++;
                console.log(`[GameState] Wave ${this.wave.current - 1} finished (all dead). Next: ${this.wave.current}`);
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.attackTimer > 0) enemy.attackTimer -= dt;

            let closestPlayer = null;
            let closestDist = enemy.aggroRange;

            for (const pid in this.players) {
                const player = this.players[pid];
                if (player.hp <= 0) continue; // Ignore dead players
                const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                }
            }

            if (closestPlayer) {
                const dx = closestPlayer.x - enemy.x;
                const dy = closestPlayer.y - enemy.y;
                const dist = Math.hypot(dx, dy);

                if (dist <= enemy.attackRange) {
                    if (enemy.attackTimer <= 0) {
                        this.enemyAttackPlayer(enemy, closestPlayer);
                        enemy.attackTimer = enemy.attackCooldown;
                    }
                } else {
                    const speed = enemy.speed * 1.2;
                    enemy.x += (dx / dist) * speed * dt;
                    enemy.y += (dy / dist) * speed * dt;
                }
            } else {
                const target = enemy.path[enemy.pathIndex];
                if (target) {
                    const dx = target.x - enemy.x;
                    const dy = target.y - enemy.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < 15) {
                        enemy.pathIndex++;
                        if (enemy.pathIndex >= enemy.path.length) {
                            this.damageBase(enemy.damage);
                            this.enemies.splice(i, 1);
                            this.wave.deadEnemies++; // Base counts as "cleared" for UI
                            continue;
                        }
                    } else {
                        enemy.x += (dx / dist) * enemy.speed * dt;
                        enemy.y += (dy / dist) * enemy.speed * dt;
                    }
                }
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
            proj.traveled += Math.hypot(proj.vx * dt, proj.vy * dt);

            if (proj.traveled >= proj.range) {
                this.projectiles.splice(i, 1);
                continue;
            }

            let hit = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const distSq = (enemy.x - proj.x) ** 2 + (enemy.y - proj.y) ** 2;
                if (distSq < 1600) {
                    hit = true;
                    enemy.hp -= proj.damage;
                    if (enemy.hp <= 0) {
                        this.enemies.splice(j, 1);
                        this.wave.deadEnemies++;
                    }
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
            if (hit) continue;
            if (this.checkCollision(proj.x, proj.y)) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update Players
        for (const id in this.players) {
            const p = this.players[id];
            if (p.mana < p.maxMana) p.mana += 10 * dt;
            if (p.stamina < p.maxStamina) p.stamina += 25 * dt;

            for (const skid in p.cooldowns) {
                if (p.cooldowns[skid] > 0) p.cooldowns[skid] -= dt;
            }

            let speedMultiplier = 1.0;
            for (let i = p.effects.length - 1; i >= 0; i--) {
                const eff = p.effects[i];
                eff.timer -= dt;
                if (eff.stats.speedMultiplier) speedMultiplier *= eff.stats.speedMultiplier;
                if (eff.timer <= 0) p.effects.splice(i, 1);
            }

            if (p.casting) {
                p.casting.timer -= dt;
                if (p.casting.timer <= 0) {
                    const skill = SKILLS[p.casting.skillId];
                    if (skill) this.executeSkill(p, skill, p.casting.target);
                    p.casting = null;
                }
            }

            const speed = 250 * speedMultiplier;
            let inputX = p.input.vector?.x || 0;
            let inputY = p.input.vector?.y || 0;

            if (!p.casting) {
                if (p.input.actions?.skill_q) this.castSkill(p, 'skill_q', p.input.vector);
                if (p.input.actions?.skill_space) this.castSkill(p, 'skill_space', p.input.vector);
            }

            let nextX = p.x + inputX * speed * dt;
            let nextY = p.y + inputY * speed * dt;

            if (!this.checkCollision(nextX, p.y)) p.x = nextX;
            if (!this.checkCollision(p.x, nextY)) p.y = nextY;
        }
    }

    startWave(waveNum) {
        console.log(`[GameState] Starting Wave ${waveNum}`);
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
        const path = POSITIONS.LANES[laneKey];
        this.enemySpawnCount++;

        let mobType = this.selectMobType(wave);
        const mobConfig = MOB_TYPES[mobType];
        if (!mobConfig) return;

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

    enemyAttackPlayer(enemy, player) {
        player.hp -= enemy.damage;
        if (player.hp < 0) player.hp = 0;
        console.log(`[GameState] Enemy ${enemy.type} attacked Player ${player.id}. HP: ${player.hp}`);
    }

    damageBase(amount) {
        this.base.hp -= amount;
        if (this.base.hp < 0) this.base.hp = 0;
        console.log(`[GameState] BASE DAMAGED! Health: ${this.base.hp}`);
    }

    skipWave() {
        if (!this.wave.active && this.wave.timer > 0) {
            this.wave.timer = 0;
            console.log(`[GameState] Wave ${this.wave.current} skipped timer by host.`);
        }
    }

    spawnInstant() {
        if (this.wave.active && this.wave.spawnedEnemies < this.wave.totalEnemies) {
            console.log(`[GameState] Wave ${this.wave.current} instant spawning ${this.wave.totalEnemies - this.wave.spawnedEnemies} enemies.`);
            const count = this.wave.totalEnemies - this.wave.spawnedEnemies;
            for (let i = 0; i < count; i++) {
                this.spawnEnemy();
                this.wave.spawnedEnemies++;
            }
        }
    }

    getState() {
        return {
            players: this.players,
            collisionMap: this.collisionMap,
            projectiles: this.projectiles,
            enemies: this.enemies,
            base: this.base,
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

module.exports = GameState;
