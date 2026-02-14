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
    drawSailor: (ctx, x, y, anim, color, angle, gearType, assets = null) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;

        // If JACA and assets are provided, use custom spritesheet
        if (gearType === 'jaca' && assets?.sprite?.complete) {
            const frame = Math.floor(anim * 3) % 3; // Slower transition (3 frames per cycle)
            const spriteSize = 100; // Assuming 100x100 or relative to image

            // Map 8-way dir to 4-way rows (0: Up/Back, 1: Down/Front, 2: Left, 3: Right)
            // 0:E, 1:SE, 2:S, 3:SW, 4:W, 5:NW, 6:N, 7:NE (Approx)
            let row = 1; // S
            if (dir === 6 || dir === 5 || dir === 7) row = 0; // N
            else if (dir === 4 || dir === 3) row = 2; // W
            else if (dir === 0 || dir === 1) row = 3; // E

            ctx.save();
            ctx.translate(x, y);
            // Draw shadow first
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(0, 15, 20, 8, 0, 0, Math.PI * 2); ctx.fill();

            // Slicing Jaca Sprite - Scaled down for better fit
            const sw = assets.sprite.width / 3;
            const sh = assets.sprite.height / 4;
            const scale = 0.6; // Scale down 40%
            ctx.drawImage(
                assets.sprite,
                frame * sw, row * sh, sw, sh,
                -(sw * scale) / 2, -(sh * scale) + 10, sw * scale, sh * scale
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

    jaca: (ctx, x, y, anim, color, angle, assets) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'jaca', assets),
    djox: (ctx, x, y, anim, color, angle, assets) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'djox', assets),
    klebao: (ctx, x, y, anim, color, angle, assets) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'klebao', assets),
    shiryu: (ctx, x, y, anim, color, angle, assets) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, null, assets);
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = '#059669'; ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(0, -10, 35, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    },
    charles: (ctx, x, y, anim, color, angle, assets) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, null, assets);
        ctx.fillStyle = '#451a03'; // Wooden Drum
        ctx.fillRect(x + 18, y - 5, 12, 18);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(x + 18, y - 5, 12, 3);
    },
    default: (ctx, x, y, anim, color, angle, assets) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, null, assets)
};

CHAMPION_SKINS.shiryusuyama = CHAMPION_SKINS.shiryu;
CHAMPION_SKINS.rafarofa = CHAMPION_SKINS.charles;

export const generateMap = () => {
    const grid = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(TILE_TYPES.GRASS));
    const collisions = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(false));

    const drawPath = (x1, y1, x2, y2, width = 6) => {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
                for (let wy = -width; wy <= width; wy++) {
                    for (let wx = -width; wx <= width; wx++) {
                        const ty = y + wy;
                        const tx = x + wx;
                        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
                            grid[ty][tx] = TILE_TYPES.COBBLESTONE;
                        }
                    }
                }
            }
        }
    };

    for (let i = 0; i < MAP_WIDTH; i++) {
        const y = i;
        const x = MAP_WIDTH - 1 - i;
        for (let w = -4; w <= 4; w++) {
            const ty = y + w;
            if (ty >= 0 && ty < MAP_HEIGHT) {
                grid[ty][x] = TILE_TYPES.MURKY_WATER;
                collisions[ty][x] = true;
            }
        }
    }

    drawPath(10, 10, 90, 10);
    drawPath(90, 10, 90, 90);
    drawPath(10, 10, 10, 90);
    drawPath(10, 90, 90, 90);
    drawPath(10, 10, 90, 90);

    for (let y = 5; y < 15; y++) {
        for (let x = 5; x < 15; x++) {
            grid[y][x] = TILE_TYPES.FORT_WOOD;
        }
    }
    for (let y = 85; y < 95; y++) {
        for (let x = 85; x < 95; x++) {
            grid[y][x] = TILE_TYPES.STONE;
        }
    }

    for (let i = 0; i < 200; i++) {
        const rx = Math.floor(Math.random() * MAP_WIDTH);
        const ry = Math.floor(Math.random() * MAP_HEIGHT);
        if (grid[ry][rx] === TILE_TYPES.GRASS) {
            grid[ry][rx] = TILE_TYPES.CARGO_CRATE;
            collisions[ry][rx] = true;
        }
    }

    return { grid, collisions };
};

export class MapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapData = generateMap();
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

        for (let y = Math.max(0, startY); y < Math.min(MAP_HEIGHT, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(MAP_WIDTH, endX); x++) {
                const tileType = this.mapData.grid[y][x];
                const screenX = Math.floor(x * TILE_SIZE + offsetX);
                const screenY = Math.floor(y * TILE_SIZE + offsetY);

                // Base Color
                ctx.fillStyle = this.colors[tileType];
                ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

                // Zelda Textures (Enhanced visibility)
                if (tileType === TILE_TYPES.COBBLESTONE) {
                    ctx.fillStyle = 'rgba(255,255,255,0.08)';
                    ctx.fillRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
                    ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                } else if (tileType === TILE_TYPES.GRASS) {
                    ctx.fillStyle = '#1e3a1a';
                    const seed = (x * 13 + y * 7) % 5;
                    if (seed > 2) ctx.fillRect(screenX + 10, screenY + 10, 2, 4);
                    if (seed > 3) ctx.fillRect(screenX + 20, screenY + 18, 2, 4);
                } else if (tileType === TILE_TYPES.CARGO_CRATE) {
                    // Make it VERY visible
                    ctx.fillStyle = '#92400e'; ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#431407'; ctx.lineWidth = 4;
                    ctx.strokeRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.beginPath();
                    ctx.moveTo(screenX, screenY); ctx.lineTo(screenX + TILE_SIZE, screenY + TILE_SIZE);
                    ctx.moveTo(screenX + TILE_SIZE, screenY); ctx.lineTo(screenX, screenY + TILE_SIZE);
                    ctx.stroke();
                } else if (tileType === TILE_TYPES.STONE_WALL) {
                    ctx.fillStyle = '#64748b'; ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
                    ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    // Brick pattern
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(screenX, screenY + 8, 16, 2);
                    ctx.fillRect(screenX + 16, screenY + 16, 16, 2);
                } else if (tileType === TILE_TYPES.MURKY_WATER) {
                    // Water ripples
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.beginPath();
                    const wTimer = Date.now() * 0.002;
                    const wx = screenX + (x * 7 + y * 3) % 20;
                    const wy = screenY + (x * 3 + y * 11) % 20;
                    ctx.arc(wx + 5, wy + 5, 2 + Math.sin(wTimer) * 2, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }

        entities.forEach(entity => {
            const ex = Math.floor(entity.x + offsetX);
            const ey = Math.floor(entity.y + offsetY);

            let bobY = 0;
            let scaleX = 1;
            let scaleY = 1;

            if (entity.walkTimer) {
                bobY = Math.abs(Math.sin(entity.walkTimer * 2)) * -12;
                const s = Math.sin(entity.walkTimer * 2);
                scaleX = 1 - s * 0.15;
                scaleY = 1 + s * 0.15;
            }

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.ellipse(ex, ey + 15, 12, 6, 0, 0, Math.PI * 2); ctx.fill();

            ctx.save();
            ctx.translate(ex, ey + bobY);
            ctx.scale(scaleX, scaleY);
            const skin = CHAMPION_SKINS[entity.championId] || CHAMPION_SKINS.default;
            skin(ctx, 0, 0, entity.walkTimer || 0, entity.color, entity.angle || 0, this.jacaAssets);
            ctx.restore();

            const isMe = entity.id === camera.followId;
            if (!isMe || settings.showMyName) {
                ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
                ctx.fillText(entity.name, ex, ey - 35 + bobY);

                // Champion Class Name
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.font = 'italic 10px Arial';
                ctx.fillText(entity.championId?.toUpperCase() || '', ex, ey - 22 + bobY);
            }

            ctx.fillStyle = '#333'; ctx.fillRect(ex - 15, ey - 48 + bobY, 30, 4);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(ex - 15, ey - 48 + bobY, (entity.hp / entity.maxHp) * 30, 4);
        });

        monsters.forEach(m => {
            const mx = m.x + offsetX;
            const my = m.y + offsetY;

            // SEA MOBS
            // SEA MOBS (Pixel Shaded)
            ctx.save();
            ctx.translate(mx, my);

            // Hit Blink Effect (Zelda style)
            if (m.blink > 0) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(-20, -15, 40, 30);
                m.blink--;
            } else {
                if (m.type === 'orc') {
                    // Giant Crab
                    ctx.fillStyle = '#b91c1c'; ctx.fillRect(-18, -12, 36, 24);
                    ctx.fillStyle = '#ef4444'; ctx.fillRect(-18, -12, 36, 4); // Highlight
                    ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-18, 10, 36, 2); // Shadow
                    // Claws
                    ctx.fillStyle = '#b91c1c';
                    const clawBob = Math.sin(Date.now() * 0.01) * 5;
                    ctx.fillRect(-25, -10 + clawBob, 10, 10);
                    ctx.fillRect(15, -10 - clawBob, 10, 10);
                } else {
                    // Jellyfish (Pixelized)
                    ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
                    ctx.fillRect(-12, -12, 24, 16);
                    ctx.fillStyle = '#fff'; ctx.fillRect(-12, -12, 24, 2); // Top glow
                    // Tentacles
                    ctx.fillStyle = '#22d3ee';
                    const tWave = Math.sin(Date.now() * 0.01) * 3;
                    for (let i = 0; i < 3; i++) {
                        ctx.fillRect(-8 + i * 8 + tWave, 4, 2, 12);
                    }
                }
            }
            ctx.restore();
            ctx.fillStyle = '#333'; ctx.fillRect(mx - 15, my - 28, 30, 4);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(mx - 15, my - 28, (m.hp / m.maxHp) * 30, 4);
        });

        projectiles.forEach(p => {
            ctx.fillStyle = p.color || '#ffd700';
            ctx.beginPath(); ctx.arc(p.x + offsetX, p.y + offsetY, p.big ? 8 : 4, 0, Math.PI * 2); ctx.fill();
            if (p.big) { ctx.strokeStyle = '#fff'; ctx.stroke(); }
        });

        if (attackEffect) {
            // Custom Jaca Attack
            if (attackEffect.type === 'jaca' && this.jacaAssets?.attack?.complete) {
                const assets = this.jacaAssets.attack;
                const sw = assets.width / 3;
                const sh = assets.height / 5;
                const frame = Math.floor((Date.now() - attackEffect.time) / 50) % 3;

                // Map angle to 5 attack rows
                const dir = (Math.round(attackEffect.angle / (Math.PI / 4)) + 8) % 8;
                let row = 0; // Down
                if (dir === 6) row = 2; // Up
                else if (dir === 4) row = 1; // Left
                else if (dir === 0) row = 3; // Right
                else if (dir === 1 || dir === 7) row = 4; // Diagonal?

                ctx.save();
                ctx.translate(attackEffect.x + offsetX, attackEffect.y + offsetY);
                ctx.drawImage(assets, frame * sw, row * sh, sw, sh, -sw / 2, -sh / 2, sw, sh);
                ctx.restore();
                return;
            }

            ctx.save();
            ctx.translate(attackEffect.x + offsetX, attackEffect.y + offsetY);
            ctx.rotate(attackEffect.angle);

            // Sweeping Zelda Sword Arc
            const gradient = ctx.createLinearGradient(0, 0, 60, 0);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 50, -0.8, 0.8);
            ctx.arc(0, 0, 30, 0.8, -0.8, true);
            ctx.fill();

            ctx.restore();
        }

        damageNumbers.forEach(d => {
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 20px VT323'; ctx.textAlign = 'center';
            ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
            ctx.fillText(d.value, d.x + offsetX, d.y + offsetY - d.anim);
            ctx.shadowBlur = 0;
        });

        const bx = 320 + offsetX; const by = 320 + offsetY;
        ctx.fillStyle = '#7e5109'; ctx.fillRect(bx - 32, by - 32, 64, 64);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx - 32, by - 32, 64, 64);
    }
}
