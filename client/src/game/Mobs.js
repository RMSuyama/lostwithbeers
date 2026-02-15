import { POSITIONS, TILE_SIZE } from './constants';

export const updateMobs = (monsters, playerPos, engine, dt, gameState, setGameState, spawnDamage, stats, baseHpRef) => {
    const now = Date.now();
    const activeMonsters = [];
    let deadCount = 0;
    let xpGain = 0;
    let kills = 0;

    monsters.forEach(m => {
        if (m.hp <= 0) {
            deadCount++;
            kills++;
            xpGain += 2;
            return; // Filter out dead
        }

        const distPlayer = Math.hypot(playerPos.x - m.x, playerPos.y - m.y);
        const dxBase = POSITIONS.BASE.x - m.x;
        const dyBase = POSITIONS.BASE.y - m.y;
        const distBase = Math.hypot(dxBase, dyBase);

        // Movement Helper (Sliding)
        const moveToward = (targetX, targetY) => {
            const angle = Math.atan2(targetY - m.y, targetX - m.x);
            const vx = Math.cos(angle) * m.speed;
            const vy = Math.sin(angle) * m.speed;

            if (engine) {
                // Try X Movement
                const nextX = m.x + vx;
                const gX_x = Math.floor(nextX / TILE_SIZE);
                const gY_x = Math.floor(m.y / TILE_SIZE);
                if (!engine.mapData.collisions[gY_x]?.[gX_x]) {
                    m.x = nextX;
                }

                // Try Y Movement
                const nextY = m.y + vy;
                const gX_y = Math.floor(m.x / TILE_SIZE);
                const gY_y = Math.floor(nextY / TILE_SIZE);
                if (!engine.mapData.collisions[gY_y]?.[gX_y]) {
                    m.y = nextY;
                }
            } else {
                m.x += vx; m.y += vy;
            }
        };

        // Aggro / Chasing
        if (distPlayer < 400 && gameState === 'playing') {
            moveToward(playerPos.x, playerPos.y);

            // Attack Player
            if (distPlayer < 40) {
                if (!m.lastAttack || now - m.lastAttack > 1200) {
                    stats.hp = Math.max(0, stats.hp - 10);
                    m.lastAttack = now;
                    spawnDamage(playerPos.x, playerPos.y, 10);
                    if (stats.hp <= 0) setGameState('dead');
                }
            }
        } else {
            // Move toward Base
            if (distBase > 60) {
                moveToward(POSITIONS.BASE.x, POSITIONS.BASE.y);
            } else {
                // Attack Base
                if (!m.lastAttack || now - m.lastAttack > 1500) {
                    baseHpRef.current -= 15;
                    m.lastAttack = now;
                    spawnDamage(POSITIONS.BASE.x, POSITIONS.BASE.y, 15);
                    if (baseHpRef.current <= 0) setGameState('over');
                }
            }
        }
        activeMonsters.push(m);
    });

    return { activeMonsters, deadCount, xpGain, kills };
};

export const resolveMobCollisions = (monsters, playerPos) => {
    // Entity Pushing Physics (Player <-> Monsters)
    monsters.forEach(m => {
        const dx = m.x - playerPos.x;
        const dy = m.y - playerPos.y;
        const dist = Math.hypot(dx, dy);
        const combinedRadius = 35; // Player 20 + Monster 15
        if (dist < combinedRadius && dist > 0) {
            const overlap = combinedRadius - dist;
            const angle = Math.atan2(dy, dx);
            // Light push for player-monster interaction
            // Since we can't easily mutate playerPos refs passed by value if strict,
            // we return values or mutate m strictly.
            // Game.jsx modifies myPos.current directly.
            // We will return a 'push vector' for the player.
        }
    });

    // Monster <-> Monster pushing (Harder blocking)
    for (let p = 0; p < 2; p++) {
        for (let i = 0; i < monsters.length; i++) {
            for (let j = i + 1; j < monsters.length; j++) {
                const m1 = monsters[i], m2 = monsters[j];
                const dx = m2.x - m1.x, dy = m2.y - m1.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 35 && dist > 0) {
                    const overlap = 35 - dist;
                    const angle = Math.atan2(dy, dx);
                    m1.x -= Math.cos(angle) * overlap * 0.5;
                    m1.y -= Math.sin(angle) * overlap * 0.5;
                    m2.x += Math.cos(angle) * overlap * 0.5;
                    m2.y += Math.sin(angle) * overlap * 0.5;
                }
            }
        }
    }
};
