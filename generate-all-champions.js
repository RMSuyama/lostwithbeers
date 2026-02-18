const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// ALL CHAMPIONS AS PIRATES/SAILORS - Link to the Past Quality
const championThemes = {
    jaca: { name: 'Crocodile Sailor', type: 'crocodile', color: '#15803d', clothes: '#ffffff', accent: '#3b82f6' },
    djox: { name: 'Shark Pirate Captain', type: 'shark', color: '#64748b', clothes: '#dc2626', accent: '#fbbf24' },
    brunao: { name: 'Pink Paladin Sailor', type: 'human', color: '#fbcfe8', clothes: '#ec4899', accent: '#fbbf24' },
    jubarbie: { name: 'Whale Corsair', type: 'whale', color: '#1e40af', clothes: '#1e293b', accent: '#bae6fd' },
    shiryu: { name: 'Dragon Pirate Knight', type: 'dragon', color: '#064e3b', clothes: '#10b981', accent: '#fef08a' },
    charles: { name: 'Drummer First Mate', type: 'human', color: '#ffe4e6', clothes: '#1e293b', accent: '#f59e0b' },
    gusto: { name: 'Rat Ship Doctor', type: 'rat', color: '#92400e', clothes: '#451a03', accent: '#fef3c7' },
    kleyiton: { name: 'Navigator Mage', type: 'human', color: '#ffedd5', clothes: '#fbbf24', accent: '#7c3aed' },
    milan: { name: 'Card Shark Gambler', type: 'human', color: '#f5d0fe', clothes: '#1f2937', accent: '#ef4444' },
    enzo: { name: 'Pirate Bard', type: 'human', color: '#e0f2fe', clothes: '#334155', accent: '#fbbf24' },
    mayron: { name: 'Water Corsair', type: 'human', color: '#ccfbf1', clothes: '#164e63', accent: '#67e8f9' },
    klebao: { name: 'Holy Ship Priest', type: 'human', color: '#fff1f2', clothes: '#ffffff', accent: '#dbeafe' },
    poisoncraft: { name: 'Plague Doctor Pirate', type: 'plague', color: '#3f6212', clothes: '#1a2e05', accent: '#854d0e' },
    foxz: { name: 'Fox Warlock Sailor', type: 'fox', color: '#a855f7', clothes: '#581c87', accent: '#fbbf24' },
    peixe: { name: 'Goldfish Chaplain', type: 'fish', color: '#fbbf24', clothes: '#ffffff', accent: '#3b82f6' },
    dan: { name: 'Druid Sailor', type: 'human', color: '#dcfce7', clothes: '#166534', accent: '#854d0e' },
    huntskan: { name: 'Naga Pirate', type: 'naga', color: '#0e7490', clothes: '#115e59', accent: '#a5f3fc' },
    bia: { name: 'Fairy Pirate Mage', type: 'fairy', color: '#fce7f3', clothes: '#fbbf24', accent: '#e879f9' },
    nadson: { name: 'Fire Mage Pirate', type: 'human', color: '#ffedd5', clothes: '#dc2626', accent: '#fef08a' },
    espirro: { name: 'Monk Quartermaster', type: 'human', color: '#fee2e2', clothes: '#7f1d1d', accent: '#fef3c7' }
};

function drawPixel(ctx, x, y, color, size = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
}

function drawRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawFace(ctx, x, y, dir, theme) {
    if (dir === 'back') return;

    // Eye Color (default black, or theme accent for magic users)
    const eyeColor = theme.type === 'warlock' || theme.type === 'dragon' ? theme.accent : '#000';
    const white = '#fff';

    if (dir === 'front') {
        // Left Eye
        drawPixel(ctx, x - 2, y, white, 2);
        drawPixel(ctx, x - 2 + (theme.type === 'naga' ? 1 : 0), y, eyeColor, 1);

        // Right Eye
        drawPixel(ctx, x + 2, y, white, 2);
        drawPixel(ctx, x + 2, y, eyeColor, 1);

        // Mouth (Smile or Neutral)
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.3;
        drawRect(ctx, x - 1, y + 3, 4, 1); // Simple mouth
        ctx.globalAlpha = 1.0;
    }
    else if (dir === 'right') {
        // Single visible eye
        drawPixel(ctx, x + 2, y, white, 2);
        drawPixel(ctx, x + 3, y, eyeColor, 1);

        // Mouth
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.3;
        drawRect(ctx, x + 2, y + 3, 2, 1);
        ctx.globalAlpha = 1.0;
    }
    else if (dir === 'left') {
        // Single visible eye
        drawPixel(ctx, x - 4, y, white, 2);
        drawPixel(ctx, x - 4, y, eyeColor, 1);

        // Mouth
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.3;
        drawRect(ctx, x - 4, y + 3, 2, 1);
        ctx.globalAlpha = 1.0;
    }
}

function drawCharacters(ctx, x, y, theme, direction, isAttack, frame) {
    const cx = x + 16;
    const cy = y + 16;

    ctx.save();
    ctx.translate(cx, cy);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-6, 12, 12, 3);

    if (theme.type === 'crocodile') {
        drawCrocodile(ctx, theme, direction, frame);
    } else if (theme.type === 'shark') { // Changed from ox to shark
        drawShark(ctx, theme, direction, frame);
    } else if (theme.type === 'dragon') {
        drawDragon(ctx, theme, direction, frame);
    } else if (theme.type === 'whale') {
        drawWhale(ctx, theme, direction, frame);
    } else if (theme.type === 'fairy') {
        drawFairy(ctx, theme, direction, frame);
    } else if (theme.type === 'rat') {
        drawRat(ctx, theme, direction, frame);
    } else if (theme.type === 'fox') {
        drawFox(ctx, theme, direction, frame);
    } else if (theme.type === 'fish') {
        drawFish(ctx, theme, direction, frame);
    } else if (theme.type === 'naga') {
        drawNaga(ctx, theme, direction, frame);
    } else {
        drawHumanoid(ctx, theme, direction, frame);
    }

    // Attack Effect
    if (isAttack) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (direction === 'right') ctx.arc(10, 0, 8, -1, 1);
        if (direction === 'left') ctx.arc(-10, 0, 8, 2, 4);
        if (direction === 'front') ctx.arc(0, 10, 8, 0.5, 2.5);
        if (direction === 'back') ctx.arc(0, -10, 8, 3.5, 5.5);
        ctx.stroke();
    }

    ctx.restore();
}

// --- Specific Character Drawers ---

function drawCrocodile(ctx, theme, dir, frame) {
    // Green scaly body
    ctx.fillStyle = theme.color;
    ctx.fillRect(-6, -8, 12, 18); // Body

    // Snout/Head
    if (dir === 'front') {
        drawRect(ctx, -5, -14, 10, 8); // Head
        drawRect(ctx, -4, -8, 8, 4);   // Snout protruding
        // Eyes
        drawPixel(ctx, -3, -11, '#ff0', 2);
        drawPixel(ctx, 1, -11, '#ff0', 2);
        drawPixel(ctx, -2, -11, '#000', 1); // Slit pupil
        drawPixel(ctx, 2, -11, '#000', 1);
        // Teeth
        ctx.fillStyle = '#fff';
        drawPixel(ctx, -3, -5, '#fff', 1);
        drawPixel(ctx, 3, -5, '#fff', 1);
    }
    else if (dir === 'right') {
        drawRect(ctx, -2, -14, 8, 8); // Head side
        drawRect(ctx, 4, -10, 6, 4);  // Long snout
        // Eye
        drawPixel(ctx, 0, -12, '#ff0', 2);
        drawPixel(ctx, 1, -12, '#000', 1);
    }
    else if (dir === 'left') {
        drawRect(ctx, -6, -14, 8, 8);
        drawRect(ctx, -10, -10, 6, 4);
        // Eye
        drawPixel(ctx, -2, -12, '#ff0', 2);
        drawPixel(ctx, -2, -12, '#000', 1);
    }

    // Tail
    ctx.fillStyle = theme.color;
    if (dir === 'right') ctx.fillRect(-8, 6, 4, 6);
    if (dir === 'left') ctx.fillRect(4, 6, 4, 6);

    // Sailor Clothes
    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -6, 0, 12, 8);
    ctx.fillStyle = theme.accent;
    drawRect(ctx, -5, 0, 10, 2);

    // Hat
    ctx.fillStyle = '#fff';
    drawRect(ctx, -5, -16, 10, 3); // Sailor hat higher up
}

function drawShark(ctx, theme, dir, frame) {
    const grey = theme.color;
    const white = '#cbd5e1';

    // Body
    ctx.fillStyle = grey;
    drawRect(ctx, -7, -10, 14, 20);

    // Head (Pointy)
    drawRect(ctx, -6, -16, 12, 8);

    // Dorsal Fin
    if (dir === 'back' || dir === 'right') drawRect(ctx, 0, -14, 2, 6);
    if (dir === 'left') drawRect(ctx, -2, -14, 2, 6);

    // Face
    if (dir === 'front') {
        // Eyes (black, soulless)
        drawPixel(ctx, -4, -12, '#000', 2);
        drawPixel(ctx, 2, -12, '#000', 2);
        // Jaws/Teeth
        ctx.fillStyle = white;
        drawRect(ctx, -4, -7, 8, 3);
        ctx.fillStyle = '#000'; // Zigzag teeth hint
        drawPixel(ctx, -3, -6, '#000', 1);
        drawPixel(ctx, 0, -6, '#000', 1);
        drawPixel(ctx, 3, -6, '#000', 1);
    } else if (dir !== 'back') {
        // Side profile snout
        ctx.fillStyle = grey;
        if (dir === 'right') drawRect(ctx, 4, -13, 4, 5);
        if (dir === 'left') drawRect(ctx, -8, -13, 4, 5);
        // Side eye
        if (dir === 'right') drawPixel(ctx, 2, -13, '#000', 2);
        if (dir === 'left') drawPixel(ctx, -4, -13, '#000', 2);
    }

    // Pirate Coat
    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -7, 0, 14, 10);
    ctx.fillStyle = theme.accent;
    drawRect(ctx, -2, 0, 4, 8);

    // Hat
    ctx.fillStyle = '#1e293b'; // Tricorne
    drawRect(ctx, -10, -18, 20, 4);
}

function drawDragon(ctx, theme, dir, frame) {
    // Green scales
    ctx.fillStyle = theme.color;
    ctx.fillRect(-6, -10, 12, 20);

    // Head with snout
    drawRect(ctx, -5, -15, 10, 8);

    if (dir === 'front') {
        // Eyes (Reptilian)
        drawPixel(ctx, -3, -12, '#fbbf24', 2);
        drawPixel(ctx, 1, -12, '#fbbf24', 2);
        drawPixel(ctx, -2, -12, '#000', 1);
        drawPixel(ctx, 2, -12, '#000', 1);
        // Snout
        drawRect(ctx, -3, -8, 6, 2);
    }

    // Wings
    ctx.fillStyle = '#047857';
    if (dir !== 'left' && dir !== 'right') {
        drawRect(ctx, -14, -10, 8, 12);
        drawRect(ctx, 6, -10, 8, 12);
    }

    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -6, 2, 12, 8);

    // Bandana
    ctx.fillStyle = theme.accent;
    drawRect(ctx, -5, -16, 10, 2);
}

function drawWhale(ctx, theme, dir, frame) {
    // Huge blue body
    ctx.fillStyle = theme.color;
    ctx.fillRect(-9, -12, 18, 24);

    // Face (Blowhole?)
    if (dir === 'front') {
        ctx.fillStyle = '#bae6fd'; // Belly
        drawRect(ctx, -6, -4, 12, 16);
        // Eyes (Wide set)
        drawPixel(ctx, -7, -8, '#fff', 2);
        drawPixel(ctx, 5, -8, '#fff', 2);
        drawPixel(ctx, -6, -8, '#000', 1);
        drawPixel(ctx, 6, -8, '#000', 1);
        // Smile
        ctx.fillStyle = '#000';
        drawRect(ctx, -4, -2, 8, 1);
    }

    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -9, 6, 18, 6); // Coat bottom

    // Hat
    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -8, -16, 16, 4);
}

function drawFairy(ctx, theme, dir, frame) {
    // Small body
    ctx.fillStyle = theme.color;
    drawRect(ctx, -4, -6, 8, 12);
    // Head
    drawRect(ctx, -4, -12, 8, 6);

    // Face
    drawFace(ctx, 0, -10, dir, theme);

    // Wings
    ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
    const flap = (frame % 2) * 2;
    drawRect(ctx, -10, -10 + flap, 6, 10);
    drawRect(ctx, 4, -10 + flap, 6, 10);

    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -4, 0, 8, 8);
}

function drawHumanoid(ctx, theme, dir, frame) {
    // Skin
    ctx.fillStyle = theme.color;
    // Head
    drawRect(ctx, -5, -14, 10, 9);
    // Body
    drawRect(ctx, -5, -5, 10, 15);

    // Face
    drawFace(ctx, 0, -11, dir, theme);

    // Clothes
    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -6, -4, 12, 10); // Shirt/Coat

    // Hat/Accessories
    if (theme.type === 'paladin' || theme.type === 'priest') {
        // Hood/Helmet
        ctx.fillStyle = theme.accent;
        drawRect(ctx, -6, -15, 12, 4);
    } else if (theme.type === 'pirate_heavy' || theme.name.includes('Captain')) {
        // Tricorne
        ctx.fillStyle = '#1e293b';
        drawRect(ctx, -8, -16, 16, 4);
    } else {
        // Bandana/Hair
        ctx.fillStyle = theme.accent;
        drawRect(ctx, -5, -15, 10, 3);
        if (dir === 'right') drawRect(ctx, -6, -14, 2, 4);
        if (dir === 'left') drawRect(ctx, 4, -14, 2, 4);
    }
}

function drawRat(ctx, theme, dir, frame) {
    ctx.fillStyle = theme.color;
    drawRect(ctx, -5, -6, 10, 12); // Small body
    drawRect(ctx, -5, -12, 10, 6); // Head

    // Ears
    ctx.fillStyle = theme.color;
    drawRect(ctx, -7, -14, 3, 3);
    drawRect(ctx, 4, -14, 3, 3);

    // Face
    if (dir !== 'back') {
        drawPixel(ctx, -3, -10, '#000', 2);
        drawPixel(ctx, 1, -10, '#000', 2);
        // Whiskers
        ctx.fillStyle = '#000';
        if (dir === 'front') {
            drawRect(ctx, -6, -7, 2, 1);
            drawRect(ctx, 4, -7, 2, 1);
        }
    }

    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -5, 0, 10, 6);
}

function drawFox(ctx, theme, dir, frame) {
    ctx.fillStyle = theme.color;
    drawRect(ctx, -5, -8, 10, 16);
    // Ears
    drawRect(ctx, -6, -14, 3, 5);
    drawRect(ctx, 3, -14, 3, 5);

    // Face
    drawFace(ctx, 0, -9, dir, theme);

    // Tail
    ctx.fillStyle = theme.accent;
    if (dir === 'right') drawRect(ctx, -10, 2, 5, 8);
    if (dir === 'left') drawRect(ctx, 5, 2, 5, 8);
}

function drawFish(ctx, theme, dir, frame) {
    ctx.fillStyle = theme.color;
    drawRect(ctx, -6, -10, 12, 18); // Body

    // Fish Face
    if (dir === 'front') {
        drawPixel(ctx, -5, -8, '#fff', 3); // Big eyes
        drawPixel(ctx, 2, -8, '#fff', 3);
        drawPixel(ctx, -4, -8, '#000', 1);
        drawPixel(ctx, 3, -8, '#000', 1);

        ctx.fillStyle = theme.accent; // Fins
        drawRect(ctx, -8, -4, 2, 4);
        drawRect(ctx, 6, -4, 2, 4);

        // Mouth
        ctx.fillStyle = '#000';
        drawRect(ctx, -2, -3, 4, 1);
    } else if (dir !== 'back') {
        // Side face
        drawPixel(ctx, (dir === 'right' ? 2 : -5), -8, '#fff', 3);
        drawPixel(ctx, (dir === 'right' ? 3 : -4), -8, '#000', 1);
    }

    ctx.fillStyle = theme.clothes;
    drawRect(ctx, -6, 2, 12, 6);
}

function drawNaga(ctx, theme, dir, frame) {
    // Tail body
    ctx.fillStyle = theme.color;
    drawRect(ctx, -6, 0, 12, 12);
    // Torso
    drawRect(ctx, -5, -10, 10, 10);

    // Face
    drawFace(ctx, 0, -8, dir, theme);

    // Pirate Bandana
    ctx.fillStyle = theme.accent;
    drawRect(ctx, -5, -12, 10, 2);
}

function generateChampionSprite(championId) {
    const theme = championThemes[championId];
    if (!theme) return null;

    const frameWidth = 32;
    const frameHeight = 32;
    const cols = 3;
    const rows = 8;

    const canvas = createCanvas(frameWidth * cols, frameHeight * rows);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const directions = ['back', 'front', 'left', 'right'];
    const frameTypes = ['walk', 'attack'];
    let rowIndex = 0;

    for (const frameType of frameTypes) {
        const isAttack = frameType === 'attack';
        for (const direction of directions) {
            for (let col = 0; col < cols; col++) {
                const x = col * frameWidth;
                const y = rowIndex * frameHeight;
                drawCharacters(ctx, x, y, theme, direction, isAttack, col);
            }
            rowIndex++;
        }
    }
    return canvas;
}

const outputDir = path.join(__dirname, 'client', 'public', 'assets', 'champions');
fs.mkdirSync(outputDir, { recursive: true });

console.log('🏴‍☠️ Generating CUSTOM PIRATE CHAMPIONS (Faces + Shark + Species)...\n');

Object.keys(championThemes).forEach(championId => {
    const canvas = generateChampionSprite(championId);
    if (canvas) {
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(path.join(outputDir, `${championId}.png`), buffer);
        console.log(`✅ Generated ${championId} (${championThemes[championId].type})`);
    }
});
