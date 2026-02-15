import { POSITIONS, TILE_SIZE } from '../constants';
import { PhysicsSystem } from './PhysicsSystem';

const BASE_POS = POSITIONS.BASE;

export class MobSystem {
    constructor(isHost) {
        this.isHost = isHost;
        this.mobs = [];
        this.waveStats = { current: 0, timer: 60, totalMobs: 0, deadMobs: 0 };
        this.spawnTimeouts = [];
    }

    // --- HOST LOGIC ---
    update(dt, playerPositions, baseHpRef, spawnDamage, setGameState, engine) {
        if (!this.isHost) return { deadCount: 0, xpGain: 0, kills: 0 };

        let deadCount = 0;
        let xpGain = 0;
        let kills = 0;
        const now = Date.now();

        this.mobs.forEach(m => {
            if (m.hp <= 0) return;

            // 1. Target Selection (Prioritize closest Player, then Base)
            let target = { x: BASE_POS.x, y: BASE_POS.y, type: 'base' };
            let minDist = Infinity;

            playerPositions.forEach(p => {
                const dist = Math.hypot(p.x - m.x, p.y - m.y);
                if (dist < 500 && dist < minDist) { // Aggro range increased
                    minDist = dist;
                    target = { x: p.x, y: p.y, type: 'player', id: p.id };
                }
            });

            // 2. Movement (Seeking with sliding collision)
            const angle = Math.atan2(target.y - m.y, target.x - m.x);
            const vx = Math.cos(angle) * m.speed;
            const vy = Math.sin(angle) * m.speed;

            let nextX = m.x + vx;
            let nextY = m.y + vy;

            const map = engine?.mapData;

            // Sliding Collision
            if (PhysicsSystem.canMove(nextX, m.y, map)) {
                m.x = nextX;
            }
            if (PhysicsSystem.canMove(m.x, nextY, map)) {
                m.y = nextY;
            }

            // Entity-to-Entity Collision (Mobs avoiding each other)
            PhysicsSystem.resolveEntityCollision(m, this.mobs, 15);
            // Mobs also avoid players
            PhysicsSystem.resolveEntityCollision(m, playerPositions, 20);

            // 3. Combat
            const distToTarget = Math.hypot(target.x - m.x, target.y - m.y);
            const aggroRange = target.type === 'player' ? 50 : 60; // Combat range

            if (distToTarget < aggroRange) {
                if (!m.lastAttack || now - m.lastAttack > 1000) {
                    m.lastAttack = now;
                    if (target.type === 'player') {
                        spawnDamage(target.x, target.y, 10 + (this.waveStats.current * 2), '#ff0000');
                    } else {
                        baseHpRef.current -= 10 + (this.waveStats.current * 5);
                        spawnDamage(BASE_POS.x, BASE_POS.y, 10, '#ff0000');
                        if (baseHpRef.current <= 0) setGameState('over');
                    }
                }
            }
        });

        // Cleanup Dead
        const activeMobs = [];
        this.mobs.forEach(m => {
            if (m.hp > 0) {
                activeMobs.push(m);
            } else {
                deadCount++;
                this.waveStats.deadMobs++;
                kills++;
                xpGain += 2;
            }
        });
        this.mobs = activeMobs;

        return { deadCount, xpGain, kills };
    }

    startWave(waveNum) {
        if (!this.isHost) return;

        // Clear any lingering timeouts
        this.spawnTimeouts.forEach(t => clearTimeout(t));
        this.spawnTimeouts = [];

        this.waveStats.current = waveNum;
        this.waveStats.timer = waveNum === 1 ? 10 : 60; // Shorter wait for first wave
        const count = 5 + (waveNum * 4);
        this.waveStats.totalMobs = count;
        this.waveStats.deadMobs = 0;

        for (let i = 0; i < count; i++) {
            const offset = i * 500; // Stagger spawns
            const timeout = setTimeout(() => {
                this.spawnMob(waveNum, i);
                // Remove from tracking
                this.spawnTimeouts = this.spawnTimeouts.filter(t => t !== timeout);
            }, offset);
            this.spawnTimeouts.push(timeout);
        }
    }

    spawnMob(waveNum, i) {
        const spawnSide = i % 2 === 0 ? POSITIONS.SPAWN_L : POSITIONS.SPAWN_R;
        this.mobs.push({
            id: `w-${waveNum}-${i}-${Date.now()}`,
            x: spawnSide.x + (Math.random() - 0.5) * 100,
            y: spawnSide.y + (Math.random() - 0.5) * 100,
            type: Math.random() > 0.4 ? 'orc' : 'slime',
            hp: 50 + (waveNum * 20),
            maxHp: 50 + (waveNum * 20),
            speed: 2 + Math.random() * 0.5,
        });
    }

    spawnInstant() {
        if (!this.isHost) return;
        const remainingCount = this.spawnTimeouts.length;
        if (remainingCount === 0) return;

        // Clear all pending timeouts
        this.spawnTimeouts.forEach(t => clearTimeout(t));
        this.spawnTimeouts = [];

        // Spawn all remaining for this wave immediately
        const alreadySpawned = this.waveStats.totalMobs - remainingCount;
        for (let i = alreadySpawned; i < this.waveStats.totalMobs; i++) {
            this.spawnMob(this.waveStats.current, i);
        }
    }

    skipWaveWaiting() {
        if (!this.isHost) return;
        this.waveStats.timer = 0;
    }

    // --- CLIENT LOGIC ---
    syncFromHost(serverMobs) {
        if (this.isHost) return;

        // Naive sync: Replace entire list
        // Better sync: Update existing, add new, remove missing

        // For smoothness, we should interpolate. 
        // For now, let's just update positions and create new ones.

        const serverIds = new Set(serverMobs.map(m => m.id));

        // Update or Create
        serverMobs.forEach(sm => {
            const local = this.mobs.find(m => m.id === sm.id);
            if (local) {
                // Interpolation Target (Lerp handled in render or update?)
                // For simplicity in this step, direct set. 
                // To fix jitter, we would store 'targetX/Y' and lerp in render loop.
                local.x = sm.x; // sm.x is authoritative
                local.y = sm.y;
                local.hp = sm.hp;
            } else {
                this.mobs.push(sm);
            }
        });

        // Remove Cleaned
        this.mobs = this.mobs.filter(m => serverIds.has(m.id));
    }
}
