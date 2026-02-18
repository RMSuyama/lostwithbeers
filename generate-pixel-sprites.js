const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Champion configurations with visual characteristics
const champions = {
    djox: { name: 'Djox', color: '#334155', type: 'ox', weapon: 'anchor' },
    brunao: { name: 'Brunão', color: '#db2777', type: 'paladin', weapon: 'shield' },
    jubarbie: { name: 'Jubarbie', color: '#1e3a8a', type: 'warrior', weapon: 'trident' },
    shiryu: { name: 'Shiryu', color: '#064e3b', type: 'dragon', weapon: 'sword' },
    charles: { name: 'Charles', color: '#475569', type: 'drummer', weapon: 'drum' },
    gusto: { name: 'Gusto', color: '#78350f', type: 'rat', weapon: 'potion' },
    kleyiton: { name: 'Kleyiton', color: '#b45309', type: 'mage', weapon: 'staff' },
    milan: { name: 'Milan', color: '#4a044e', type: 'magician', weapon: 'cards' },
    enzo: { name: 'Enzo', color: '#0369a1', type: 'rocker', weapon: 'guitar' },
    mayron: { name: 'Mayron', color: '#0d9488', type: 'water', weapon: 'trident' },
    klebao: { name: 'Klebão', color: '#ffffff', type: 'priest', weapon: 'cross' },
    poisoncraft: { name: 'Poisoncraft', color: '#4d7c0f', type: 'witch', weapon: 'flask' },
    foxz: { name: 'Foxz', color: '#7e22ce', type: 'fox', weapon: 'orb' },
    peixe: { name: 'Peixe', color: '#fbbf24', type: 'fish', weapon: 'halo' },
    dan: { name: 'Dan', color: '#16a34a', type: 'druid', weapon: 'vine' },
    huntskan: { name: 'Huntskan', color: '#0f766e', type: 'naga', weapon: 'spear' },
    nadson: { name: 'Nadson', color: '#f97316', type: 'fire', weapon: 'flame' },
    espirro: { name: 'Espirro', color: '#dc2626', type: 'monk', weapon: 'fist' },
    rafarofa: { name: 'Rafarofa', color: '#475569', type: 'drummer', weapon: 'drum' },
    shiryusuyama: { name: 'Shiryu Suyama', color: '#064e3b', type: 'dragon', weapon: 'sword' }
};

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 };
}

function darken(hex, amount = 40) {
    const rgb = hexToRgb(hex);
    return `rgb(${Math.max(0, rgb.r - amount)}, ${Math.max(0, rgb.g - amount)}, ${Math.max(0, rgb.b - amount)})`;
}

function drawCharacter(ctx, x, y, championData, direction, frame, isAttack = false) {
    const { color, type } = championData;
    const rgb = hexToRgb(color);
    const darkColor = darken(color, 40);

    ctx.save();
    ctx.translate(x, y);

    // Simple character body (pixel art style)
    const bodyWidth = 8;
    const bodyHeight = 12;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-4, 12, 8, 2);

    // Body (main color)
    ctx.fillStyle = color;
    ctx.fillRect(-bodyWidth / 2, 0, bodyWidth, bodyHeight);

    // Head
    const headColor = type === 'fish' || type === 'dragon' ? color : '#ffd7a3';
    ctx.fillStyle = headColor;
    ctx.fillRect(-3, -6, 6, 6);

    // Eyes (direction dependent)
    ctx.fillStyle = '#000';
    if (direction === 'front') {
        ctx.fillRect(-2, -4, 1, 1);
        ctx.fillRect(1, -4, 1, 1);
    } else if (direction === 'back') {
        // No eyes visible
    } else if (direction === 'left') {
        ctx.fillRect(-2, -4, 1, 1);
    } else if (direction === 'right') {
        ctx.fillRect(1, -4, 1, 1);
    }

    // Simple weapon/accessory indicator
    if (isAttack) {
        ctx.fillStyle = darkColor;
        if (direction === 'right') {
            ctx.fillRect(4, 2, 3, 2); // Weapon extended
        } else if (direction === 'left') {
            ctx.fillRect(-7, 2, 3, 2);
        } else if (direction === 'front') {
            ctx.fillRect(-1, 8, 2, 4);
        } else {
            ctx.fillRect(-1, -8, 2, 4);
        }
    }

    // Legs (animated by frame)
    ctx.fillStyle = darkColor;
    const legOffset = frame === 1 ? 1 : (frame === 2 ? -1 : 0);
    ctx.fillRect(-3, 12 + legOffset, 2, 3);
    ctx.fillRect(1, 12 - legOffset, 2, 3);

    ctx.restore();
}

function generateSpriteSheet(championId, championData) {
    const frameWidth = 32;
    const frameHeight = 32;
    const cols = 3;
    const rows = 8; // 4 walk + 4 attack

    const canvas = createCanvas(frameWidth * cols, frameHeight * rows);
    const ctx = canvas.getContext('2d');

    // Clear with transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const directions = ['back', 'front', 'left', 'right'];

    // Draw walk animations (rows 0-3)
    directions.forEach((dir, rowIndex) => {
        for (let frame = 0; frame < cols; frame++) {
            const cx = frame * frameWidth + frameWidth / 2;
            const cy = rowIndex * frameHeight + frameHeight / 2;
            drawCharacter(ctx, cx, cy, championData, dir, frame, false);
        }
    });

    // Draw attack animations (rows 4-7)
    directions.forEach((dir, rowIndex) => {
        for (let frame = 0; frame < cols; frame++) {
            const cx = frame * frameWidth + frameWidth / 2;
            const cy = (rowIndex + 4) * frameHeight + frameHeight / 2;
            drawCharacter(ctx, cx, cy, championData, dir, frame, true);
        }
    });

    return canvas;
}

// Create output directory
const outputDir = path.join(__dirname, 'client', 'public', 'assets', 'champions');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate sprite sheets for each champion
Object.keys(champions).forEach(championId => {
    const canvas = generateSpriteSheet(championId, champions[championId]);
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(outputDir, `${championId}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Generated ${championId}.png`);
});

console.log('All champion sprites generated successfully!');
