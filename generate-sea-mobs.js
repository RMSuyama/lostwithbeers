const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// SEA CREATURE & PIRATE MOBS - Link to the Past Quality
const mobThemes = {
    scout: {
        name: 'Small Crab',
        color: '#f87171', // Red crab
        shell: '#dc2626',
        eyes: '#fef08a',
        size: 'small'
    },
    warrior: {
        name: 'Pirate Sailor',
        color: '#f59e0b', // Orange/tan skin
        clothes: '#1e293b', // Dark clothes
        accent: '#dc2626', // Red bandana
        size: 'medium'
    },
    brute: {
        name: 'Octopus Spawn',
        color: '#7c2d12', // Brown/purple
        tentacle: '#a855f7',
        eyes: '#ef4444',
        size: 'large'
    },
    ghost: {
        name: 'Ghost Pirate',
        color: '#a78bfa', // Purple ghost
        fade: '#c4b5fd',
        accent: '#1e293b',
        size: 'medium'
    },
    boss: {
        name: 'Sea Monster Captain',
        color: '#7f1d1d', // Dark red
        scales: '#991b1b',
        eyes: '#fbbf24',
        horns: '#292524',
        size: 'huge'
    }
};

function drawPixel(ctx, x, y, color, size = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
}

function drawCrab(ctx, cx, cy, theme) {
    // Shell
    ctx.fillStyle = theme.shell;
    ctx.fillRect(cx - 6, cy - 4, 12, 8);
    // Highlights
    drawPixel(ctx, cx - 4, cy - 2, theme.color, 2);
    drawPixel(ctx, cx + 2, cy - 2, theme.color, 2);

    // Claws
    ctx.fillStyle = theme.shell;
    ctx.fillRect(cx - 10, cy - 2, 3, 3); // Left claw
    ctx.fillRect(cx + 7, cy - 2, 3, 3);  // Right claw

    // Eyes on stalks
    drawPixel(ctx, cx - 3, cy - 6, theme.eyes);
    drawPixel(ctx, cx + 3, cy - 6, theme.eyes);

    // Legs (tiny)
    ctx.fillStyle = theme.color;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(cx - 6 + i * 3, cy + 4, 1, 2);
        ctx.fillRect(cx + 1 + i * 3, cy + 4, 1, 2);
    }
}

function drawPirateSailor(ctx, cx, cy, theme) {
    // Body
    ctx.fillStyle = theme.color;
    ctx.fillRect(cx - 5, cy - 6, 10, 12);

    // Clothes (striped shirt)
    ctx.fillStyle = theme.clothes;
    ctx.fillRect(cx - 4, cy, 8, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, cy + 1, 8, 1);
    ctx.fillRect(cx - 4, cy + 3, 8, 1);

    // Bandana
    ctx.fillStyle = theme.accent;
    ctx.fillRect(cx - 5, cy - 9, 10, 3);

    // Face
    drawPixel(ctx, cx - 2, cy - 3, '#000', 1); // Eyes
    drawPixel(ctx, cx + 2, cy - 3, '#000', 1);

    // Sword
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(cx + 6, cy - 2, 2, 6);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx + 6, cy + 4, 2, 2);
}

function drawOctopus(ctx, cx, cy, theme) {
    // Head
    ctx.fillStyle = theme.color;
    ctx.fillRect(cx - 8, cy - 8, 16, 12);

    // Shading
    drawPixel(ctx, cx - 6, cy - 6, theme.tentacle, 3);
    drawPixel(ctx, cx + 3, cy - 6, theme.tentacle, 3);

    // Eyes (angry)
    ctx.fillStyle = theme.eyes;
    ctx.fillRect(cx - 4, cy - 3, 3, 3);
    ctx.fillRect(cx + 1, cy - 3, 3, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - 3, cy - 2, 2, 2);
    ctx.fillRect(cx + 2, cy - 2, 2, 2);

    // Tentacles
    ctx.fillStyle = theme.tentacle;
    for (let i = 0; i < 4; i++) {
        const tx = cx - 6 + i * 4;
        ctx.fillRect(tx, cy + 4, 2, 4);
        ctx.fillRect(tx + 1, cy + 8, 1, 2);
    }
}

function drawGhostPirate(ctx, cx, cy, theme) {
    // Wispy ghost body
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = theme.color;
    ctx.fillRect(cx - 6, cy - 8, 12, 14);

    ctx.fillStyle = theme.fade;
    ctx.fillRect(cx - 5, cy - 7, 10, 2);
    ctx.fillRect(cx - 4, cy + 4, 8, 1);

    // Tattered pirate hat
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(cx - 7, cy - 12, 14, 4);

    // Ghost eyes (glowing)
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx - 3, cy - 4, 2, 3);
    ctx.fillRect(cx + 1, cy - 4, 2, 3);

    // Wispy tail
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = theme.fade;
    ctx.fillRect(cx - 3, cy + 6, 2, 3);
    ctx.fillRect(cx + 1, cy + 6, 2, 3);
    ctx.fillRect(cx - 1, cy + 9, 2, 2);

    ctx.globalAlpha = 1;
}

function drawSeaMonsterBoss(ctx, cx, cy, theme) {
    // Massive body
    ctx.fillStyle = theme.color;
    ctx.fillRect(cx - 12, cy - 12, 24, 24);

    // Scales texture
    ctx.fillStyle = theme.scales;
    for (let py = -10; py < 10; py += 4) {
        for (let px = -10; px < 10; px += 4) {
            if ((px + py) % 8 === 0) {
                ctx.fillRect(cx + px, cy + py, 3, 3);
            }
        }
    }

    // Horns
    ctx.fillStyle = theme.horns;
    ctx.fillRect(cx - 10, cy - 16, 3, 4);
    ctx.fillRect(cx + 7, cy - 16, 3, 4);
    drawPixel(ctx, cx - 9, cy - 17, theme.horns);
    drawPixel(ctx, cx + 8, cy - 17, theme.horns);

    // Glowing eyes
    ctx.fillStyle = theme.eyes;
    ctx.fillRect(cx - 6, cy - 6, 4, 4);
    ctx.fillRect(cx + 2, cy - 6, 4, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx - 5, cy - 5, 2, 2);
    ctx.fillRect(cx + 3, cy - 5, 2, 2);

    // Sharp teeth
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 4, cy + 4, 2, 3);
    ctx.fillRect(cx - 1, cy + 4, 2, 3);
    ctx.fillRect(cx + 2, cy + 4, 2, 3);

    // Captain's coat (tattered)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 10, cy, 20, 8);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 9, cy + 1, 2, 6); // Buttons
    ctx.fillRect(cx + 7, cy + 1, 2, 6);
}

function generateMobSprite(mobType) {
    const theme = mobThemes[mobType];
    if (!theme) return null;

    // Determine size
    let size = 32;
    if (theme.size === 'small') size = 24;
    if (theme.size === 'large') size = 48;
    if (theme.size === 'huge') size = 64;

    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(cx - 6, size - 4, 12, 2);

    // Draw mob based on type
    switch (mobType) {
        case 'scout': drawCrab(ctx, cx, cy, theme); break;
        case 'warrior': drawPirateSailor(ctx, cx, cy, theme); break;
        case 'brute': drawOctopus(ctx, cx, cy, theme); break;
        case 'ghost': drawGhostPirate(ctx, cx, cy, theme); break;
        case 'boss': drawSeaMonsterBoss(ctx, cx, cy, theme); break;
    }

    return canvas;
}

// Generate all mob sprites
const outputDir = path.join(__dirname, 'client', 'public', 'assets', 'mobs');
fs.mkdirSync(outputDir, { recursive: true });

console.log('🌊 Generating SEA CREATURE & PIRATE Mobs (Link to the Past style)...\n');

let generated = 0;
Object.keys(mobThemes).forEach(mobType => {
    const canvas = generateMobSprite(mobType);
    if (canvas) {
        const buffer = canvas.toBuffer('image/png');
        const filePath = path.join(outputDir, `${mobType}.png`);
        fs.writeFileSync(filePath, buffer);
        console.log(`🦀 ${mobType.padEnd(10)} → ${mobThemes[mobType].name} (${mobThemes[mobType].size})`);
        generated++;
    }
});

console.log(`\n✅ Generated ${generated} sea creature/pirate mobs!`);
console.log(`   Location: ${outputDir}`);
console.log(`   Theme: Nautical enemies with pixel art quality`);
