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
    // Simple LCG seeded random
    let s = seed;
    const rnd = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };

    // Start with WATER (everything is blocked unless carved)
    const grid = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(TILE_TYPES.MURKY_WATER));
    // Scales: 0=Walkable, 1=Dashable Barrier, 2=High Wall (Skills only), 3=Absolute Blocker
    const scales = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(3));
    // Collisions: Simple boolean (true = blocked for walking) - Kept for legacy compatibility
    const collisions = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(true));

    const drawPath = (x1, y1, x2, y2, width = 8, type = TILE_TYPES.GRASS) => {
        // Simple linear interpolation to draw a thick path
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = dist * 2;
        for (let i = 0; i <= steps; i++) {
            const px = Math.floor(x1 + (x2 - x1) * (i / steps));
            const py = Math.floor(y1 + (y2 - y1) * (i / steps));
            for (let wy = -width; wy <= width; wy++) {
                for (let wx = -width; wx <= width; wx++) {
                    const ty = py + wy;
                    const tx = px + wx;
                    if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
                        grid[ty][tx] = type;
                        scales[ty][tx] = 0; // Natural paths are level 0
                        collisions[ty][tx] = false; // Walkable
                    }
                }
            }
        }
    };

    // === FAITHFUL REPRODUCTION OF SKETCH ===
    // Top-down MOBA map with organic curved paths
    // Two spawn corridors → Y-junction → Curved loops → Base entrance

    // Helper: Bezier curve path generator
    const drawCurve = (points, width, type) => {
        const steps = 100;
        for (let t = 0; t <= steps; t++) {
            const u = t / steps;
            // Cubic Bezier interpolation
            const x = Math.pow(1 - u, 3) * points[0].x +
                3 * Math.pow(1 - u, 2) * u * points[1].x +
                3 * (1 - u) * Math.pow(u, 2) * points[2].x +
                Math.pow(u, 3) * points[3].x;
            const y = Math.pow(1 - u, 3) * points[0].y +
                3 * Math.pow(1 - u, 2) * u * points[1].y +
                3 * (1 - u) * Math.pow(u, 2) * points[2].y +
                Math.pow(u, 3) * points[3].y;
            drawPath(Math.floor(x), Math.floor(y), Math.floor(x), Math.floor(y), width, type);
        }
    };

    // LEFT SPAWN (Top-Left Corner) → Curved inward
    drawPath(15, 5, 15, 15, 5, TILE_TYPES.GRASS); // Vertical start
    drawCurve([
        { x: 15, y: 15 },
        { x: 15, y: 25 },
        { x: 20, y: 35 },
        { x: 30, y: 42 }
    ], 5, TILE_TYPES.GRASS);

    // RIGHT SPAWN (Top-Right Corner) → Curved inward  
    drawPath(85, 5, 85, 15, 5, TILE_TYPES.GRASS); // Vertical start
    drawCurve([
        { x: 85, y: 15 },
        { x: 85, y: 25 },
        { x: 80, y: 35 },
        { x: 70, y: 42 }
    ], 5, TILE_TYPES.GRASS);

    // Y-JUNCTION: Both paths meet at center
    drawPath(30, 42, 50, 48, 5, TILE_TYPES.GRASS); // Left approach
    drawPath(70, 42, 50, 48, 5, TILE_TYPES.GRASS); // Right approach

    // CENTER MERGE → Down toward loops
    drawPath(50, 48, 50, 58, 6, TILE_TYPES.GRASS);

    // LEFT LOOP (Yellow in sketch)
    drawCurve([
        { x: 50, y: 58 },
        { x: 35, y: 62 },
        { x: 25, y: 70 },
        { x: 25, y: 78 }
    ], 5, TILE_TYPES.GRASS);
    drawCurve([
        { x: 25, y: 78 },
        { x: 25, y: 82 },
        { x: 30, y: 85 },
        { x: 40, y: 85 }
    ], 5, TILE_TYPES.GRASS);

    // RIGHT LOOP (Red in sketch)
    drawCurve([
        { x: 50, y: 58 },
        { x: 65, y: 62 },
        { x: 75, y: 70 },
        { x: 75, y: 78 }
    ], 5, TILE_TYPES.GRASS);
    drawCurve([
        { x: 75, y: 78 },
        { x: 75, y: 82 },
        { x: 70, y: 85 },
        { x: 60, y: 85 }
    ], 5, TILE_TYPES.GRASS);

    // FINAL MERGE → Base entrance
    drawPath(40, 85, 50, 87, 5, TILE_TYPES.GRASS);
    drawPath(60, 85, 50, 87, 5, TILE_TYPES.GRASS);
    drawPath(50, 87, 50, 92, 8, TILE_TYPES.GRASS);

    // BASE PLATFORM (Tavern)
    drawPath(50, 92, 50, 98, 16, TILE_TYPES.FORT_WOOD);

    // Side decorative areas
    drawPath(12, 60, 12, 60, 6, TILE_TYPES.COBBLESTONE); // Left port
    drawPath(88, 60, 88, 60, 6, TILE_TYPES.COBBLESTONE); // Right port

    // DRAW STONE WALLS AROUND LAND
    // We scan the grid and place walls on any water tile adjacent to land
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
        for (let x = 1; x < MAP_WIDTH - 1; x++) {
            if (grid[y][x] === TILE_TYPES.MURKY_WATER) {
                const adjLand = [
                    grid[y - 1][x], grid[y + 1][x], grid[y][x - 1], grid[y][x + 1],
                    grid[y - 1][x - 1], grid[y - 1][x + 1], grid[y + 1][x - 1], grid[y + 1][x + 1]
                ].some(t => t !== TILE_TYPES.MURKY_WATER && t !== TILE_TYPES.STONE_WALL);

                if (adjLand) {
                    // Create Stone Wall boundary
                    grid[y][x] = TILE_TYPES.STONE_WALL;
                    scales[y][x] = 2; // Default stone wall is scale 2 (Skill only)
                    collisions[y][x] = true;
                }
            }
        }
    }

    // Assign Scale 1 to curved low barriers near base
    // This allows dashing over the "bend"
    const centerX = 50, centerY = 82, r = 13;
    for (let y = 60; y < 95; y++) {
        for (let x = 20; x < 80; x++) {
            if (grid[y][x] === TILE_TYPES.STONE_WALL) {
                const dist = Math.hypot(x - centerX, y - centerY);
                if (Math.abs(dist - r) < 3) {
                    scales[y][x] = 1; // Mark as dashable barrier
                    collisions[y][x] = true; // Still blocks walking
                }
            }
        }
    }

    // GATES: Open for monsters (Scale 0)
    const openGate = (gx, gy) => {
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                const ty = gy + dy, tx = gx + dx;
                if (grid[ty]?.[tx] === TILE_TYPES.STONE_WALL) {
                    grid[ty][tx] = TILE_TYPES.MURKY_WATER;
                    scales[ty][tx] = 0; // Monsters/Players can cross
                    collisions[ty][tx] = false;
                }
            }
        }
    };
    openGate(20, 10);
    openGate(80, 10);

    // Decorative Crates/Obstacles on paths
    for (let i = 0; i < 150; i++) {
        const rx = Math.floor(rnd() * MAP_WIDTH);
        const ry = Math.floor(rnd() * MAP_HEIGHT);
        if (grid[ry][rx] === TILE_TYPES.GRASS) {
            grid[ry][rx] = TILE_TYPES.CARGO_CRATE;
            scales[ry][rx] = 2; // Treat crate as high wall (Scale 2)
            collisions[ry][rx] = true;
        }
    }

    return { grid, scales, collisions };
};

export class MapRenderer {
    constructor(canvas, seed = 0) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapData = generateMap(seed);
        this.colors = {
            [TILE_TYPES.GRASS]: '#143411',
            [TILE_TYPES.COBBLESTONE]: '#475569',
            [TILE_TYPES.MURKY_WATER]: '#082f49',
            [TILE_TYPES.STONE_WALL]: '#1e293b',
            [TILE_TYPES.FORT_WOOD]: '#451a03',
            [TILE_TYPES.CARGO_CRATE]: '#78350f',
        };
    }

    draw(entities, camera, dummies = [], monsters = [], projectiles = [], damageNumbers = [], attackEffect = null, baseHp = 1000, maxBaseHp = 1000, spawnPoints = []) {
        const { ctx, canvas } = this;
        ctx.fillStyle = '#1e3a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const offsetX = Math.floor(canvas.width / 2 - camera.x);
        const offsetY = Math.floor(canvas.height / 2 - camera.y);
        const settings = JSON.parse(localStorage.getItem('gameSettings') || '{"showMyName": true}');

        const startX = Math.floor(-offsetX / TILE_SIZE);
        const endX = Math.floor((canvas.width - offsetX) / TILE_SIZE) + 1;
        const startY = Math.floor(-offsetY / TILE_SIZE);
        const endY = Math.floor((canvas.height - offsetY) / TILE_SIZE) + 1;

        const objectLayer = [];

        // PASS 1: Terrain Layer
        for (let y = Math.max(0, startY); y < Math.min(MAP_HEIGHT, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(MAP_WIDTH, endX); x++) {
                const tileType = this.mapData.grid[y][x];
                const screenX = Math.floor(x * TILE_SIZE + offsetX);
                const screenY = Math.floor(y * TILE_SIZE + offsetY);

                if (tileType === TILE_TYPES.CARGO_CRATE || tileType === TILE_TYPES.STONE_WALL) {
                    // Props go to Object Layer for Y-Sorting
                    objectLayer.push({
                        type: 'prop',
                        tileType: tileType,
                        x: x * TILE_SIZE + TILE_SIZE / 2,
                        y: y * TILE_SIZE + TILE_SIZE, // Base Y for sorting
                        renderX: screenX,
                        renderY: screenY
                    });
                    // Draw a floor under props so water/nothing doesn't show through
                    ctx.fillStyle = this.colors[TILE_TYPES.GRASS];
                    ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    continue;
                }

                ctx.fillStyle = this.colors[tileType];
                ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

                // Minimal terrain details
                if (tileType === TILE_TYPES.GRASS) {
                    ctx.fillStyle = '#1e3a1a';
                    const seed = (x * 13 + y * 7) % 5;
                    if (seed > 2) ctx.fillRect(screenX + 10, screenY + 10, 2, 4);
                } else if (tileType === TILE_TYPES.MURKY_WATER) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                    ctx.beginPath();
                    const wTimer = Date.now() * 0.002;
                    const wx = screenX + (x * 7 + y * 3) % 20;
                    const wy = screenY + (x * 3 + y * 11) % 20;
                    ctx.arc(wx + 5, wy + 5, 2 + Math.sin(wTimer) * 2, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }

        // Add Entities to Object Layer
        entities.forEach(e => objectLayer.push({ ...e, type: 'player', sortY: e.y }));
        monsters.forEach(m => objectLayer.push({ ...m, type: 'monster', sortY: m.y }));

        // PASS 2: Object Layer (Y-Sorted)
        objectLayer.sort((a, b) => (a.sortY || a.y) - (b.sortY || b.y));

        objectLayer.forEach(obj => {
            const rx = Math.floor((obj.type === 'prop' ? obj.renderX : obj.x + offsetX));
            const ry = Math.floor((obj.type === 'prop' ? obj.renderY : obj.y + offsetY));

            if (obj.type === 'prop') {
                if (obj.tileType === TILE_TYPES.CARGO_CRATE) {
                    ctx.fillStyle = '#92400e'; ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#431407'; ctx.lineWidth = 4;
                    ctx.strokeRect(rx + 2, ry + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.beginPath();
                    ctx.moveTo(rx, ry); ctx.lineTo(rx + TILE_SIZE, ry + TILE_SIZE);
                    ctx.moveTo(rx + TILE_SIZE, ry); ctx.lineTo(rx, ry + TILE_SIZE);
                    ctx.stroke();
                } else if (obj.tileType === TILE_TYPES.STONE_WALL) {
                    ctx.fillStyle = '#64748b'; ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
                    ctx.strokeRect(rx, ry, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(rx, ry + 8, 16, 2); ctx.fillRect(rx + 16, ry + 16, 16, 2);
                }
            } else if (obj.type === 'player') {
                let bobY = 0, sx = 1, sy = 1;
                if (obj.walkTimer) {
                    bobY = Math.abs(Math.sin(obj.walkTimer * 2)) * -12;
                    const s = Math.sin(obj.walkTimer * 2);
                    sx = 1 - s * 0.1; sy = 1 + s * 0.1;
                }
                // Soft Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.ellipse(rx, ry + 15, 12, 6, 0, 0, Math.PI * 2); ctx.fill();

                ctx.save();
                ctx.translate(rx, ry + bobY); ctx.scale(sx, sy);
                const skin = CHAMPION_SKINS[obj.championId] || CHAMPION_SKINS.default;
                skin(ctx, 0, 0, obj.walkTimer || 0, obj.color, obj.angle || 0, this.jacaAssets, obj.isMoving);
                ctx.restore();

                // PASS 3: Overlay (Projectiles, FX, HUD/UI) handled after Pass 2 loop or inside?
                // For performance, draw HUD here
                const isMe = obj.id === camera.followId;
                if (!isMe || settings.showMyName) {
                    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "VT323", Arial'; ctx.textAlign = 'center';
                    ctx.fillText(obj.name, rx, ry - 38 + bobY);

                    ctx.fillStyle = 'rgba(255,183,0,1)'; ctx.font = 'bold 10px "VT323", Arial';
                    ctx.fillText(obj.championId?.toUpperCase() || '', rx, ry - 26 + bobY);
                    ctx.shadowBlur = 0;
                }
                // Health Bar
                ctx.fillStyle = '#111'; ctx.fillRect(rx - 16, ry - 52 + bobY, 32, 6);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(rx - 15, ry - 51 + bobY, (obj.hp / obj.maxHp) * 30, 4);
            } else if (obj.type === 'monster') {
                ctx.save(); ctx.translate(rx, ry);
                if (obj.blink > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(-20, -15, 40, 30); obj.blink--; }
                else {
                    if (obj.type === 'orc') {
                        ctx.fillStyle = '#b91c1c'; ctx.fillRect(-18, -12, 36, 24);
                        ctx.fillStyle = '#ef4444'; ctx.fillRect(-18, -12, 36, 4);
                        ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-18, 10, 36, 2);
                        ctx.fillStyle = '#b91c1c'; const clawBob = Math.sin(Date.now() * 0.01) * 5;
                        ctx.fillRect(-25, -10 + clawBob, 10, 10); ctx.fillRect(15, -10 - clawBob, 10, 10);
                    } else {
                        ctx.fillStyle = 'rgba(34, 211, 238, 0.8)'; ctx.fillRect(-12, -12, 24, 16);
                        ctx.fillStyle = '#fff'; ctx.fillRect(-12, -12, 24, 2);
                        ctx.fillStyle = '#22d3ee'; const tWave = Math.sin(Date.now() * 0.01) * 3;
                        for (let i = 0; i < 3; i++) ctx.fillRect(-8 + i * 8 + tWave, 4, 2, 12);
                    }
                }
                ctx.restore();
                ctx.fillStyle = '#111'; ctx.fillRect(rx - 16, ry - 28, 32, 5);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(rx - 15, ry - 27.5, (obj.hp / obj.maxHp) * 30, 3);
            }
        });

        // PASS 3: Top Layer (Projectiles, FX)
        projectiles.forEach(p => {
            ctx.fillStyle = p.color || '#ffd700';
            ctx.beginPath(); ctx.arc(p.x + offsetX, p.y + offsetY, p.big ? 8 : 4, 0, Math.PI * 2); ctx.fill();
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

        // Base Logic Box
        const bx = 320 + offsetX; const by = 320 + offsetY;
        ctx.fillStyle = '#7e5109'; ctx.fillRect(bx - 32, by - 32, 64, 64);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx - 32, by - 32, 64, 64);
    }
}
