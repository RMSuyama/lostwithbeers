import { POSITIONS, TILE_SIZE } from '../constants';
import { PhysicsSystem } from './PhysicsSystem';
import { WaveSystem } from './WaveSystem';
import { StatusSystem } from './StatusSystem';

const BASE_POS = POSITIONS.BASE;

export class MobSystem {
    constructor(isHost, performanceSystem) {
        this.isHost = isHost;
        this.performanceSystem = performanceSystem;
        this.mobs = [];
        this.waveSystem = new WaveSystem();
        this.statusSystem = new StatusSystem();
        this.spawnTimeouts = [];
        // Legacy bridge for UI
        this.waveStats = { current: 0, timer: 10, totalMobs: 0, deadMobs: 0 };
    }

    // --- UPDATE LOOP ---
    update(dt, playerPositions, baseHpRef, spawnDamage, setGameState, engine) {
        let deadCount = 0;
        let xpGain = 0;
        let kills = 0;
        const now = Date.now();
        const playerDamage = [];

        // 1. Update Wave State (Host Only)
        if (this.isHost) {
            const waveUpdate = this.waveSystem.update(dt, this.mobs.length);
            this.waveStats.timer = this.waveSystem.nextWaveTimer;
            this.waveStats.current = this.waveSystem.currentWave;

            if (waveUpdate.startWave) {
                this.startWave(waveUpdate.wave, playerPositions.length);
            }

            // Periodic Elite Intersection Spawn (Host Only)
            if (this.waveSystem.isWaveActive && now % 15000 < 50) { // Every ~15 seconds if active
                if (Math.random() > 0.5) this.spawnAtIntersection('elite');
            }
        }

        this.mobs.forEach(m => {
            if (m.hp <= 0) return;

            // 2. Update Status Effects
            this.statusSystem.update(m, dt);

            // 3. Target Selection (Only on Host)
            let target = { x: BASE_POS.x, y: BASE_POS.y, type: 'base' };
            if (this.isHost && !m.isStunned) {
                let minDist = Infinity;
                const alivePlayers = playerPositions.filter(p => p.hp === undefined || p.hp > 0);
                alivePlayers.forEach(p => {
                    const dist = Math.hypot(p.x - m.x, p.y - m.y);
                    if (dist < 500 && dist < minDist) {
                        minDist = dist;
                        target = { x: p.x, y: p.y, type: 'player', id: p.id };
                    }
                });

                // 4. Movement (Only on Host)
                // Follow Waypoints unless a player is very close (Aggro)
                let moveTarget = target;
                const distToPlayer = target.type === 'player' ? Math.hypot(target.x - m.x, target.y - m.y) : Infinity;

                if (distToPlayer > 150 && m.path && m.pathIndex < m.path.length) {
                    const wp = m.path[m.pathIndex];
                    const distToWP = Math.hypot(wp.x - m.x, wp.y - m.y);
                    if (distToWP < 30) {
                        m.pathIndex++;
                        // Intersection Logic: Bosses might swap lanes
                        if (m.isBoss && m.pathIndex === 1) { // At first main intersection
                            if (Math.random() > 0.7) {
                                m.path = [...POSITIONS.LANES[m.lane === 'LEFT' ? 'RIGHT' : 'LEFT']].slice(1);
                                m.pathIndex = 0;
                            }
                        }
                    }
                    if (m.path[m.pathIndex]) moveTarget = m.path[m.pathIndex];
                }

                const angle = Math.atan2(moveTarget.y - m.y, moveTarget.x - m.x);
                const vx = Math.cos(angle) * m.speed;
                const vy = Math.sin(angle) * m.speed;
                let nextX = m.x + vx;
                let nextY = m.y + vy;
                const map = engine?.mapData;
                if (PhysicsSystem.canMove(nextX, m.y, map)) m.x = nextX;
                if (PhysicsSystem.canMove(m.x, nextY, map)) m.y = nextY;
                PhysicsSystem.resolveEntityCollision(m, this.mobs, 15);
                PhysicsSystem.resolveEntityCollision(m, playerPositions, 20);
            }

            // 5. Combat & Damage (Everyone checks for damage to players)
            playerPositions.forEach(p => {
                const distToPlayer = Math.hypot(m.x - p.x, m.y - p.y);
                if (distToPlayer < 50 && !m.isStunned) {
                    if (!m.lastAttack || now - m.lastAttack > 1000) {
                        m.lastAttack = now;
                        const dmgValue = m.damage || (10 + (this.waveStats.current * 2));
                        playerDamage.push({ id: p.id, dmg: dmgValue, x: p.x, y: p.y });
                    }
                }
            });

            // Base Damage (Host Only)
            if (this.isHost) {
                const distToBase = Math.hypot(BASE_POS.x - m.x, BASE_POS.y - m.y);
                if (distToBase < 60) {
                    if (!m.lastBaseAttack || now - m.lastBaseAttack > 1000) {
                        m.lastBaseAttack = now;
                        baseHpRef.current -= 10 + (this.waveStats.current * 5);
                        spawnDamage(BASE_POS.x, BASE_POS.y, 10, '#ff0000');
                        if (baseHpRef.current <= 0) setGameState('over');
                    }
                }
            }
        });

        if (this.isHost) {
            // Cleanup Dead (Host Only)
            const activeMobs = [];
            this.mobs.forEach(m => {
                if (m.hp > 0) {
                    activeMobs.push(m);
                } else {
                    deadCount++;
                    this.waveStats.deadMobs++;
                    kills++;
                    xpGain += 2;
                    if (this.performanceSystem) this.performanceSystem.release('mobs', m);
                }
            });
            this.mobs = activeMobs;
        }

        return { deadCount, xpGain, kills, playerDamage };
    }

    startWave(waveNum, playerCount = 1) {
        if (!this.isHost) return;

        // Clear any lingering timeouts
        this.spawnTimeouts.forEach(t => clearTimeout(t));
        this.spawnTimeouts = [];

        this.waveSystem.start(waveNum);
        const stats = this.waveSystem.getMobStats(waveNum, playerCount);

        this.waveStats.totalMobs = stats.count;
        this.waveStats.deadMobs = 0;

        // Boss Wave Logic (Every 5 waves)
        const isBossWave = waveNum % 5 === 0;
        if (isBossWave) {
            this.spawnMob(waveNum, -1, { ...stats, hp: stats.hp * 10, speed: stats.speed * 0.6, type: 'boss' });
        }

        for (let i = 0; i < stats.count; i++) {
            const offset = i * 400; // Slightly faster stagger
            const timeout = setTimeout(() => {
                this.spawnMob(waveNum, i, stats);
                this.spawnTimeouts = this.spawnTimeouts.filter(t => t !== timeout);
            }, offset);
            this.spawnTimeouts.push(timeout);
        }
    }

    spawnMob(waveNum, i, stats) {
        const spawnSide = i % 2 === 0 ? POSITIONS.SPAWN_L : POSITIONS.SPAWN_R;
        const isElite = Math.random() > 0.9;

        const factory = () => ({
            id: '', x: 0, y: 0, type: '', hp: 0, maxHp: 0, speed: 0, damage: 0, isElite: false,
            lastAttack: 0, lastBaseAttack: 0, isStunned: false,
            path: [], pathIndex: 0, lane: 'left'
        });

        const m = this.performanceSystem ? this.performanceSystem.acquire('mobs', factory) : factory();

        m.id = `w-${waveNum}-${i}-${Date.now()}`;
        m.x = spawnSide.x + (Math.random() - 0.5) * 100;
        m.y = spawnSide.y + (Math.random() - 0.5) * 100;
        m.type = stats.type || (isElite ? 'elite' : (Math.random() > 0.4 ? 'orc' : 'slime'));
        m.hp = isElite ? stats.hp * 3 : stats.hp;
        m.maxHp = isElite ? stats.hp * 3 : stats.hp;
        m.speed = isElite ? stats.speed * 0.7 : stats.speed + Math.random() * 0.2;
        m.damage = isElite ? stats.damage * 2 : stats.damage;
        m.isElite = isElite || m.type === 'boss';
        m.isBoss = m.type === 'boss';
        m.lastAttack = 0;
        m.lastBaseAttack = 0;
        m.isStunned = false;

        // Waypoint Assignment
        const laneKey = i % 2 === 0 ? 'LEFT' : 'RIGHT';
        m.lane = laneKey;
        m.path = [...POSITIONS.LANES[laneKey]];
        m.pathIndex = 0;

        // Dynamic Boss Choice
        if (m.type === 'boss') {
            m.strategy = Math.random() > 0.5 ? 'split' : 'direct';
        }

        this.mobs.push(m);
    }

    spawnAtIntersection(type = 'elite') {
        if (!this.isHost) return;
        const keys = Object.keys(POSITIONS.INTERSECTIONS);
        const pos = POSITIONS.INTERSECTIONS[keys[Math.floor(Math.random() * keys.length)]];

        const factory = () => ({
            id: '', x: 0, y: 0, type: '', hp: 0, maxHp: 0, speed: 0, damage: 0, isElite: false,
            lastAttack: 0, lastBaseAttack: 0, isStunned: false,
            path: [], pathIndex: 0, lane: 'base'
        });

        const m = this.performanceSystem ? this.performanceSystem.acquire('mobs', factory) : factory();
        const wave = this.waveStats.current;
        const stats = this.waveSystem.getMobStats(wave, 1);

        m.id = `elite-inter-${Date.now()}`;
        m.x = pos.x; m.y = pos.y;
        m.type = type;
        m.hp = stats.hp * 4;
        m.maxHp = stats.hp * 4;
        m.speed = stats.speed * 0.8;
        m.damage = stats.damage * 2.5;
        m.isElite = true;
        m.path = [POSITIONS.BASE];
        m.pathIndex = 0;

        this.mobs.push(m);
    }

    spawnInstant() {
        if (!this.isHost) return;
        const remainingCount = this.spawnTimeouts.length;
        if (remainingCount === 0) return;

        this.spawnTimeouts.forEach(t => clearTimeout(t));
        this.spawnTimeouts = [];

        const stats = this.waveSystem.getMobStats(this.waveSystem.currentWave, 1);
        const alreadySpawned = this.waveStats.totalMobs - remainingCount;
        for (let i = alreadySpawned; i < this.waveStats.totalMobs; i++) {
            this.spawnMob(this.waveSystem.currentWave, i, stats);
        }
    }

    skipWaveWaiting() {
        if (!this.isHost) return;
        this.waveSystem.nextWaveTimer = 0;
    }

    syncFromHost(serverMobs) {
        if (this.isHost) return;
        const serverIds = new Set(serverMobs.map(m => m.id));

        serverMobs.forEach(sm => {
            const local = this.mobs.find(m => m.id === sm.id);
            if (local) {
                local.x = sm.x;
                local.y = sm.y;
                local.hp = sm.hp;
                local.isStunned = sm.isStunned; // Sync status flag
            } else {
                this.mobs.push(sm);
            }
        });

        this.mobs = this.mobs.filter(m => serverIds.has(m.id));
    }
}
