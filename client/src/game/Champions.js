import { TILE_SIZE } from './constants';

// Champion Stats & Configuration
export const CHAMPIONS = {
    jaca: { name: 'Jaca', color: '#15803d', hp: 100, mana: 40, basic: { range: 80, arc: 1.6, dmg: 1 }, skill: { name: 'Death Roll', cost: 15, cd: 4000 } },
    djox: { name: 'Djox', color: '#334155', hp: 140, mana: 50, basic: { range: 110, arc: 2.2, dmg: 1, kb: 30 }, skill: { name: 'Anchor Smash', cost: 20, cd: 6000 } },
    brunao: { name: 'Brunão', color: '#db2777', hp: 180, mana: 60, basic: { range: 70, arc: 1.4, dmg: 1, kb: 50 }, skill: { name: 'Guardian Aura', cost: 25, cd: 9000 } },
    jubarbie: { name: 'Jubarbie', color: '#1e3a8a', hp: 220, mana: 50, basic: { range: 130, arc: 2.6, dmg: 1 }, skill: { name: 'Heavy Splash', cost: 30, cd: 8000 } },
    shiryu: { name: 'Shiryu Suyama', color: '#064e3b', hp: 90, mana: 130, basic: { range: 250, arc: 0.6, dmg: 1, ranged: true }, skill: { name: 'Sopro Ancestral', cost: 35, cd: 6000 } },
    charles: { name: 'J. Charles', color: '#475569', hp: 80, mana: 70, basic: { range: 350, arc: 0.3, dmg: 1, ranged: true }, skill: { name: 'Bateria de Guerra', cost: 25, cd: 7000 } },
    gusto: { name: 'Gusto', color: '#78350f', hp: 150, mana: 60, basic: { range: 90, arc: 1.8, dmg: 1 }, skill: { name: 'Frasco Ácido', cost: 20, cd: 6000 } },
    kleyiton: { name: 'Kleyiton', color: '#b45309', hp: 110, mana: 90, basic: { range: 160, arc: 1.2, dmg: 1 }, skill: { name: 'Campo Geométrico', cost: 30, cd: 10000 } },
    milan: { name: 'Milan', color: '#4a044e', hp: 70, mana: 160, basic: { range: 190, arc: 2.0, dmg: 1 }, skill: { name: 'Blefe Espectral', cost: 25, cd: 5000 } },
    enzo: { name: 'Enzo', color: '#0369a1', hp: 90, mana: 50, basic: { range: 100, arc: 2.2, dmg: 1 }, skill: { name: 'Riff Elétrico', cost: 12, cd: 3000 } },
    mayron: { name: 'Mayron', color: '#0d9488', hp: 110, mana: 100, basic: { range: 170, arc: 2.4, dmg: 1 }, skill: { name: 'Tide Wave', cost: 25, cd: 6000 } },
    klebao: { name: 'Klebão', color: '#ffffff', hp: 200, mana: 100, basic: { range: 300, arc: 0.2, dmg: 1, ranged: true }, skill: { name: 'Julgamento Supremo', cost: 50, cd: 12000 } }
};

// Aliases
CHAMPIONS.shiryusuyama = CHAMPIONS.shiryu;
CHAMPIONS.rafarofa = CHAMPIONS.charles;

export const getChamp = (id) => CHAMPIONS[id] || CHAMPIONS.jaca;

// Champion Rendering Logic (Extracted from MapEngine.js)
export const CHAMPION_SKINS = {
    // Zelda: Link to the Past style drawer
    drawSailor: (ctx, x, y, anim, color, angle, gearType, assets = null, isMoving = true) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;

        // If JACA and assets are provided, use custom spritesheet
        if (gearType === 'jaca' && assets?.sprite?.complete) {
            // Idle Frame Lock: If not moving, stay on middle frame (1). If moving, cycle 0-2.
            const frame = isMoving ? (Math.floor(anim * 4) % 3) : 1;

            // Map 8-way dir to 4-way rows (0: Up/Back, 1: Down/Front, 2: Left, 3: Right)
            let row = 1; // S
            if (dir === 6 || dir === 5 || dir === 7) row = 0; // N
            else if (dir === 4 || dir === 3) row = 2; // W
            else if (dir === 0 || dir === 1) row = 3; // E

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
