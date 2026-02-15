/**
 * Defense of the Bar - Map Engine v3 (Highly Detailed Cartoon Champions)
 * Top-down 2D with Grid-based collision and Squash & Stretch animations
 */

export const TILE_SIZE = 32;
export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;

export const TILE_TYPES = {
    GRASS: 0,
    COBBLESTONE: 1,
    MURKY_WATER: 2,
    STONE_WALL: 3,
    FORT_WOOD: 4,
    CARGO_CRATE: 5,
};

const CHAMPION_SKINS = {
    // Zelda: Link to the Past style drawer
    drawSailor: (ctx, x, y, anim, color, angle, gearType, assets = null, isMoving = true) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;

        // If JACA and assets are provided, use custom spritesheet
        if (gearType === 'jaca' && assets?.sprite?.complete) {
            // Idle Frame Lock: If not moving, stay on middle frame (1). If moving, cycle 0-2.
            const frame = isMoving ? (Math.floor(anim * 4) % 3) : 1;
            const spriteSize = 100; // Assuming 100x100 or relative to image

            // Map 8-way dir to 4-way rows (0: Up/Back, 1: Down/Front, 2: Left, 3: Right)
            // 0:E, 1:SE, 2:S, 3:SW, 4:W, 5:NW, 6:N, 7:NE (Approx)
            // Improved Direction Mapping (8-way to 4-row stability)
            let row = 1; // S
            if (dir === 6 || dir === 5 || dir === 7) row = 0; // N
            else if (dir === 4 || dir === 3) row = 2; // W
            else if (dir === 0 || dir === 1) row = 3; // E

            // If the spritesheet actually has 8 rows, we could expand this here.
            // For now, we ensure stable 4-row mapping to avoid jitter.

            ctx.save();
            ctx.translate(x, y);
            // Draw shadow first
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(0, 15, 20, 8, 0, 0, Math.PI * 2); ctx.fill();

            // Slicing Jaca Sprite - Reduced scale significantly per user request
            const sw = assets.sprite.width / 3;
            const sh = assets.sprite.height / 4;
            const scale = 0.35;
            ctx.drawImage(
                assets.sprite,
                frame * sw, row * sh, sw, sh,
                -(sw * scale) / 2, -(sh * scale) + 5, sw * scale, sh * scale
            );
            ctx.restore();
            return;
        }

        const isBack = dir === 5 || dir === 6 || dir === 7;
        const isSide = dir === 2 || dir === 6;
        const walk = Math.sin(anim * 12);
        const bob = Math.abs(walk) * 2;

        ctx.save();
        ctx.translate(x, y);

        // SHADOW
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, 15, 12, 5, 0, 0, Math.PI * 2); ctx.fill();

        ctx.translate(0, -bob);

        // LEGS (Pixel Style)
        ctx.fillStyle = '#1e293b'; // Pants
        const legH = 8;
        if (anim > 0) {
            ctx.fillRect(-8, 10 + walk * 4, 6, legH);
            ctx.fillRect(2, 10 - walk * 4, 6, legH);
        } else {
            ctx.fillRect(-8, 10, 6, legH);
            ctx.fillRect(2, 10, 6, legH);
        }

        // BODY (Shaded Sailor Shirt)
        const shirtColor = '#f8fafc';
        const shadeColor = '#cbd5e1';
        ctx.fillStyle = shirtColor;
        ctx.fillRect(-12, -8, 24, 20);
        // Shading on side/bottom
        ctx.fillStyle = shadeColor;
        ctx.fillRect(8, -8, 4, 20); // Right shade
        ctx.fillRect(-12, 8, 24, 4); // Bottom shade

        // Stripes (Pixel perfect)
        ctx.fillStyle = '#1d4ed8';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(-12, -4 + i * 5, 24, 2);
        }

        // ARMS
        ctx.fillStyle = '#fdbaf8'; // Skin
        const armSwing = anim > 0 ? walk * 6 : 0;
        if (!isSide) {
            ctx.fillRect(-18, -4 + armSwing, 6, 12); // Left
            ctx.fillRect(12, -4 - armSwing, 6, 12); // Right
        } else {
            // One arm hidden or both visible depending on side
            ctx.fillRect(dir === 2 ? 8 : -14, -4 + armSwing, 6, 14);
        }

        // HEAD
        ctx.fillStyle = '#fdbaf8';
        ctx.fillRect(-10, -26, 20, 20); // Square head for pixel look
        // Cheeks/Shade
        ctx.fillStyle = '#f9a8d4';
        ctx.fillRect(-10, -12, 20, 4);

        // EYES (Link to the Past style)
        if (!isBack) {
            ctx.fillStyle = '#000';
            const eyeX = (dir === 0 || dir === 4) ? 0 : (dir < 4 ? 3 : -3);
            ctx.fillRect(-5 + eyeX, -20, 2, 4);
            ctx.fillRect(3 + eyeX, -20, 2, 4);
            // Detail: Eye white pixel
            ctx.fillStyle = '#fff';
            ctx.fillRect(-5 + eyeX, -20, 1, 1);
            ctx.fillRect(3 + eyeX, -20, 1, 1);
        }

        // HAT
        ctx.fillStyle = '#fff';
        ctx.fillRect(-12, -32, 24, 8);
        ctx.fillStyle = '#e2e8f0'; // Hat top shade
        ctx.fillRect(-12, -32, 24, 2);

        // GEAR
        ctx.lineWidth = 2;
        if (gearType === 'jaca') {
            ctx.fillStyle = '#15803d'; // Darker green
            ctx.fillRect(-22, 0, 10, 10); // Tail nub
            ctx.fillStyle = '#16a34a'; // Light green highlights
            ctx.fillRect(-22, 0, 4, 4);
        } else if (gearType === 'klebao') {
            // The Mighty White Flip-Flop
            ctx.fillStyle = '#fff';
            const fx = 16, fy = 0 - armSwing;
            ctx.fillRect(fx, fy, 8, 14);
            ctx.fillStyle = '#3b82f6'; // Blue straps
            ctx.fillRect(fx + 2, fy + 2, 4, 1);
            ctx.fillRect(fx + 3, fy + 3, 2, 4);
        }

        ctx.restore();
    },

    jaca: (ctx, x, y, anim, color, angle, assets, isMoving = true) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'jaca', assets, isMoving),
    djox: (ctx, x, y, anim, color, angle, assets, isMoving = true) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'djox', assets, isMoving),
    klebao: (ctx, x, y, anim, color, angle, assets, isMoving = true) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'klebao', assets, isMoving),
    shiryu: (ctx, x, y, anim, color, angle, assets, isMoving = true) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, null, assets, isMoving);
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = '#059669'; ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(0, -10, 35, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    },
    charles: (ctx, x, y, anim, color, angle, assets, isMoving = true) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, null, assets, isMoving);
        ctx.fillStyle = '#451a03'; // Wooden Drum
        ctx.fillRect(x + 18, y - 5, 12, 18);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(x + 18, y - 5, 12, 3);
    },
    default: (ctx, x, y, anim, color, angle, assets, isMoving = true) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, null, assets, isMoving)
};

CHAMPION_SKINS.shiryusuyama = CHAMPION_SKINS.shiryu;
CHAMPION_SKINS.rafarofa = CHAMPION_SKINS.charles;

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

export class MapRenderer {
    constructor(canvas, seed = 0) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapData = generateMap(seed);
        // LOADING SCREEN PALETTE
        this.colors = {
            [TILE_TYPES.GRASS]: '#0b1a0b',     // The Loading Screen Background (Walkable)
            [TILE_TYPES.COBBLESTONE]: '#1a2f1a', // Slightly lighter
            [TILE_TYPES.MURKY_WATER]: '#0a0f1e', // Dark Sea Blue (Abyss)
            [TILE_TYPES.STONE_WALL]: '#143411',  // Dark Green Wall
            [TILE_TYPES.FORT_WOOD]: '#2a1a05',   // Wood
            [TILE_TYPES.CARGO_CRATE]: '#78350f',
        };
    }

    draw(entities, camera, dummies = [], monsters = [], projectiles = [], damageNumbers = [], attackEffect = null, baseHp = 1000, maxBaseHp = 1000, spawnPoints = []) {
        const { ctx, canvas } = this;
        // Background: Abyss (Dark Sea Blue)
        ctx.fillStyle = '#0a0f1e';
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
                    // Retro Wall: Dark Green box with Gold Outline
                    ctx.fillStyle = '#0f220f';
                    ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);

                    ctx.strokeStyle = '#ffd700'; // GOLD OUTLINE
                    ctx.lineWidth = 1;
                    ctx.strokeRect(rx + 4, ry + 4, TILE_SIZE - 8, TILE_SIZE - 8);

                    // "Digital" connection lines
                    ctx.beginPath();
                    ctx.moveTo(rx, ry); ctx.lineTo(rx + 4, ry + 4);
                    ctx.moveTo(rx + 32, ry); ctx.lineTo(rx + 28, ry + 4);
                    ctx.moveTo(rx, ry + 32); ctx.lineTo(rx + 4, ry + 28);
                    ctx.moveTo(rx + 32, ry + 32); ctx.lineTo(rx + 28, ry + 28);
                    ctx.stroke();
                }
            } else if (obj.type === 'player') {
                ctx.save();
                ctx.translate(rx, ry);

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.beginPath(); ctx.ellipse(0, 15, 10, 5, 0, 0, Math.PI * 2); ctx.fill();

                // Draw Champion Skin
                const skin = CHAMPION_SKINS[obj.championId] || CHAMPION_SKINS.default;
                skin(ctx, 0, 0, obj.walkTimer || 0, obj.color, obj.angle || 0, this.jacaAssets, obj.isMoving);

                ctx.restore();

                // Name & Health
                const isMe = obj.id === camera.followId;
                if (!isMe || settings.showMyName) {
                    ctx.fillStyle = '#ffd700'; // Gold Text
                    ctx.font = 'bold 14px "VT323", Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(obj.name, rx, ry - 40);
                }
                // Retro Health Bar
                ctx.fillStyle = '#000'; ctx.fillRect(rx - 16, ry - 52, 32, 6);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(rx - 16, ry - 52, 32, 6);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(rx - 15, ry - 51, (obj.hp / obj.maxHp) * 30, 4);
            } else if (obj.type === 'monster') {
                ctx.save(); ctx.translate(rx, ry);
                // Monsters
                if (obj.type === 'orc') {
                    ctx.fillStyle = '#b91c1c'; ctx.fillRect(-15, -15, 30, 30); // Base Red Square
                    ctx.strokeStyle = '#fab005'; ctx.lineWidth = 2; ctx.strokeRect(-15, -15, 30, 30); // Gold Trim
                } else {
                    ctx.fillStyle = '#22d3ee'; ctx.fillRect(-10, -10, 20, 20);
                }
                ctx.restore();
                // HP
                ctx.fillStyle = '#000'; ctx.fillRect(rx - 16, ry - 28, 32, 5);
                ctx.fillStyle = '#b91c1c'; ctx.fillRect(rx - 15, ry - 27.5, (obj.hp / obj.maxHp) * 30, 3);
            }
        });

        // Projectiles
        projectiles.forEach(p => {
            ctx.fillStyle = p.color || '#ffd700';
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(p.x + offsetX, p.y + offsetY, p.big ? 8 : 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        });

        if (attackEffect) {
            ctx.save(); ctx.translate(attackEffect.x + offsetX, attackEffect.y + offsetY);
            if (attackEffect.type === 'jaca' && this.jacaAssets?.attack?.complete) {
                const assets = this.jacaAssets.attack; const sw = assets.width / 3; const sh = assets.height / 5;
                const frame = Math.floor((Date.now() - attackEffect.time) / 50) % 3;
                const dir = (Math.round(attackEffect.angle / (Math.PI / 4)) + 8) % 8;
                let row = 0; if (dir === 6) row = 2; else if (dir === 4) row = 1; else if (dir === 0) row = 3; else if (dir === 1 || dir === 7) row = 4;
                ctx.drawImage(assets, frame * sw, row * sh, sw, sh, -sw / 2, -sh / 2, sw, sh);
            } else {
                ctx.rotate(attackEffect.angle);
                const gradient = ctx.createLinearGradient(0, 0, 60, 0);
                gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, 50, -0.8, 0.8); ctx.arc(0, 0, 30, 0.8, -0.8, true); ctx.fill();
            }
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
