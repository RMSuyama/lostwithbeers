export const CHAMPION_SKINS = {
    // Zelda: Link to the Past style drawer
    drawSailor: (ctx, x, y, anim, color, angle, gearType, assets = null, isMoving = true, isAttacking = false) => {
        const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;

        // If assets are provided and the specific champion sprite is loaded, use it
        if (assets && assets[gearType]?.sprite?.complete && assets[gearType].sprite.naturalWidth > 0) {
            const sprite = assets[gearType].sprite;

            // Expected Layout: 3 Columns (Anim), 4 Rows Walk, 4 Rows Attack
            // Animation Frame:
            // Walk: 3 frames (cycle 0, 1, 2)
            // Attack: 3 frames (cycle 0, 1, 2)
            const frameCount = 3;
            const frame = isAttacking ? (Math.floor(anim * 10) % frameCount) : (isMoving ? (Math.floor(anim * 4) % frameCount) : 1);

            // Map 8-way dir to 4-way rows (0: Up/Back, 1: Down/Front, 2: Left, 3: Right)
            let row = 1; // Front (South)
            if (dir === 6 || dir === 5 || dir === 7) row = 0; // Back (North)
            else if (dir === 4 || dir === 3) row = 2; // Left (West)
            else if (dir === 0 || dir === 1) row = 3; // Right (East)

            // If attacking, skip to attack rows (4-7)
            if (isAttacking) row += 4;

            ctx.save();
            ctx.translate(x, y);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(0, 15, 20, 8, 0, 0, Math.PI * 2); ctx.fill();

            // Sprite Drawing
            const cols = 3;
            const rows = (sprite.height / sprite.width > 2.0) ? 8 : 4; // Detect 3x4 vs 3x8 based on aspect ratio
            const sw = sprite.width / cols;
            const sh = sprite.height / rows;

            // Scale: Standardize to a fixed world height (e.g., 64px)
            const targetHeight = 64;
            const worldScale = targetHeight / sh;
            const targetWidth = sw * worldScale;

            ctx.drawImage(
                sprite,
                frame * sw, row * sh, sw, sh,
                -targetWidth / 2, -targetHeight + 20, targetWidth, targetHeight
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
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'shiryu', assets, isMoving);
        // Only draw extra effects if NO sprite is loaded
        if (!assets || !assets['shiryu']?.sprite?.complete) {
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = '#059669'; ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(0, -10, 35, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    },
    charles: (ctx, x, y, anim, color, angle, assets, isMoving = true) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'charles', assets, isMoving);
        if (!assets || !assets['charles']?.sprite?.complete) {
            ctx.fillStyle = '#451a03'; // Wooden Drum
            ctx.fillRect(x + 18, y - 5, 12, 18);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(x + 18, y - 5, 12, 3);
        }
    },
    poisoncraft: (ctx, x, y, anim, color, angle, assets, isMoving = true) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'poisoncraft', assets, isMoving);
        if (!assets || !assets['poisoncraft']?.sprite?.complete) {
            ctx.save(); ctx.translate(x, y);
            ctx.strokeStyle = '#4d7c0f'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, -10, 32 + Math.sin(anim * 5) * 2, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    },
    foxz: (ctx, x, y, anim, color, angle, assets, isMoving = true) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'foxz', assets, isMoving);
        if (!assets || !assets['foxz']?.sprite?.complete) {
            ctx.save(); ctx.translate(x, y);
            ctx.fillStyle = 'rgba(126, 34, 206, 0.2)';
            ctx.beginPath(); ctx.arc(0, -10, 30, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    },
    peixe: (ctx, x, y, anim, color, angle, assets, isMoving = true) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'peixe', assets, isMoving);
        if (!assets || !assets['peixe']?.sprite?.complete) {
            ctx.save(); ctx.translate(x, y);
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-15, -45); ctx.lineTo(15, -45);
            ctx.moveTo(0, -60); ctx.lineTo(0, -30); ctx.stroke(); // Holy Cross/Star
            ctx.restore();
        }
    },
    dan: (ctx, x, y, anim, color, angle, assets, isMoving = true) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'dan', assets, isMoving);
        if (!assets || !assets['dan']?.sprite?.complete) {
            ctx.save(); ctx.translate(x, y);
            ctx.fillStyle = '#16a34a'; // Leaves
            const rot = anim * 2;
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate(rot + (i * Math.PI * 2 / 3));
                ctx.fillRect(25, 0, 8, 4);
                ctx.restore();
            }
            ctx.restore();
        }
    },
    huntskan: (ctx, x, y, anim, color, angle, assets, isMoving = true) => {
        CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, 'huntskan', assets, isMoving);
        if (!assets || !assets['huntskan']?.sprite?.complete) {
            ctx.save(); ctx.translate(x, y);
            ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 15, 25, 0, Math.PI); ctx.stroke(); // Water Ripple
            ctx.restore();
        }
    },
    default: (ctx, x, y, anim, color, angle, assets, isMoving = true, championId = null) => CHAMPION_SKINS.drawSailor(ctx, x, y, anim, color, angle, championId, assets, isMoving)
};

CHAMPION_SKINS.shiryusuyama = CHAMPION_SKINS.shiryu;
CHAMPION_SKINS.rafarofa = CHAMPION_SKINS.charles;
