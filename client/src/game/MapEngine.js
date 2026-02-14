/**
 * Defense of the Bar - Map Engine v3 (Highly Detailed Cartoon Champions)
 * Top-down 2D with Grid-based collision and Squash & Stretch animations
 */

export const TILE_SIZE = 32;
export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;

export const TILE_TYPES = {
    GRASS: 0,
    DIRT_PATH: 1,
    WATER: 2,
    STONE: 3,
    BAR_WOOD: 4,
    WALL_BUSH: 5,
};

const CHAMPION_SKINS = {
    jaca: (ctx, x, y, anim, color, angle) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
        const isBack = dir === 6 || dir === 5 || dir === 7;
        const isRight = dir === 7 || dir === 0 || dir === 1;
        const isLeft = dir >= 3 && dir <= 5;

        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        // CROCODILE BODY - dark green with scales
        ctx.fillStyle = '#166534';
        ctx.strokeStyle = '#052e16'; ctx.lineWidth = 5;

        // Main body (elongated like a real crocodile)
        ctx.beginPath(); ctx.ellipse(x, y, 22, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Scale details
        ctx.strokeStyle = '#052e16'; ctx.lineWidth = 2;
        for (let i = -10; i < 15; i += 8) {
            ctx.beginPath(); ctx.arc(x + i, y, 4, 0, Math.PI * 2); ctx.stroke();
        }

        // Long snout
        const snoutX = isLeft ? -28 : (isRight ? 28 : 0);
        const snoutY = isBack ? -5 : 5;
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + snoutX, y + snoutY - 4);
        ctx.lineTo(x + snoutX, y + snoutY + 4);
        ctx.lineTo(x, y + 8);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Nostrilsctx.fillStyle = '#000';
        if (!isBack) {
            ctx.beginPath(); ctx.arc(x + snoutX - 4, y + snoutY - 3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + snoutX - 4, y + snoutY + 3, 2, 0, Math.PI * 2); ctx.fill();
        }

        // Eyes
        if (!isBack) {
            ctx.fillStyle = '#fff';
            const ex = isRight ? 15 : (isLeft ? -15 : 0);
            ctx.beginPath(); ctx.arc(x + ex - 6, y - 8, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(x + ex + 6, y - 8, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(x + ex - 5, y - 8, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + ex + 5, y - 8, 3, 0, Math.PI * 2); ctx.fill();
        }

        // Massive Tail - zigzag pattern
        ctx.fillStyle = '#064e3b'; ctx.lineWidth = 5;
        const tS = Math.sin(anim * 1.5) * 10;
        const tailDir = isLeft ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(x - tailDir * 15, y + 10);
        ctx.quadraticCurveTo(x - tailDir * 35, y + 15 + tS, x - tailDir * 25, y + 25);
        ctx.lineTo(x - tailDir * 20, y + 22);
        ctx.lineTo(x - tailDir * 15, y + 10);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Tail spikes
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#15803d';
            const spikeX = x - tailDir * (18 + i * 6);
            const spikeY = y + 10 + i * 4 + Math.sin(anim + i) * 3;
            ctx.beginPath();
            ctx.moveTo(spikeX, spikeY);
            ctx.lineTo(spikeX - tailDir * 3, spikeY - 8);
            ctx.lineTo(spikeX + tailDir * 2, spikeY);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        }
    },
    djox: (ctx, x, y, anim, color, angle) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
        const isBack = dir === 6 || dir === 5 || dir === 7;
        const isRight = dir === 7 || dir === 0 || dir === 1;
        const isLeft = dir >= 3 && dir <= 5;

        ctx.lineJoin = 'round'; ctx.lineWidth = 5;
        ctx.fillStyle = '#64748b'; // Shark gray
        ctx.strokeStyle = '#0f172a';

        // SHARK BODY - sleek torpedo shape
        ctx.beginPath();
        ctx.ellipse(x, y, 28, 18, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Dorsal fin (top)
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 18);
        ctx.lineTo(x, y - 35);
        ctx.lineTo(x + 5, y - 18);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Side fins (pectoral)
        const finX = isRight ? 1 : (isLeft ? -1 : 0);
        ctx.beginPath();
        ctx.ellipse(x - 20 * finX, y + 10, 18, 8, finX * Math.PI / 6, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Tail fin (caudal)
        const tailOff = isBack ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(x + tailOff * 22, y);
        ctx.lineTo(x + tailOff * 35, y - 12);
        ctx.lineTo(x + tailOff * 38, y);
        ctx.lineTo(x + tailOff * 35, y + 12);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Gills (side stripes)
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 10, y + i * 5 - 4);
            ctx.lineTo(x - 20, y + i * 5);
            ctx.stroke();
        }

        // Shark mouth/teeth
        if (!isBack) {
            ctx.fillStyle = '#0f172a';
            const mouthX = isRight ? 20 : (isLeft ? -20 : 0);
            ctx.beginPath(); ctx.arc(x + mouthX, y + 5, 8, 0.2 * Math.PI, 0.8 * Math.PI); ctx.fill();
            // Teeth
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(x + mouthX - 6 + i * 3, y + 5);
                ctx.lineTo(x + mouthX - 5 + i * 3, y + 10);
                ctx.lineTo(x + mouthX - 4 + i * 3, y + 5);
                ctx.closePath(); ctx.fill();
            }
        }

        // Scary red eyes
        if (!isBack) {
            ctx.fillStyle = '#fca5a5';
            const ex = isRight ? 18 : (isLeft ? -18 : 0);
            ctx.beginPath(); ctx.arc(x + ex, y - 8, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath(); ctx.arc(x + ex, y - 8, 4, 0, Math.PI * 2); ctx.fill();
        }

        // GIGANTIC ANCHOR
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 7;
        ctx.fillStyle = '#78350f';
        const aY = Math.sin(anim * 1.2) * 12;
        const aX = isRight ? 30 : (isLeft ? -30 : 15);

        // Anchor chain
        ctx.beginPath(); ctx.moveTo(x + aX, y - 15); ctx.lineTo(x + aX, y + 30 + aY); ctx.stroke();

        // Anchor head
        ctx.beginPath();
        ctx.arc(x + aX, y + 35 + aY, 10, 0, Math.PI);
        ctx.stroke();
        ctx.fillRect(x + aX - 15, y + 32 + aY, 30, 6);
        ctx.strokeRect(x + aX - 15, y + 32 + aY, 30, 6);
    },
    brunao: (ctx, x, y, anim, color, angle) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
        const isBack = dir === 6 || dir === 5 || dir === 7;

        ctx.lineWidth = 5; ctx.strokeStyle = '#831843';
        ctx.fillStyle = '#db2777';

        // ROUND ARMORED BODY
        ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Armor plates
        ctx.strokeStyle = '#9f1239'; ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = x + Math.cos(angle) * 18;
            const y1 = y + Math.sin(angle) * 18;
            const x2 = x + Math.cos(angle) * 24;
            const y2 = y + Math.sin(angle) * 24;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }

        // Face with helmet
        if (!isBack) {
            // Eyes under visor
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(x - 8, y - 2, 7, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 8, y - 2, 7, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#831843'; ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(x - 7, y - 2, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 7, y - 2, 4, 0, Math.PI * 2); ctx.fill();

            // Nose guard
            ctx.fillStyle = '#ec4899';
            ctx.fillRect(x - 2, y + 4, 4, 10);
        }

        // MASSIVE GOLDEN SHIELD
        ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#92400e'; ctx.lineWidth = 5;
        const sX = (dir >= 3 && dir <= 5) ? -30 : 30;
        const sOff = isBack ? -8 : 8;

        // Shield body
        ctx.beginPath();
        ctx.roundRect(x + sX - 10, y - 20 + sOff, 20, 40, 6);
        ctx.fill(); ctx.stroke();

        // Shield emblem (cross)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x + sX - 2, y - 15 + sOff, 4, 30);
        ctx.fillRect(x + sX - 8, y - 2 + sOff, 16, 4);

        // Shield studs
        ctx.fillStyle = '#78350f';
        [-12, 0, 12].forEach(yOff => {
            ctx.beginPath(); ctx.arc(x + sX, y + yOff + sOff, 3, 0, Math.PI * 2); ctx.fill();
        });
    },
    jubarbie: (ctx, x, y, anim, color, angle) => {
        ctx.lineWidth = 6; ctx.strokeStyle = '#1e3a8a';
        ctx.fillStyle = '#3b82f6';

        // MASSIVE WHALE BODY
        ctx.beginPath(); ctx.ellipse(x, y, 40, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Whale belly (lighter)
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath(); ctx.ellipse(x, y + 8, 30, 18, 0, 0, Math.PI * 2); ctx.fill();

        // Flippers
        ctx.fillStyle = '#2563eb'; ctx.strokeStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.ellipse(x - 30, y + 12, 15, 8, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x + 30, y + 12, 15, 8, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Tail fluke
        ctx.fillStyle = '#3b82f6';
        const tailWave = Math.sin(anim * 2) * 5;
        ctx.beginPath();
        ctx.moveTo(x, y + 25);
        ctx.lineTo(x - 20, y + 38 + tailWave);
        ctx.lineTo(x, y + 32);
        ctx.lineTo(x + 20, y + 38 - tailWave);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Water spout
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y - 28);
        ctx.lineTo(x - 3, y - 40);
        ctx.lineTo(x + 3, y - 40);
        ctx.stroke();

        // Big Derpy Eyes
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x - 12, y - 5, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 12, y - 5, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x - 10, y - 4, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 10, y - 4, 5, 0, Math.PI * 2); ctx.fill();

        // Happy mouth
        ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y + 8, 15, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
    },
    shiryu: (ctx, x, y, anim, color, angle) => {
        // DRAGON ANCESTRAL
        ctx.lineWidth = 5; ctx.strokeStyle = '#064e3b';
        ctx.fillStyle = '#065f46';

        // Dragon Body (serpentine)
        ctx.beginPath();
        const wave = Math.sin(anim * 2) * 10;
        ctx.ellipse(x, y, 22, 16 + wave / 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Glowing Core
        ctx.shadowBlur = 15; ctx.shadowColor = '#34d399';
        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath(); ctx.arc(x, y - 5, 8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Dragon Horns
        ctx.fillStyle = '#064e3b';
        ctx.beginPath(); ctx.moveTo(x - 5, y - 15); ctx.lineTo(x - 12, y - 25); ctx.lineTo(x - 2, y - 15); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 5, y - 15); ctx.lineTo(x + 12, y - 25); ctx.lineTo(x + 2, y - 15); ctx.fill();

        // Spirit Orbs
        for (let i = 0; i < 3; i++) {
            const ox = x + Math.cos(anim + i * 2) * 30;
            const oy = y + Math.sin(anim + i * 2) * 30;
            ctx.fillStyle = '#34d399';
            ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
        }
    },
    charles: (ctx, x, y, anim, color, angle) => {
        // J. CHARLES - BATERISTA
        ctx.lineWidth = 5; ctx.strokeStyle = '#0f172a';
        ctx.fillStyle = '#475569';

        // Body (Leather Jacket)
        ctx.beginPath(); ctx.roundRect(x - 16, y - 14, 32, 28, 6); ctx.fill(); ctx.stroke();

        // Sunglasses
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 12, y - 8, 24, 6);

        // Baquetas Energizadas
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4;
        const bY = Math.sin(anim * 10) * 15;
        ctx.beginPath(); ctx.moveTo(x - 25, y); ctx.lineTo(x - 35, y - 10 + bY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 25, y); ctx.lineTo(x + 35, y - 10 - bY); ctx.stroke();

        // Floating Drums
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.ellipse(x, y + 30, 25, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    },
    kleyiton: (ctx, x, y, anim, color, angle) => {
        // DESIGNER DAS ENGRENAGENS
        ctx.lineWidth = 5; ctx.strokeStyle = '#431407';
        ctx.fillStyle = '#c084fc'; // Tech Purple/Hologram

        ctx.beginPath(); ctx.roundRect(x - 18, y - 18, 36, 36, 4); ctx.fill(); ctx.stroke();

        // Holographic Mochila
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(x - 12, y + 18, 24, 10);

        // Projected Icons
        const float = Math.sin(anim * 3) * 10;
        ctx.font = '12px Courier';
        ctx.fillText('{}', x - 25, y - 25 + float);
        ctx.fillText('</>', x + 15, y - 20 - float);
        ctx.globalAlpha = 1.0;
    },
    gusto: (ctx, x, y, anim, color, angle) => {
        // ALQUIMISTA DA TAVERNA
        ctx.lineWidth = 5; ctx.strokeStyle = '#064e3b';
        ctx.fillStyle = '#fff'; // White Lab Coat

        ctx.beginPath(); ctx.roundRect(x - 16, y - 18, 32, 36, 10); ctx.fill(); ctx.stroke();

        // Green Apron
        ctx.fillStyle = '#059669';
        ctx.fillRect(x - 10, y, 20, 18);

        // Chemical Backpack with Vapor
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x - 12, y + 18, 24, 10);
        ctx.shadowBlur = 10; ctx.shadowColor = '#34d399';
        ctx.beginPath(); ctx.arc(x + 10, y + 25, 8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    },
    milan: (ctx, x, y, anim, color, angle) => {
        // CARTISTA FANTASMA
        ctx.lineWidth = 5; ctx.strokeStyle = '#4c1d95';
        ctx.fillStyle = '#a78bfa';

        ctx.beginPath(); ctx.ellipse(x, y, 20, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Poker Hat
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(x - 15, y - 35, 30, 10);
        ctx.fillRect(x - 20, y - 25, 40, 4);

        // Floating Cards
        for (let i = 0; i < 4; i++) {
            const cx = x + Math.cos(anim * 2 + i * 1.5) * 35;
            const cy = y + Math.sin(anim * 2 + i * 1.5) * 35;
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 5, cy - 8, 10, 16);
            ctx.strokeRect(cx - 5, cy - 8, 10, 16);
        }
    },
    enzo: (ctx, x, y, anim, color, angle) => {
        // ASSASSINO ELÉTRICO
        ctx.lineWidth = 5; ctx.strokeStyle = '#1e3a8a';
        ctx.fillStyle = '#3b82f6';

        ctx.beginPath(); ctx.moveTo(x - 15, y + 20); ctx.lineTo(x, y - 25); ctx.lineTo(x + 15, y + 20); ctx.closePath(); ctx.fill(); ctx.stroke();

        // Electric Guitar
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(x - 25, y - 5, 50, 8);

        // Electricity
        ctx.shadowBlur = 15; ctx.shadowColor = '#60a5fa';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60); ctx.stroke();
        }
        ctx.shadowBlur = 0;
    },
    mayron: (ctx, x, y, anim, color, angle) => {
        // SENHOR DOS PORTOS
        ctx.lineWidth = 5; ctx.strokeStyle = '#064e3b';
        ctx.fillStyle = '#0d9488';

        ctx.beginPath(); ctx.roundRect(x - 18, y - 20, 36, 40, 4); ctx.fill(); ctx.stroke();

        // Port Chains
        ctx.strokeStyle = '#94a3b8';
        const shift = Math.sin(anim * 4) * 10;
        ctx.beginPath(); ctx.moveTo(x - 25 + shift, y - 25); ctx.lineTo(x - 25 + shift, y + 35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 25 - shift, y - 25); ctx.lineTo(x + 25 - shift, y + 35); ctx.stroke();
    },
    klebao: (ctx, x, y, anim, color, angle) => {
        // THE LEGEND: KLEBÃO
        ctx.lineWidth = 5; ctx.strokeStyle = '#000';

        // Jeans (Blue)
        ctx.fillStyle = '#1e40af';
        ctx.fillRect(x - 14, y, 28, 20);

        // White Shirt
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 15, y - 20, 30, 22);
        ctx.strokeRect(x - 15, y - 20, 30, 22);

        // Strong Arms
        ctx.fillStyle = '#fdbaf8'; // Skin tone
        ctx.fillRect(x - 25, y - 15, 10, 15);
        ctx.fillRect(x + 15, y - 15, 10, 15);

        // THE LEGENDARY CHINELO BRANCO
        ctx.save();
        ctx.translate(x + 20, y + 5);
        ctx.rotate(Math.sin(anim * 5) * 0.5);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Straps
        ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(0, 5); ctx.lineTo(4, -5); ctx.stroke();
        ctx.restore();
    },
    default: (ctx, x, y, anim, color, angle) => {
        ctx.lineWidth = 5; ctx.strokeStyle = '#000';
        ctx.fillStyle = color || '#ffd700';
        ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Simple face
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x - 6, y - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 6, y - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + 2, 8, 0, Math.PI);
        ctx.stroke();
    }
};

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
                            grid[ty][tx] = TILE_TYPES.DIRT_PATH;
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
                grid[ty][x] = TILE_TYPES.WATER;
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
            grid[y][x] = TILE_TYPES.BAR_WOOD;
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
            grid[ry][rx] = TILE_TYPES.WALL_BUSH;
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
            [TILE_TYPES.GRASS]: '#2d5a27',
            [TILE_TYPES.DIRT_PATH]: '#a67c52',
            [TILE_TYPES.WATER]: '#1b4f72',
            [TILE_TYPES.STONE]: '#5d6d7e',
            [TILE_TYPES.BAR_WOOD]: '#7e5109',
            [TILE_TYPES.WALL_BUSH]: '#1e3a1a',
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
            ctx.fillStyle = m.type === 'orc' ? '#991b1b' : '#166534';
            ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#ef4444'; ctx.fillRect(mx - 15, my - 22, (m.hp / m.maxHp) * 30, 4);
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
