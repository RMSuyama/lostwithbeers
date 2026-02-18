const { SKILLS, Effect } = require('./systems/skills');
const { v4: uuidv4 } = require('uuid');

class GameState {
    constructor(roomId, options = {}) {
        this.roomId = roomId;
        this.players = {};
        this.enemies = [];
        this.projectiles = [];
        this.lastTick = Date.now();
        this.options = options;

        // Map dimensions (Default to standard, but can be overridden)
        this.tileSize = 32;
        this.mapWidth = 100;
        this.mapHeight = 100;
        this.collisionMap = new Array(this.mapWidth * this.mapHeight).fill(0);

        // Base entity (Optional in some modes, but good to have)
        this.base = {
            x: 50 * this.tileSize,
            y: 92 * this.tileSize,
            hp: 1000,
            maxHp: 1000,
            width: 128,
            height: 128
        };

        // Game status
        this.state = 'playing'; // playing, game_over, victory
    }

    // --- PLAYER MANAGEMENT ---

    addPlayer(socketId, userId) {
        this.players[socketId] = {
            id: socketId,
            userId: userId,
            x: 50 * this.tileSize,
            y: 85 * this.tileSize,
            hp: 100,
            maxHp: 100,
            mana: 100,
            maxMana: 100,
            stamina: 100,
            maxStamina: 100,
            gold: 0,
            input: { vector: { x: 0, y: 0 }, actions: {} },
            effects: [],
            cooldowns: {},
            casting: null,
            attackAnimTimer: 0,
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
            if (inputData.pos) {
                this.players[socketId].x = inputData.pos.x;
                this.players[socketId].y = inputData.pos.y;
            }
        }
    }

    // --- GAME LOOP CORE ---

    update() {
        const now = Date.now();
        const dt = Math.min((now - this.lastTick) / 1000, 0.1);
        this.lastTick = now;

        if (this.state !== 'playing') return;

        this.updateGameLogic(dt);
        this.updateEntities(dt);
        this.checkWinLossCondition();
    }

    updateGameLogic(dt) {
        // To be overridden by subclasses (Waves, Spawning, etc.)
    }

    checkWinLossCondition() {
        // Default: If all players dead => Game Over
        const playerIds = Object.keys(this.players);
        if (playerIds.length > 0) {
            const allDead = playerIds.every(id => this.players[id].hp <= 0);
            if (allDead) {
                this.state = 'game_over';
                console.log(`[GameState] Game Over for Room ${this.roomId}`);
            }
        }
    }

    updateEntities(dt) {
        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.attackTimer > 0) enemy.attackTimer -= dt;

            let closestPlayer = null;
            let closestDist = enemy.aggroRange;

            for (const pid in this.players) {
                const player = this.players[pid];
                if (player.hp <= 0) continue;
                const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                }
            }

            if (closestPlayer) {
                this.moveEnemyTowards(enemy, closestPlayer, dt);
            } else {
                this.moveEnemyDefault(enemy, dt, i);
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.updateProjectile(this.projectiles[i], i, dt);
        }

        // Update Players (Regen, Cooldowns, Casting)
        for (const id in this.players) {
            this.updatePlayer(this.players[id], dt);
        }
    }

    // --- ENTITY LOGIC HELPER METHODS ---

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
            const speed = enemy.speed * 1.2;
            enemy.x += (dx / dist) * speed * dt;
            enemy.y += (dy / dist) * speed * dt;
        }
    }

    moveEnemyDefault(enemy, dt, index) {
        // Default behavior: Pathing to base (Overridden in Boss Mode)
        const target = enemy.path ? enemy.path[enemy.pathIndex] : null;
        if (target) {
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            // Increase validation radius to prevent "orbiting" or getting stuck
            if (dist < 40) {
                enemy.pathIndex++;
                if (enemy.pathIndex >= enemy.path.length) {
                    this.damageBase(enemy.damage);
                    this.enemies.splice(index, 1);
                    this.onEnemyReachedBase();
                    return;
                }
            } else {
                // Normalize vector
                const vx = dx / dist;
                const vy = dy / dist;

                let moveX = vx * enemy.speed * dt;
                let moveY = vy * enemy.speed * dt;

                // Simple wall sliding not really needed for lane mobs, but good safety
                enemy.x += moveX;
                enemy.y += moveY;
            }
        }
    }

    updateProjectile(proj, index, dt) {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.traveled += Math.hypot(proj.vx * dt, proj.vy * dt);

        if (proj.traveled >= proj.range) {
            this.projectiles.splice(index, 1);
            return;
        }

        if (this.checkCollision(proj.x, proj.y)) {
            this.projectiles.splice(index, 1);
            return;
        }

        // Collision with Enemies
        for (let j = this.enemies.length - 1; j >= 0; j--) {
            const enemy = this.enemies[j];
            const distSq = (enemy.x - proj.x) ** 2 + (enemy.y - proj.y) ** 2;
            if (distSq < (enemy.size * enemy.size || 1600)) { // Use enemy size
                this.onProjectileHit(proj, enemy, index);
                return;
            }
        }
    }

    onProjectileHit(proj, enemy, projIndex) {
        enemy.hp -= proj.damage;
        if (enemy.hp <= 0) {
            this.killEnemy(enemy, proj.ownerId);
        }
        this.projectiles.splice(projIndex, 1);
    }

    killEnemy(enemy, killerId) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            this.onEnemyKilled(enemy, killerId);
        }
    }

    onEnemyKilled(enemy) {
        // Overridden
    }

    onEnemyReachedBase() {
        // Overridden relative to wave logic
    }

    updatePlayer(p, dt) {
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

        // Execute intended skills (if not casting)
        if (!p.casting) {
            if (p.input.actions?.attack) p.attackAnimTimer = 0.3; // Trigger attack animation
            if (p.input.actions?.skill_q) this.castSkill(p, 'skill_q', p.input.vector);
            if (p.input.actions?.skill_space) this.castSkill(p, 'skill_space', p.input.vector);
        }

        if (p.attackAnimTimer > 0) p.attackAnimTimer -= dt;

        // Authoritative Movement
        let nextX = p.x + inputX * speed * dt;
        let nextY = p.y + inputY * speed * dt;

        if (!this.checkCollision(nextX, p.y)) p.x = nextX;
        if (!this.checkCollision(p.x, nextY)) p.y = nextY;
    }

    // --- UTILS ---

    checkCollision(x, y) {
        if (x < 0 || x > this.mapWidth * this.tileSize || y < 0 || y > this.mapHeight * this.tileSize) return true;
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        if (gridX < 0 || gridX >= this.mapWidth || gridY < 0 || gridY >= this.mapHeight) return true;
        return this.collisionMap[gridY * this.mapWidth + gridX] === 1;
    }

    enemyAttackPlayer(enemy, player) {
        player.hp -= enemy.damage;
        if (player.hp < 0) player.hp = 0;
        console.log(`[GameState] Enemy ${enemy.name} (${enemy.type}) dealt ${enemy.damage} dmg to Player ${player.id}. HP: ${player.hp}`);
    }

    damageBase(amount) {
        this.base.hp -= amount;
        if (this.base.hp < 0) this.base.hp = 0;
        // console.log(`[GameState] BASE DAMAGED! Health: ${this.base.hp}`);
    }

    // --- SKILL SYSTEM INTERFACE ---

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

    // --- SERIALIZATION ---

    getState() {
        return {
            players: this.players,
            // collisionMap: this.collisionMap, // Static map data, sent only on init if needed or sync once
            projectiles: this.projectiles,
            enemies: this.enemies,
            base: this.base,
            state: this.state
        };
    }
}

module.exports = GameState;
