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
    // Helper for nautical themed humanoids
    drawSailor: (ctx, x, y, anim, color, angle, gearType) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
        const isBack = dir === 5 || dir === 6 || dir === 7;
        const speed = anim ? 1 : 0;
        const bob = speed * Math.sin(anim * 10) * 4;
        const sway = speed * Math.cos(anim * 5) * 0.1;

        ctx.save();
        ctx.translate(x, y + bob);
        ctx.rotate(sway);

        // Legs/Boots
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-10, 10, 8, 12); ctx.fillRect(2, 10, 8, 12);

        // Torso (Striped Sailor Shirt)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.roundRect(-14, -10, 28, 22, 4); ctx.fill();
        ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2; // Blue stripes
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(-14, -6 + i * 6); ctx.lineTo(14, -6 + i * 6); ctx.stroke();
        }
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(-14, -10, 28, 22);

        // Arms
        ctx.fillStyle = '#fdbaf8'; // Skin
        const armWave = speed * Math.sin(anim * 10) * 10;
        ctx.fillRect(-22, -8 + armWave, 8, 15);
        ctx.fillRect(14, -8 - armWave, 8, 15);

        // Head
        ctx.beginPath(); ctx.arc(0, -22, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Hat (Sailor Cap)
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, -32, 10, Math.PI, 0); ctx.fill(); ctx.stroke();

        // Face
        if (!isBack) {
            ctx.fillStyle = '#000';
            const ex = (dir === 0 || dir === 4) ? 0 : (dir < 4 ? 4 : -4);
            ctx.beginPath(); ctx.arc(-5 + ex, -24, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5 + ex, -24, 2, 0, Math.PI * 2); ctx.fill();
            // Beard/Stubble for sailors
            ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, -18, 5, 0, Math.PI); ctx.stroke();
        }

        // UNIQUE GEAR
        if (gearType === 'jaca') {
            ctx.fillStyle = '#166534'; // Gator tail
            ctx.beginPath(); ctx.moveTo(-10, 5); ctx.lineTo(-25, 20); ctx.lineTo(-10, 15); ctx.fill(); ctx.stroke();
        } else if (gearType === 'djox') {
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(30, 20); ctx.stroke(); // Hook/Anchor
        } else if (gearType === 'klebao') {
            // White Flip-flop in hand
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(22, -5 - armWave, 6, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(18, -10 - armWave); ctx.lineTo(22, -5 - armWave); ctx.lineTo(26, -10 - armWave); ctx.stroke();
        }

        ctx.restore();
    },

    jaca: (ctx, x, y, anim, color, angle) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'jaca'),
    djox: (ctx, x, y, anim, color, angle) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'djox'),
    klebao: (ctx, x, y, anim, color, angle) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'klebao'),

    // Fallbacks for others with Porto theme
    brunao: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.fillStyle = '#facc15'; ctx.fillRect(x - 15, y - 15, 30, 30); // Heavy yellow coat
    },
    shiryu: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.strokeStyle = '#059669'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y - 20, 25, 0, Math.PI * 2); ctx.stroke(); // Emerald aura
    },
    charles: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(x - 25, y + 10, 50, 15); // Floating Drum
    },
    gusto: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(x - 20, y, 8, 0, Math.PI * 2); ctx.fill(); // Potion
    },
    kleyiton: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.strokeStyle = '#06b6d4'; ctx.strokeRect(x - 20, y - 30, 40, 40); // Tech visor/frame
    },
    milan: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + 15, y, 10, 14); // Cards
    },
    enzo: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(x - 20, y - 10, 40, 5); // Guitar
    },
    mayron: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.strokeStyle = '#14b8a6'; ctx.beginPath(); ctx.moveTo(x - 20, y + 20); ctx.lineTo(x + 20, y - 20); ctx.stroke(); // Chains
    },
    jubarbie: (ctx, x, y, anim, color, angle) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle);
        ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.ellipse(x, y + 10, 25, 15, 0, 0, Math.PI * 2); ctx.fill(); // Whale tail
    },
    default: (ctx, x, y, anim, color, angle) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
        const isBack = dir === 6 || dir === 5 || dir === 7;

        ctx.lineWidth = 5; ctx.strokeStyle = '#000';
        ctx.fillStyle = color || '#ffd700';

        // Body (Bobbing during walk)
        const bob = Math.sin(anim * 8) * 3;
        ctx.beginPath(); ctx.ellipse(x, y + bob, 18, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Eyes based on direction
        if (!isBack) {
            ctx.fillStyle = '#000';
            const ex = (dir === 0 || dir === 4) ? 0 : (dir < 4 ? 6 : -6);
            ctx.beginPath(); ctx.arc(x - 6 + ex, y - 4 + bob, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 6 + ex, y - 4 + bob, 3, 0, Math.PI * 2); ctx.fill();
        }
    }
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
                const screenX = x * TILE_SIZE + offsetX;
                const screenY = y * TILE_SIZE + offsetY;
                ctx.fillStyle = this.colors[tileType];
                ctx.fillRect(Math.floor(screenX), Math.floor(screenY), TILE_SIZE, TILE_SIZE);

                // Texture details
                if (tileType === TILE_TYPES.COBBLESTONE) {
                    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
                    ctx.strokeRect(Math.floor(screenX), Math.floor(screenY), TILE_SIZE, TILE_SIZE);
                } else if (tileType === TILE_TYPES.CARGO_CRATE) {
                    ctx.strokeStyle = '#431407'; ctx.lineWidth = 3;
                    ctx.strokeRect(Math.floor(screenX) + 4, Math.floor(screenY) + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    ctx.beginPath(); ctx.moveTo(screenX + 4, screenY + 4); ctx.lineTo(screenX + TILE_SIZE - 4, screenY + TILE_SIZE - 4); ctx.stroke();
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
            skin(ctx, 0, 0, entity.walkTimer || 0, entity.color, entity.angle || 0);
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
            if (m.type === 'orc') {
                // Giant Crab
                ctx.fillStyle = '#b91c1c'; ctx.lineWidth = 3; ctx.strokeStyle = '#450a0a';
                ctx.beginPath(); ctx.ellipse(mx, my, 20, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Claws
                ctx.beginPath(); ctx.arc(mx - 20, my - 10, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(mx + 20, my - 10, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            } else {
                // Jellyfish / Slime
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = '#22d3ee'; ctx.strokeStyle = '#0891b2';
                ctx.beginPath(); ctx.arc(mx, my, 16, Math.PI, 0); ctx.lineTo(mx + 16, my + 10); ctx.lineTo(mx - 16, my + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
                // Tentacles
                const wave = Math.sin(Date.now() * 0.01) * 5;
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    ctx.moveTo(mx - 10 + i * 10, my + 10);
                    ctx.lineTo(mx - 10 + i * 10 + wave, my + 25);
                }
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
            ctx.fillStyle = '#333'; ctx.fillRect(mx - 15, my - 28, 30, 4);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(mx - 15, my - 28, (m.hp / m.maxHp) * 30, 4);
        });

        projectiles.forEach(p => {
            ctx.fillStyle = p.color || '#ffd700';
            ctx.beginPath(); ctx.arc(p.x + offsetX, p.y + offsetY, p.big ? 8 : 4, 0, Math.PI * 2); ctx.fill();
            if (p.big) { ctx.strokeStyle = '#fff'; ctx.stroke(); }
        });

        if (attackEffect) {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(attackEffect.x + offsetX, attackEffect.y + offsetY, 60, attackEffect.angle - 0.5, attackEffect.angle + 0.5); ctx.stroke();
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
