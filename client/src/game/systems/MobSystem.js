import { POSITIONS, TILE_SIZE, SPAWN_POS_L, SPAWN_POS_R } from '../constants';

const BASE_POS = POSITIONS.BASE;

export class MobSystem {
    constructor(isHost) {
        this.isHost = isHost;
        this.mobs = [];
        this.waveStats = { current: 0, timer: 60, totalMobs: 0, deadMobs: 0 };
    }

    // --- HOST LOGIC ---
    update(dt, playerPositions, baseHpRef, spawnDamage, setGameState, engine) {
        if (!this.isHost) return { deadCount: 0, xpGain: 0, kills: 0 };

        let deadCount = 0;
        let xpGain = 0;
        let kills = 0;
        const now = Date.now();

        this.mobs.forEach(m => {
            if (m.hp <= 0) return; // Skip dead awaiting cleanup

            // 1. Target Selection (Closest Player or Base)
            let target = { x: BASE_POS.x, y: BASE_POS.y, type: 'base' };
            let minDist = Infinity;

            playerPositions.forEach(p => {
                const dist = Math.hypot(p.x - m.x, p.y - m.y);
                if (dist < 400 && dist < minDist) { // Aggro range
                    minDist = dist;
                    target = { x: p.x, y: p.y, type: 'player', id: p.id };
                }
            });

            // 2. Movement (Simple seeking with pathing check)
            const angle = Math.atan2(target.y - m.y, target.x - m.x);
            const vx = Math.cos(angle) * m.speed;
            const vy = Math.sin(angle) * m.speed;

            // Collision Check with Map
            let nextX = m.x + vx;
            let nextY = m.y + vy;

            if (engine) {
                const gX = Math.floor(nextX / TILE_SIZE);
                const gY = Math.floor(nextY / TILE_SIZE);
                // Simple wall check - if wall, don't move (or slide)
                // For now, strict block:
                if (engine.mapData.collisions[gY]?.[gX]) {
                    nextX = m.x; // Block X
                    nextY = m.y; // Block Y (Too simple, needs slide)
                    // Slide Component
                }
            }
            m.x = nextX;
            m.y = nextY;


            // 3. Combat
            const distToTarget = Math.hypot(target.x - m.x, target.y - m.y);
            if (distToTarget < 40) {
                if (!m.lastAttack || now - m.lastAttack > 1000) {
                    m.lastAttack = now;
                    if (target.type === 'player') {
                        // We can't easily damage remote players directly from here without authoritative server
                        // For now, we spawn a visual damage number and rely on clients to trust the host?
                        // OR: Host sends "DamagePlayer" event.
                        // SIMPLIFICATION: We just spawn visual damage and update local state if it's the host player.
                        // Proper way: Host tells Network "Player X take Y damage".
                        spawnDamage(target.x, target.y, 10, '#ff0000');
                    } else {
                        baseHpRef.current -= 10;
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
                kills++;
                xpGain += 2;
            }
        });
        this.mobs = activeMobs;

        return { deadCount, xpGain, kills };
    }

    startWave(waveNum) {
        if (!this.isHost) return;

        this.waveStats.current = waveNum;
        this.waveStats.timer = 60;
        const count = 5 + (waveNum * 4);
        this.waveStats.totalMobs = count;
        this.waveStats.deadMobs = 0;

        for (let i = 0; i < count; i++) {
            const offset = i * 500; // Stagger spawns
            const spawnSide = i % 2 === 0 ? SPAWN_POS_L : SPAWN_POS_R;

            setTimeout(() => {
                // Check if we didn't reset game in timeout
                this.mobs.push({
                    id: `w-${waveNum}-${i}-${Date.now()}`,
                    x: spawnSide.x + (Math.random() - 0.5) * 100,
                    y: spawnSide.y + (Math.random() - 0.5) * 100,
                    type: Math.random() > 0.4 ? 'orc' : 'slime',
                    hp: 50 + (waveNum * 20),
                    maxHp: 50 + (waveNum * 20),
                    speed: 2 + Math.random() * 0.5,
                });
            }, offset);
        }
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
