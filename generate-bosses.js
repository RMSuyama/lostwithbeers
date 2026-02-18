const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// 5 UNIQUE BOSSES - Link to the Past / SNES RPG Style
// Size: 64x64 frames (larger than champions) for imposing presence

const bosses = {
    kraken: {
        name: 'The Kraken',
        type: 'kraken',
        color: '#7f1d1d', // Dark Red
        accent: '#e11d48' // Pinkish suckers
    },
    ghost_captain: {
        name: 'Ghost Captain',
        type: 'ghost',
        color: '#64748b', // Slate
        accent: '#38bdf8' // Cyan Glow
    },
    leviathan: {
        name: 'Leviathan',
        type: 'serpent',
        color: '#064e3b', // Deep Green
        accent: '#34d399' // Emerald Scales
    },
    siren: {
        name: 'Siren Queen',
        type: 'mermaid',
        color: '#4f46e5', // Indigo
        accent: '#f472b6' // Pink Hair
    },
    poseidon: {
        name: 'Poseidon Shadow',
        type: 'god',
        color: '#0ea5e9', // Sky Blue
        accent: '#fbbf24' // Gold Trident
    }
};

function drawPixel(ctx, x, y, color, size = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
}

function drawRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

// --- BOSS DRAWING LOGIC ---

function drawKraken(ctx, theme, dir, frame) {
    const cx = 32;
    const cy = 32;

    ctx.save();
    ctx.translate(cx, cy);

    // Head (Bulbous)
    ctx.fillStyle = theme.color;
    // Pulsing effect
    const pulse = Math.sin(frame * 0.5) * 2;

    // Main Body
    drawRect(ctx, -16, -20, 32, 24);
    // Eyes (Menacing)
    drawRect(ctx, -10, -10, 6, 6);
    drawRect(ctx, 4, -10, 6, 6);
    // Yellow pupils
    drawRect(ctx, -8, -8, 2, 2, '#fbbf24');
    drawRect(ctx, 6, -8, 2, 2, '#fbbf24');

    // Tentacles (Wriggling)
    ctx.fillStyle = theme.accent;
    const wiggle = Math.sin(frame) * 4;

    // 4 Main tentacles
    drawRect(ctx, -20 + wiggle, 4, 8, 24);
    drawRect(ctx, -8 - wiggle, 8, 8, 20);
    drawRect(ctx, 4 + wiggle, 8, 8, 20);
    drawRect(ctx, 16 - wiggle, 4, 8, 24);

    ctx.restore();
}

function drawGhostCaptain(ctx, theme, dir, frame) {
    const cx = 32;
    const cy = 32;

    ctx.save();
    ctx.translate(cx, cy);

    // Floating effect
    const floatY = Math.sin(frame * 0.3) * 3;
    ctx.translate(0, floatY);

    // Ethereal Transparency
    ctx.globalAlpha = 0.7;

    // Body (Tattered Coat)
    ctx.fillStyle = theme.color;
    drawRect(ctx, -12, -10, 24, 30);

    // Head (Skull)
    ctx.fillStyle = '#e2e8f0'; // Bone white
    drawRect(ctx, -8, -24, 16, 12);
    // Glowing Blue Eyes
    drawRect(ctx, -4, -20, 2, 2, theme.accent);
    drawRect(ctx, 2, -20, 2, 2, theme.accent);

    // Pirate Hat
    ctx.fillStyle = '#1e293b';
    drawRect(ctx, -16, -28, 32, 6); // Brim
    drawRect(ctx, -10, -34, 20, 6); // Top

    // Hook Hand
    if (dir === 'right' || dir === 'front') {
        ctx.fillStyle = '#94a3b8'; // Silver
        drawRect(ctx, 14, 0, 4, 8);
        drawRect(ctx, 14, 8, 6, 2); // Hook curve
        drawRect(ctx, 18, 4, 2, 4);
    }

    // Sword (Spectral)
    if (dir === 'left' || dir === 'front') {
        ctx.fillStyle = theme.accent;
        drawRect(ctx, -24, 0, 4, 24); // Blade
        drawRect(ctx, -28, 4, 12, 4); // Hilt
    }

    ctx.restore();
}

function drawLeviathan(ctx, theme, dir, frame) {
    const cx = 32;
    const cy = 32;

    ctx.save();
    ctx.translate(cx, cy);

    // Coiling motion logic could be complex, keeping it simple but big

    // Segmented Body styling
    ctx.fillStyle = theme.color;

    // Head
    drawRect(ctx, -12, -24, 24, 20);
    // Jaws
    drawRect(ctx, -12, -4, 24, 8);
    // Teeth
    ctx.fillStyle = '#fff';
    drawRect(ctx, -10, -4, 2, 4);
    drawRect(ctx, 8, -4, 2, 4);

    // Eyes
    ctx.fillStyle = '#ef4444'; // Red eyes
    drawRect(ctx, -10, -18, 4, 4);
    drawRect(ctx, 6, -18, 4, 4);

    // Body Segments behind
    const wiggle = Math.cos(frame * 0.5) * 5;
    ctx.fillStyle = theme.color;
    drawRect(ctx, -10 + wiggle, 0, 20, 16);
    drawRect(ctx, -8 - wiggle, 14, 16, 14);

    // Fins
    ctx.fillStyle = theme.accent;
    drawRect(ctx, -20, -14, 8, 12); // Left fin
    drawRect(ctx, 12, -14, 8, 12);  // Right fin

    ctx.restore();
}

function drawSiren(ctx, theme, dir, frame) {
    const cx = 32;
    const cy = 32;

    ctx.save();
    ctx.translate(cx, cy);

    const floatY = Math.sin(frame * 0.2) * 2;
    ctx.translate(0, floatY);

    // Tail (Mermaid)
    ctx.fillStyle = theme.color;
    // Curved tail
    if (frame % 2 === 0) {
        drawRect(ctx, -10, 10, 20, 10);
        drawRect(ctx, -6, 20, 12, 12); // Fin base
        ctx.fillStyle = theme.accent;
        drawRect(ctx, -12, 28, 24, 8); // Fin tip
    } else {
        drawRect(ctx, -8, 10, 16, 12);
        drawRect(ctx, -4, 22, 8, 10);
        ctx.fillStyle = theme.accent;
        drawRect(ctx, -8, 30, 16, 6);
    }

    // Body
    ctx.fillStyle = '#fce7f3'; // Skin
    drawRect(ctx, -8, -10, 16, 20);

    // Hair (Floating)
    ctx.fillStyle = theme.accent; // Pink hair
    drawRect(ctx, -12, -20, 24, 12);
    drawRect(ctx, -14, -10, 6, 20); // Long hair side
    drawRect(ctx, 8, -10, 6, 20);

    // Face
    drawRect(ctx, -2, -14, 1, 1, '#000');
    drawRect(ctx, 1, -14, 1, 1, '#000');

    // Crown
    ctx.fillStyle = '#fbbf24';
    drawRect(ctx, -8, -24, 16, 6);

    ctx.restore();
}

function drawPoseidon(ctx, theme, dir, frame) {
    const cx = 32;
    const cy = 32;

    ctx.save();
    ctx.translate(cx, cy);

    // Water Form (Shifting)
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = theme.color;

    // Massive Torso
    drawRect(ctx, -16, -20, 32, 30);

    // Water Swirl Base instead of legs
    const swirl = Math.sin(frame) * 3;
    drawRect(ctx, -12 + swirl, 10, 24, 10);
    drawRect(ctx, -8 - swirl, 20, 16, 10);

    // Head (Bearded)
    drawRect(ctx, -10, -32, 20, 12);
    // Beard
    ctx.fillStyle = '#e0f2fe';
    drawRect(ctx, -10, -20, 20, 8);

    // Glowing Eyes
    ctx.fillStyle = '#fff';
    drawRect(ctx, -6, -28, 4, 3);
    drawRect(ctx, 2, -28, 4, 3);

    // Trident
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = theme.accent;
    drawRect(ctx, 20, -40, 4, 60); // Pole
    drawRect(ctx, 14, -40, 16, 2); // Cross
    drawRect(ctx, 14, -50, 2, 10); // Tip 1
    drawRect(ctx, 21, -50, 2, 10); // Tip 2
    drawRect(ctx, 28, -50, 2, 10); // Tip 3

    ctx.restore();
}

// --- GENERATION LOOP ---

function generateBossSprite(bossId) {
    const theme = bosses[bossId];
    if (!theme) return null;

    const frameWidth = 64;
    const frameHeight = 64;
    const cols = 2; // Simple animation (Frame A, Frame B)
    const rows = 4; // Back, Front, Left, Right

    const canvas = createCanvas(frameWidth * cols, frameHeight * rows);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const directions = ['back', 'front', 'left', 'right'];

    let rowIndex = 0;
    for (const direction of directions) {
        for (let col = 0; col < cols; col++) {
            const x = col * frameWidth;
            const y = rowIndex * frameHeight;

            // Clear area
            // ctx.clearRect(x, y, frameWidth, frameHeight);

            if (theme.type === 'kraken') drawKraken(ctx, theme, direction, col);
            else if (theme.type === 'ghost') drawGhostCaptain(ctx, theme, direction, col);
            else if (theme.type === 'serpent') drawLeviathan(ctx, theme, direction, col);
            else if (theme.type === 'mermaid') drawSiren(ctx, theme, direction, col);
            else if (theme.type === 'god') drawPoseidon(ctx, theme, direction, col);
        }
        rowIndex++;
    }
    return canvas;
}

const outputDir = path.join(__dirname, 'client', 'public', 'assets', 'mobs');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

console.log('🦑 Generating UNIQUE BOSS Sprites (64x64)...\n');

Object.keys(bosses).forEach(bossId => {
    const canvas = generateBossSprite(bossId);
    if (canvas) {
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(path.join(outputDir, `${bossId}.png`), buffer);
        console.log(`✅ Generated ${bosses[bossId].name}`);
    }
});
