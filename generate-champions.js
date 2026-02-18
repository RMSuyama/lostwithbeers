const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Enhanced color palettes with shading
const champions = {
    jaca: {
        name: 'Jaca (Crocodile Sailor)',
        colors: {
            skinDark: '#0d5c2d',
            skin: '#15803d',
            skinLight: '#22c55e',
            uniformDark: '#d1d5db',
            uniform: '#ffffff',
            collarDark: '#1e3a8a',
            collar: '#3b82f6',
            eye: '#fef08a'
        }
    },
    bia: {
        name: 'Bia (Fairy Mage)',
        colors: {
            skinDark: '#db2777',
            skin: '#ec4899',
            skinLight: '#f9a8d4',
            dressDark: '#d97706',
            dress: '#fbbf24',
            dressLight: '#fde047',
            staffDark: '#c026d3',
            staff: '#e879f9',
            starLight: '#fef08a'
        }
    }
};

function drawPixel(ctx, x, y, color, size = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
}

function drawOutlinedRect(ctx, x, y, w, h, fillColor, outlineColor) {
    // Outline
    ctx.fillStyle = outlineColor;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    // Fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w, h);
}

function drawJaca(ctx, x, y, direction, isAttack, frame) {
    const c = champions.jaca.colors;
    const cx = x + 16;
    const cy = y + 16;

    ctx.save();
    ctx.translate(cx, cy);

    // Offset for animation
    const walkOffset = frame % 2 === 0 ? 0 : 1;
    const attackOffset = isAttack ? 2 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-6, 10, 12, 3);

    // Body (crocodile green with shading)
    drawOutlinedRect(ctx, -6, -8, 12, 18, c.skin, c.skinDark);

    // Shading on body
    drawPixel(ctx, -5, -7, c.skinDark);
    drawPixel(ctx, -5, -6, c.skinDark);
    drawPixel(ctx, 4, -7, c.skinLight);
    drawPixel(ctx, 4, 7, c.skinDark);

    // Sailor uniform
    drawOutlinedRect(ctx, -5, 2, 10, 8, c.uniform, c.uniformDark);

    // Blue collar
    drawPixel(ctx, -4, 2, c.collar, 2);
    drawPixel(ctx, 2, 2, c.collar, 2);
    drawPixel(ctx, -3, 4, c.collarDark, 6);

    // Hat
    drawOutlinedRect(ctx, -5, -12, 10, 4, c.uniform, c.uniformDark);
    drawPixel(ctx, -4, -10, c.collarDark, 8);

    // Eyes based on direction
    const eyeY = direction === 'back' ? -6 : -4;
    if (direction !== 'back') {
        drawPixel(ctx, -3, eyeY, '#000', 2);
        drawPixel(ctx, 1, eyeY, '#000', 2);
        // Eye gleam
        drawPixel(ctx, -2, eyeY, c.eye, 1);
        drawPixel(ctx, 2, eyeY, c.eye, 1);
    }

    // Snout (front view)
    if (direction === 'front') {
        drawPixel(ctx, -2, 1, c.skinLight, 4);
        drawPixel(ctx, -1, 2, c.skinDark, 2);
    }

    // Arms
    if (direction === 'left') {
        drawPixel(ctx, -7, 3 + walkOffset, c.skin, 2);
        drawPixel(ctx, 5, 3, c.skinDark, 2);
    } else if (direction === 'right') {
        drawPixel(ctx, -7, 3, c.skinDark, 2);
        drawPixel(ctx, 5, 3 + walkOffset, c.skin, 2);
    }

    // Attack effect
    if (isAttack) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();

        if (direction === 'right') {
            ctx.arc(8 + attackOffset, 0, 6, -Math.PI / 3, Math.PI / 3);
        } else if (direction === 'left') {
            ctx.arc(-8 - attackOffset, 0, 6, Math.PI * 2 / 3, Math.PI * 4 / 3);
        } else if (direction === 'front') {
            ctx.arc(0, 10 + attackOffset, 6, Math.PI / 6, Math.PI * 5 / 6);
        } else {
            ctx.arc(0, -10 - attackOffset, 6, -Math.PI * 5 / 6, -Math.PI / 6);
        }

        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function drawBia(ctx, x, y, direction, isAttack, frame) {
    const c = champions.bia.colors;
    const cx = x + 16;
    const cy = y + 16;

    ctx.save();
    ctx.translate(cx, cy);

    const walkOffset = frame % 2 === 0 ? 0 : 1;
    const floatOffset = Math.sin(frame * 0.5) * 1.5;

    ctx.translate(0, floatOffset);

    // Shadow (smaller for floating character)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-4, 11, 8, 2);

    // Body (round mage)
    drawOutlinedRect(ctx, -5, -4, 10, 12, c.skin, c.skinDark);

    // Body shading
    drawPixel(ctx, -4, -3, c.skinDark);
    drawPixel(ctx, 3, -3, c.skinLight);
    drawPixel(ctx, 3, 5, c.skinLight);

    // Dress/robe
    drawOutlinedRect(ctx, -6, 4, 12, 7, c.dress, c.dressDark);
    drawPixel(ctx, -5, 5, c.dressLight, 2);
    drawPixel(ctx, 3, 5, c.dressDark);
    drawPixel(ctx, -4, 9, c.dressLight);
    drawPixel(ctx, 3, 9, c.dressLight);

    // Hair (golden with highlights)
    ctx.fillStyle = c.dressDark;
    ctx.fillRect(-5, -8, 10, 4);
    drawPixel(ctx, -4, -7, c.dressLight, 2);
    drawPixel(ctx, 2, -7, c.dressLight, 2);

    // Hair accessory (flower)
    drawPixel(ctx, 4, -7, c.staffDark, 2);
    drawPixel(ctx, 5, -6, c.staff);

    // Eyes based on direction
    const eyeY = direction === 'back' ? -3 : -1;
    if (direction !== 'back') {
        drawPixel(ctx, -3, eyeY, '#000', 2);
        drawPixel(ctx, 1, eyeY, '#000', 2);
        // Sparkle
        drawPixel(ctx, -2, eyeY, c.starLight);
        drawPixel(ctx, 2, eyeY, c.starLight);
    }

    // Cheek blush
    if (direction === 'front') {
        ctx.globalAlpha = 0.4;
        drawPixel(ctx, -4, 1, '#ff006e');
        drawPixel(ctx, 3, 1, '#ff006e');
        ctx.globalAlpha = 1;
    }

    // Magic staff
    if (direction !== 'back') {
        // Staff body
        ctx.strokeStyle = c.staffDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, 4);
        ctx.lineTo(6, -6);
        ctx.stroke();

        // Star on top
        ctx.fillStyle = c.staff;
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const sx = 6 + Math.cos(angle) * 4;
            const sy = -7 + Math.sin(angle) * 4;
            if (i === 0) ctx.beginPath();
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();

        // Star center highlight
        drawPixel(ctx, 6, -7, c.starLight, 2);
    }

    // Attack sparkles
    if (isAttack) {
        ctx.globalAlpha = 0.8;
        const sparkles = [
            { x: -8, y: -4 }, { x: 8, y: -2 }, { x: -6, y: 6 },
            { x: 10, y: 4 }, { x: 0, y: -10 }
        ];

        for (let i = 0; i < Math.min(3, sparkles.length); i++) {
            const sp = sparkles[i];
            ctx.fillStyle = i % 2 === 0 ? c.starLight : c.staff;

            // Four-point sparkle
            ctx.fillRect(sp.x - 1, sp.y - 3, 2, 6);
            ctx.fillRect(sp.x - 3, sp.y - 1, 6, 2);
        }
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function generateChampionSprite(championId) {
    const frameWidth = 32;
    const frameHeight = 32;
    const cols = 3;
    const rows = 8;

    const canvas = createCanvas(frameWidth * cols, frameHeight * rows);
    const ctx = canvas.getContext('2d');

    // Anti-aliasing off for crisp pixels
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const directions = ['back', 'front', 'left', 'right'];
    const frameTypes = ['walk', 'attack'];

    const drawFunc = championId === 'jaca' ? drawJaca : drawBia;

    let rowIndex = 0;

    for (const frameType of frameTypes) {
        const isAttack = frameType === 'attack';

        for (const direction of directions) {
            for (let col = 0; col < cols; col++) {
                const x = col * frameWidth;
                const y = rowIndex * frameHeight;

                drawFunc(ctx, x, y, direction, isAttack, col);
            }
            rowIndex++;
        }
    }

    return canvas;
}

// Generate sprites
const outputDir = path.join(__dirname, 'client', 'public', 'assets', 'champions');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎨 Generating ENHANCED champion sprites (Zelda-style)...\n');

Object.keys(champions).forEach(championId => {
    const canvas = generateChampionSprite(championId);
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(outputDir, `${championId}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✨ Generated ${championId}.png - ${champions[championId].name}`);
    console.log(`   → Enhanced with: shading, outlines, highlights`);
});

console.log('\n🎮 All ENHANCED sprites generated successfully!');
console.log(`   Location: ${outputDir}`);
console.log(`   Style: Professional pixel art with Zelda-like quality`);
