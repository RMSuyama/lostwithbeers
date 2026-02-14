const { SKILLS, Effect } = require('./systems/skills');
const { v4: uuidv4 } = require('uuid');

// Mob Type Definitions
const MOB_TYPES = {
    scout: {
        baseHp: 600,      // 20x increase from original 30
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
        baseHp: 1600,     // 20x increase from original 80
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
        baseHp: 4000,     // 20x increase from original 200
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
        baseHp: 1000,     // 20x increase from original 50
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
        baseHp: 10000,    // 20x increase from original 500
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

class GameState {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = {};
        this.enemies = [];
        this.projectiles = []; // { id, x, y, vx, vy, range, traveled, damage, ownerId }
        this.lastTick = Date.now();

        // Map Setup
        this.gridSize = 40;
        this.mapWidth = 80; // 3200px
        this.mapHeight = 80; // 3200px
        this.collisionMap = new Array(this.mapWidth * this.mapHeight).fill(0);

        // Define "The Bar" (Base)
        this.base = {
            x: 3000,
            y: 3000,
            hp: 1000,
            maxHp: 1000,
            width: 200,
            height: 200
        };

        // Define Path (Simple zigzag for now)
        this.enemyPath = [
            { x: 100, y: 100 },   // Spawn
            { x: 100, y: 1000 },
            { x: 1500, y: 1000 },
            { x: 1500, y: 2500 },
            { x: 3000, y: 2500 },
            { x: 3000, y: 3000 }  // Base
        ];

        // Wave State
        this.wave = {
            current: 1,
            active: false,
            timer: 0,
            enemiesRemaining: 0,
            spawnTimer: 0
        };

        // Borders
        for (let x = 0; x < this.mapWidth; x++) {
            this.collisionMap[x] = 1; // Top
            this.collisionMap[(this.mapHeight - 1) * this.mapWidth + x] = 1; // Bottom
        }
        for (let y = 0; y < this.mapHeight; y++) {
            this.collisionMap[y * this.mapWidth] = 1; // Left
            this.collisionMap[y * this.mapWidth + (this.mapWidth - 1)] = 1; // Right
        }

        // Random Obstacles
        for (let i = 0; i < 200; i++) {
            let r_x = Math.floor(Math.random() * (this.mapWidth - 2)) + 1;
            let r_y = Math.floor(Math.random() * (this.mapHeight - 2)) + 1;
            this.collisionMap[r_y * this.mapWidth + r_x] = 1;
        }
    }

    addPlayer(socketId) {
        this.players[socketId] = {
            id: socketId,
            x: 100, y: 100,
            hp: 100,
            maxHp: 100,
            mana: 100,
            maxMana: 100,
            stamina: 100,      // NEW: Stamina
            maxStamina: 100,   // NEW: Max stamina
            input: { vector: { x: 0, y: 0 }, actions: {} },

            // Skill System
            effects: [],
            cooldowns: {},
            casting: null,

            // Default Loadout
            loadout: {
                skill_q: 'fireball',
                skill_space: 'dash'
            },

            // Legacy flags for rendering compatibility if needed (can be removed if Client is strictly using effects)
            isDashing: false
        };
    }

    removePlayer(socketId) {
        delete this.players[socketId];
    }

    handleInput(socketId, inputData) {
        if (this.players[socketId]) {
            this.players[socketId].input = inputData;
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

        // Check Cooldown
        if (player.cooldowns[skillId] > 0) return;

        // Check Mana
        if (player.mana < skill.manaCost) return;

        // NEW: Check Stamina
        if (player.stamina < skill.staminaCost) return;

        // Start Cast or Instant
        if (skill.castTime > 0) {
            player.casting = { skillId, timer: skill.castTime, target: targetVector };
        } else {
            this.executeSkill(player, skill, targetVector);
        }
    }

    executeSkill(player, skill, targetVector) {
        player.mana -= skill.manaCost;
        player.stamina -= skill.staminaCost; // NEW: Consume stamina
        player.cooldowns[skill.id] = skill.cooldown;
        skill.onCast(this, player.id, targetVector);
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastTick) / 1000;
        this.lastTick = now;

        // 1.1 Update Wave & Spawning
        if (this.wave.active) {
            this.wave.spawnTimer -= dt;
            if (this.wave.enemiesRemaining > 0 && this.wave.spawnTimer <= 0) {
                this.spawnEnemy();
                this.wave.enemiesRemaining--;
                this.wave.spawnTimer = 2.0; // 2 seconds between spawns
            }
        } else {
            // Auto start next wave for dev
            if (this.enemies.length === 0) {
                this.startWave(this.wave.current);
            }
        }

        // 1.2 Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Update attack cooldown
            if (enemy.attackTimer > 0) enemy.attackTimer -= dt;

            // Check for nearby players (Aggro System)
            let closestPlayer = null;
            let closestDist = enemy.aggroRange;

            for (const pid in this.players) {
                const player = this.players[pid];
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                }
            }

            if (closestPlayer) {
                // CHASE MODE
                enemy.state = 'chasing';
                enemy.target = closestPlayer;

                const dx = closestPlayer.x - enemy.x;
                const dy = closestPlayer.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= enemy.attackRange) {
                    // ATTACK
                    if (enemy.attackTimer <= 0) {
                        this.enemyAttackPlayer(enemy, closestPlayer);
                        enemy.attackTimer = enemy.attackCooldown;
                    }
                } else {
                    // Chase
                    const speed = enemy.speed * 1.2; // 20% faster when chasing
                    enemy.x += (dx / dist) * speed * dt;
                    enemy.y += (dy / dist) * speed * dt;
                }
            } else {
                // PATH MODE
                enemy.state = 'pathing';
                enemy.target = null;

                const target = this.enemyPath[enemy.pathIndex];
                if (target) {
                    const dx = target.x - enemy.x;
                    const dy = target.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 10) {
                        // Reached waypoint
                        enemy.pathIndex++;
                        if (enemy.pathIndex >= this.enemyPath.length) {
                            // Reached Base
                            this.damageBase(enemy.damage);
                            this.enemies.splice(i, 1);
                            continue;
                        }
                    } else {
                        // Move
                        const speed = enemy.speed;
                        enemy.x += (dx / dist) * speed * dt;
                        enemy.y += (dy / dist) * speed * dt;
                    }
                }
            }
        }

        // 1.3 Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;

            const dist = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) * dt;
            proj.traveled += dist;

            // Range Check
            if (proj.traveled >= proj.range) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Hit Enemy Check
            let hit = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const dx = enemy.x - proj.x;
                const dy = enemy.y - proj.y;
                if (dx * dx + dy * dy < 900) { // 30px radius squared
                    hit = true;
                    enemy.hp -= proj.damage;
                    if (enemy.hp <= 0) {
                        this.enemies.splice(j, 1);
                        // TODO: Grant Gold/Score
                    }
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
            if (hit) continue;

            // Collision Check (Walls)
            if (this.checkCollision(proj.x, proj.y)) {
                this.projectiles.splice(i, 1);
                continue;
            }
        }

        // 2. Update Players
        for (const id in this.players) {
            const p = this.players[id];

            // Regen Mana
            if (p.mana < p.maxMana) p.mana += 5 * dt;

            // NEW: Regen Stamina (faster than mana)
            if (p.stamina < p.maxStamina) p.stamina += 15 * dt;

            // Cooldowns
            for (const skid in p.cooldowns) {
                if (p.cooldowns[skid] > 0) p.cooldowns[skid] -= dt;
            }

            // Effects
            let speedMultiplier = 1.0;
            let invulnerable = false;
            let dashing = false;

            for (let i = p.effects.length - 1; i >= 0; i--) {
                const eff = p.effects[i];
                eff.timer -= dt;

                if (eff.stats.speedMultiplier) speedMultiplier *= eff.stats.speedMultiplier;
                if (eff.stats.invulnerable) {
                    invulnerable = true;
                }
                if (eff.name === 'Dash') dashing = true;

                if (eff.timer <= 0) {
                    p.effects.splice(i, 1);
                }
            }
            p.invulnerable = invulnerable;
            p.isDashing = dashing; // Sync legacy flag for client vfx

            // Casting
            if (p.casting) {
                p.casting.timer -= dt;
                if (p.casting.timer <= 0) {
                    const skill = SKILLS[p.casting.skillId];
                    this.executeSkill(p, skill, p.casting.target);
                    p.casting = null;
                }
            }

            // Input & Movement
            const speed = 200 * speedMultiplier;
            let inputX = p.input.vector?.x || 0;
            let inputY = p.input.vector?.y || 0;

            // Action Mapping
            // Only cast if not currently casting (simple logic)
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
        this.wave.current = waveNum;
        const playerCount = Object.keys(this.players).length || 1;

        // Dynamic spawn count based on players
        let baseEnemies = 5 + waveNum * 2;
        if (playerCount >= 2) baseEnemies = 8 + waveNum * 3;
        if (playerCount >= 3) baseEnemies = 10 + waveNum * 4;

        this.wave.enemiesRemaining = baseEnemies;
        this.wave.active = true;
        this.wave.spawnTimer = 0;
        console.log(`Starting Wave ${waveNum} with ${baseEnemies} enemies (${playerCount} players)`);
    }

    spawnEnemy() {
        const start = this.enemyPath[0];
        const wave = this.wave.current;
        const playerCount = Object.keys(this.players).length || 1;

        // Determine mob type based on wave
        let mobType = this.selectMobType(wave);
        const mobConfig = MOB_TYPES[mobType];

        // Dynamic scaling
        const playerScaling = 1 + (playerCount - 1) * 0.3; // +30% per extra player
        const waveScaling = 1 + wave * 0.15; // +15% per wave

        this.enemies.push({
            id: uuidv4(),
            x: start.x,
            y: start.y,
            pathIndex: 1,
            type: mobType,
            hp: mobConfig.baseHp * playerScaling * waveScaling,
            maxHp: mobConfig.baseHp * playerScaling * waveScaling,
            speed: mobConfig.baseSpeed * (1 + wave * 0.02), // +2% speed per wave
            damage: mobConfig.baseDamage * waveScaling,
            size: mobConfig.size,
            aggroRange: mobConfig.aggroRange,
            attackRange: mobConfig.attackRange,
            attackCooldown: mobConfig.attackCooldown,
            attackTimer: 0,
            target: null, // Player target
            state: 'pathing' // 'pathing' or 'chasing'
        });
    }

    selectMobType(wave) {
        // Boss every 5 waves
        if (wave % 5 === 0 && Math.random() < 0.3) return 'boss';

        // Wave-based distribution
        if (wave === 1) {
            return Math.random() < 0.8 ? 'scout' : 'warrior';
        } else if (wave === 2) {
            const r = Math.random();
            if (r < 0.3) return 'scout';
            return 'warrior';
        } else if (wave === 3) {
            const r = Math.random();
            if (r < 0.2) return 'scout';
            if (r < 0.6) return 'warrior';
            return 'brute';
        } else if (wave === 4) {
            const r = Math.random();
            if (r < 0.1) return 'scout';
            if (r < 0.5) return 'warrior';
            if (r < 0.8) return 'brute';
            return 'ghost';
        } else {
            // Wave 5+
            const r = Math.random();
            if (r < 0.3) return 'warrior';
            if (r < 0.6) return 'brute';
            if (r < 0.9) return 'ghost';
            return 'boss';
        }
    }

    enemyAttackPlayer(enemy, player) {
        if (player.invulnerable) return;

        player.hp -= enemy.damage;
        if (player.hp < 0) player.hp = 0;

        // TODO: Death handling, respawn, etc.
        console.log(`Enemy ${enemy.type} hit player ${player.id} for ${enemy.damage} damage`);
    }

    damageBase(amount) {
        this.base.hp -= amount;
        if (this.base.hp < 0) this.base.hp = 0;
        console.log(`Base took ${amount} damage! HP: ${this.base.hp}/${this.base.maxHp}`);
        // Check Game Over
    }

    getState() {
        return {
            players: this.players,
            collisionMap: this.collisionMap,
            projectiles: this.projectiles,
            enemies: this.enemies,
            base: this.base,
            wave: this.wave
        };
    }
}

module.exports = GameState;
