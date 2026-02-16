import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, TILE_TYPES } from './constants';
import { CHAMPION_SKINS } from './renderers/ChampionRenderer';
import { getChamp } from './Champions';

export const generateMap = (seed = 0) => {
    // Better Random
    let s = seed + 12345;
    const rnd = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };

    // Initialize Arrays
    const grid = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(TILE_TYPES.MURKY_WATER));
    const scales = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(3));
    const collisions = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(true));

    // --- HELPER: Draw Circle ---
    const drawCircle = (cx, cy, r, type) => {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
            for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
                if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                    if (Math.hypot(x - cx, y - cy) <= r) {
                        grid[y][x] = type;
                        scales[y][x] = 0;
                        collisions[y][x] = false;
                    }
                }
            }
        }
    };

    // --- HELPER: Catmull-Rom Spline Interpolation for Organic Curves ---
    // Points: Array of {x, y}
    const drawWidePath = (points, width) => {
        if (points.length < 2) return;

        // Catmull-Rom Spline
        const p = [points[0], ...points, points[points.length - 1]];

        for (let i = 0; i < p.length - 3; i++) {
            const p0 = p[i], p1 = p[i + 1], p2 = p[i + 2], p3 = p[i + 3];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const steps = dist * 4; // Higher resolution to prevent gaps

            for (let t = 0; t <= steps; t++) {
                const u = t / steps;
                const q0 = -u * u * u + 2 * u * u - u;
                const q1 = 3 * u * u * u - 5 * u * u + 2;
                const q2 = -3 * u * u * u + 4 * u * u + u;
                const q3 = u * u * u - u * u;

                const tx = 0.5 * (p0.x * q0 + p1.x * q1 + p2.x * q2 + p3.x * q3);
                const ty = 0.5 * (p0.y * q0 + p1.y * q1 + p2.y * q2 + p3.y * q3);

                drawCircle(tx, ty, width, TILE_TYPES.GRASS);
            }
        }
    };

    // --- MAIN LANES ---
    // Wide, clear paths for combat.

    // Left Lane
    drawWidePath([
        { x: 15, y: 5 }, { x: 15, y: 25 },
        { x: 25, y: 40 }, { x: 15, y: 60 },
        { x: 30, y: 80 }, { x: 50, y: 92 }
    ], 6);

    // Right Lane
    drawWidePath([
        { x: 85, y: 5 }, { x: 85, y: 25 },
        { x: 75, y: 40 }, { x: 85, y: 60 },
        { x: 70, y: 80 }, { x: 50, y: 92 }
    ], 6);

    // Center Connection (The "Jungle")
    drawWidePath([
        { x: 25, y: 40 }, { x: 50, y: 50 }, { x: 75, y: 40 }
    ], 5);

    // Base Area
    drawCircle(50, 92, 12, TILE_TYPES.FORT_WOOD);

    // --- RANDOMIZED ELEMENTS (Deterministic via Seed) ---
    // Scatter some cobblestone patches
    for (let i = 0; i < 20; i++) {
        const rx = Math.floor(rnd() * MAP_WIDTH);
        const ry = Math.floor(rnd() * MAP_HEIGHT);
        if (grid[ry][rx] === TILE_TYPES.GRASS) {
            drawCircle(rx, ry, 2 + rnd() * 3, TILE_TYPES.COBBLESTONE);
        }
    }

    // --- WALLS & AESTHETICS ---
    // Scan and build walls
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
        for (let x = 1; x < MAP_WIDTH - 1; x++) {
            if (grid[y][x] === TILE_TYPES.MURKY_WATER) {
                // Neighbors
                let isCoast = false;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (grid[y + dy]?.[x + dx] === TILE_TYPES.GRASS || grid[y + dy]?.[x + dx] === TILE_TYPES.FORT_WOOD) {
                            isCoast = true;
                        }
                    }
                }
                if (isCoast) {
                    grid[y][x] = TILE_TYPES.STONE_WALL;
                    scales[y][x] = 2; // Skill-shot over
                    collisions[y][x] = true;
                }
            }
        }
    }

    return { grid, scales, collisions };
};

export const getMinimapData = (mapData) => {
    // Return a simplified version for the UI or just the collisions map
    return mapData.collisions;
};

export class MapRenderer {
    constructor(canvas, seed = 0) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapData = generateMap(seed);
        // LOADING SCREEN PALETTE
        this.colors = {
            [TILE_TYPES.GRASS]: '#0b1a0b',     // The Loading Screen Background (Walkable)
            [TILE_TYPES.COBBLESTONE]: '#1a2f1a', // Slightly lighter
            [TILE_TYPES.MURKY_WATER]: '#0f2347', // Rich Dark Sea Blue
            [TILE_TYPES.STONE_WALL]: '#143411',  // Dark Green Wall
            [TILE_TYPES.FORT_WOOD]: '#2a1a05',   // Wood
            [TILE_TYPES.CARGO_CRATE]: '#78350f',
        };
    }

    draw(entities, camera, dummies = [], monsters = [], projectiles = [], damageNumbers = [], attackEffect = null, baseHp = 1000, maxBaseHp = 1000, spawnPoints = []) {
        const { ctx, canvas } = this;
        // Background: Abyss (Rich Dark Sea Blue)
        ctx.fillStyle = '#0f2347';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const offsetX = Math.floor(canvas.width / 2 - camera.x);
        const offsetY = Math.floor(canvas.height / 2 - camera.y);
        const settings = JSON.parse(localStorage.getItem('gameSettings') || '{"showMyName": true}');

        const startX = Math.floor(-offsetX / TILE_SIZE);
        const endX = Math.floor((canvas.width - offsetX) / TILE_SIZE) + 1;
        const startY = Math.floor(-offsetY / TILE_SIZE);
        const endY = Math.floor((canvas.height - offsetY) / TILE_SIZE) + 1;

        const objectLayer = [];

        // GRID EFFECT (Retro Style - Blue Tint)
        ctx.strokeStyle = 'rgba(30, 64, 175, 0.2)';
        ctx.lineWidth = 1;

        // PASS 1: Terrain
        for (let y = Math.max(0, startY); y < Math.min(MAP_HEIGHT, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(MAP_WIDTH, endX); x++) {
                const tileType = this.mapData.grid[y][x];
                const screenX = Math.floor(x * TILE_SIZE + offsetX);
                const screenY = Math.floor(y * TILE_SIZE + offsetY);

                if (tileType === TILE_TYPES.STONE_WALL) {
                    objectLayer.push({ type: 'prop', tileType, x: x * TILE_SIZE + 16, y: y * TILE_SIZE + 32, renderX: screenX, renderY: screenY });
                    // Draw floor under wall
                    ctx.fillStyle = this.colors[TILE_TYPES.GRASS];
                    ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    continue;
                }

                if (tileType !== TILE_TYPES.MURKY_WATER) {
                    ctx.fillStyle = this.colors[tileType];
                    ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

                    // Grid lines on walkable floor
                    ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

                    // RETRO TEXTURE POINTS
                    if (tileType === TILE_TYPES.GRASS && (x + y) % 3 === 0) {
                        ctx.fillStyle = 'rgba(255, 215, 0, 0.05)'; // Faint Gold dust
                        ctx.fillRect(screenX + 10, screenY + 10, 2, 2);
                    }
                }
            }
        }

        // Add Entities
        entities.forEach(e => objectLayer.push({ ...e, type: 'player', sortY: e.y }));
        monsters.forEach(m => objectLayer.push({ ...m, type: 'monster', sortY: m.y }));

        // PASS 2: Objects
        objectLayer.sort((a, b) => (a.sortY || a.y) - (b.sortY || b.y));

        objectLayer.forEach(obj => {
            const rx = Math.floor((obj.type === 'prop' ? obj.renderX : obj.x + offsetX));
            const ry = Math.floor((obj.type === 'prop' ? obj.renderY : obj.y + offsetY));

            if (obj.type === 'prop') {
                if (obj.tileType === TILE_TYPES.STONE_WALL) {
                    // Retro Wall: Dark Green box with Connected Gold Outlines
                    ctx.fillStyle = '#0f220f';
                    ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);

                    ctx.strokeStyle = '#ffd700'; // GOLD OUTLINE
                    ctx.lineWidth = 1;

                    // Get grid position
                    const tx = Math.floor(obj.x / TILE_SIZE);
                    const ty = Math.floor(obj.y / TILE_SIZE);
                    const grid = this.mapData.grid;

                    // Check neighbors
                    const hasN = grid[ty - 1]?.[tx] === TILE_TYPES.STONE_WALL;
                    const hasS = grid[ty + 1]?.[tx] === TILE_TYPES.STONE_WALL;
                    const hasW = grid[ty]?.[tx - 1] === TILE_TYPES.STONE_WALL;
                    const hasE = grid[ty]?.[tx + 1] === TILE_TYPES.STONE_WALL;

                    const pad = 4;
                    const end = 28;

                    ctx.beginPath();
                    // Main interior borders
                    if (!hasN) { ctx.moveTo(rx + pad, ry + pad); ctx.lineTo(rx + end, ry + pad); }
                    if (!hasS) { ctx.moveTo(rx + pad, ry + end); ctx.lineTo(rx + end, ry + end); }
                    if (!hasW) { ctx.moveTo(rx + pad, ry + pad); ctx.lineTo(rx + pad, ry + end); }
                    if (!hasE) { ctx.moveTo(rx + end, ry + pad); ctx.lineTo(rx + end, ry + end); }

                    // Connection extensions (to close gaps between tiles)
                    if (hasN) {
                        ctx.moveTo(rx + pad, ry); ctx.lineTo(rx + pad, ry + pad);
                        ctx.moveTo(rx + end, ry); ctx.lineTo(rx + end, ry + pad);
                    }
                    if (hasS) {
                        ctx.moveTo(rx + pad, ry + end); ctx.lineTo(rx + pad, ry + 32);
                        ctx.moveTo(rx + end, ry + end); ctx.lineTo(rx + end, ry + 32);
                    }
                    if (hasW) {
                        ctx.moveTo(rx, ry + pad); ctx.lineTo(rx + pad, ry + pad);
                        ctx.moveTo(rx, ry + end); ctx.lineTo(rx + pad, ry + end);
                    }
                    if (hasE) {
                        ctx.moveTo(rx + end, ry + pad); ctx.lineTo(rx + 32, ry + pad);
                        ctx.moveTo(rx + end, ry + end); ctx.lineTo(rx + 32, ry + end);
                    }
                    ctx.stroke();
                }
            } else if (obj.type === 'player') {
                ctx.save(); ctx.translate(rx, ry);
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.beginPath(); ctx.ellipse(0, 15, 10, 5, 0, 0, Math.PI * 2); ctx.fill();

                // Champion Skin
                const skin = CHAMPION_SKINS[obj.championId] || CHAMPION_SKINS.default;
                skin(ctx, 0, 0, obj.walkTimer || 0, obj.color, obj.angle || 0, this.jacaAssets, obj.isMoving);
                ctx.restore();

                // Name & Health
                const isMe = obj.id === camera.followId;
                if (!isMe || settings.showMyName) {
                    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px "VT323", Arial'; ctx.textAlign = 'center';
                    ctx.fillText(obj.name, rx, ry - 40);
                }
                // HP Bar
                ctx.fillStyle = '#000'; ctx.fillRect(rx - 16, ry - 52, 32, 6);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(rx - 16, ry - 52, 32, 6);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(rx - 15, ry - 51, (obj.hp / obj.maxHp) * 30, 4);

                // Status Icons (Player)
                if (obj.statuses) {
                    let sX = rx - 12; const sY = ry - 65;
                    Object.entries(obj.statuses).forEach(([type, s]) => {
                        if (s.duration > 0) {
                            ctx.font = '12px serif';
                            const icon = type === 'burn' ? '🔥' : type === 'poison' ? '🤮' : type === 'slow' ? '❄️' : type === 'stun' ? '💫' : '';
                            ctx.fillText(icon, sX, sY); sX += 14;
                        }
                    });
                }
            } else if (obj.type === 'monster') {
                ctx.save(); ctx.translate(rx, ry);

                // Shadow for all monsters
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.beginPath();
                ctx.ellipse(0, obj.type === 'boss' ? 25 : 15, obj.type === 'boss' ? 30 : 15, 8, 0, 0, Math.PI * 2);
                ctx.fill();

                if (obj.type === 'orc') {
                    ctx.fillStyle = '#b91c1c'; ctx.fillRect(-15, -15, 30, 30);
                    ctx.strokeStyle = '#fab005'; ctx.lineWidth = 2; ctx.strokeRect(-15, -15, 30, 30);
                } else if (obj.type === 'elite') {
                    // Elite Glow
                    ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 15;
                    ctx.fillStyle = '#7c2d12'; ctx.fillRect(-20, -20, 40, 40);
                    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.strokeRect(-20, -20, 40, 40);
                } else if (obj.type === 'boss') {
                    // Boss: Massive armored cube with pulsing core
                    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 25;
                    ctx.fillStyle = '#450a0a'; ctx.fillRect(-40, -40, 80, 80);
                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 5; ctx.strokeRect(-40, -40, 80, 80);
                    // Core
                    const pulse = (Math.sin(Date.now() * 0.005) + 1) / 2;
                    ctx.fillStyle = `rgba(239, 68, 68, ${0.3 + pulse * 0.7})`;
                    ctx.fillRect(-20, -20, 40, 40);
                } else {
                    ctx.fillStyle = '#22d3ee'; ctx.fillRect(-10, -10, 20, 20);
                }
                ctx.restore();

                // HP Bar
                const barY = obj.type === 'elite' ? ry - 35 : ry - 28;
                ctx.fillStyle = '#000'; ctx.fillRect(rx - 16, barY, 32, 5);
                ctx.fillStyle = obj.type === 'elite' ? '#ea580c' : '#b91c1c';
                ctx.fillRect(rx - 15, barY + 0.5, (obj.hp / obj.maxHp) * 30, 4);

                // Status Icons
                if (obj.statuses) {
                    let sX = rx - 12;
                    const sY = barY - 12;
                    Object.entries(obj.statuses).forEach(([type, s]) => {
                        if (s.duration > 0) {
                            ctx.font = '12px serif';
                            const icon = type === 'burn' ? '🔥' : type === 'poison' ? '🤮' : type === 'slow' ? '❄️' : type === 'stun' ? '💫' : '';
                            ctx.fillText(icon, sX, sY);
                            sX += 14;
                        }
                    });
                }
            }
        });

        // Projectiles — ADVANCED FX
        projectiles.forEach(p => {
            const px = p.x + offsetX;
            const py = p.y + offsetY;

            ctx.save();

            // Trail
            if (p.trail) {
                ctx.globalAlpha = 0.25;
                for (let i = 1; i <= 4; i++) {
                    ctx.beginPath();
                    ctx.arc(
                        px - p.vx * i * 2,
                        py - p.vy * i * 2,
                        (p.big ? 8 : 4) - i * 0.7,
                        0,
                        Math.PI * 2
                    );
                    ctx.fillStyle = p.color || '#ffd700';
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // Rotate based on movement (atan2 expects y, x)
            const angle = Math.atan2(p.vy, p.vx);
            ctx.translate(px, py);
            ctx.rotate(angle);

            // Draw core
            ctx.shadowColor = p.color || '#ffd700';
            ctx.shadowBlur = 10;

            if (p.type === 'boomerang') {
                ctx.strokeStyle = p.color || '#ffd700';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 1.5);
                ctx.stroke();
            } else if (p.type === 'chain') {
                ctx.fillStyle = '#60a5fa';
                ctx.fillRect(-4, -4, 8, 8);
            } else if (p.type === 'curve') {
                ctx.fillStyle = p.color || '#a855f7';
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = p.color || '#ffd700';
                ctx.beginPath();
                ctx.arc(0, 0, p.big ? 8 : 4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            ctx.shadowBlur = 0;
        });

        // Wave Countdown UI
        // We use the timer property if available on any projectile or explicit data
        const timerObj = entities.find(e => e.type === 'wave_timer');
        const timer = timerObj ? timerObj.value : 0;

        if (timer > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(canvas.width / 2 - 120, 20, 240, 40);
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
            ctx.strokeRect(canvas.width / 2 - 120, 20, 240, 40);

            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "VT323"'; ctx.textAlign = 'center';
            ctx.fillText(`PRÓXIMA ONDA: ${Math.ceil(timer)}s`, canvas.width / 2, 47);
        }

        if (attackEffect) {
            ctx.save(); ctx.translate(attackEffect.x + offsetX, attackEffect.y + offsetY);

            // Fallback Animation (Simple slash/blast)
            ctx.rotate(attackEffect.angle);
            const gradient = ctx.createLinearGradient(0, 0, 60, 0);
            gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, 50, -0.8, 0.8); ctx.arc(0, 0, 30, 0.8, -0.8, true); ctx.fill();

            ctx.restore();
        }

        damageNumbers.forEach(d => {
            const life = d.anim / 60; // 0 to 1
            const alpha = life > 0.7 ? 1 - (life - 0.7) * 3.3 : 1; // Fade out in last 30%
            const lift = d.anim * 1.5; // Rise speed

            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.translate(d.x + offsetX, d.y + offsetY - lift);

            // Pop effect for first 10 frames
            if (d.anim < 10) {
                const scale = 1 + Math.sin(d.anim * 0.15) * 0.5;
                ctx.scale(scale, scale);
            }

            // Outline logic based on color (Red for crit/high dmg, White for normal)
            const isCrit = typeof d.value === 'string' || d.value > 100;
            ctx.fillStyle = d.color || '#fff';
            ctx.font = isCrit ? 'bold 24px "VT323", Arial' : 'bold 20px "VT323", Arial';
            ctx.textAlign = 'center';

            // Heavy stroke for visibility (Ragnarok style)
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000';
            ctx.strokeText(d.value, 0, 0);
            ctx.fillText(d.value, 0, 0);

            ctx.restore();
        });

        // Base Logic Box (The Main Hub)
        const bx = 50 * TILE_SIZE + offsetX; const by = 92 * TILE_SIZE + offsetY;
        ctx.fillStyle = '#0b1a0b'; // Dark Green
        ctx.fillRect(bx - 40, by - 40, 80, 80);
        ctx.strokeStyle = '#ffd700'; // Gold
        ctx.lineWidth = 4; ctx.strokeRect(bx - 40, by - 40, 80, 80);
        ctx.fillStyle = '#ffd700'; ctx.font = '20px "VT323"'; ctx.textAlign = 'center';
        ctx.fillText("BASE REBELDE", bx, by - 50);
    }
}
