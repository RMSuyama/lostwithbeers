const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// ==================== MOB SPRITES ====================
const mobTypes = {
    scout: { color: '#fbbf24', size: 24, type: 'fast' },      // Small yellow scout
    warrior: { color: '#ef4444', size: 32, type: 'normal' },  // Red warrior
    brute: { color: '#7c2d12', size: 48, type: 'tank' },      // Brown tank
    ghost: { color: '#a855f7', size: 28, type: 'flying' },    // Purple ghost
    boss: { color: '#450a0a', size: 64, type: 'boss' }        // Dark red boss
};

function drawMob(ctx, x, y, mobData, frame) {
    const { color, size, type } = mobData;

    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-size / 4, size / 3, size / 2, size / 8);

    if (type === 'ghost') {
        // Floating effect
        const floatY = Math.sin(frame * 0.5) * 2;
        ctx.translate(0, floatY);

        // Ghostly body
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, size / 2, size / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000';
        ctx.fillRect(-size / 4, -size / 8, size / 8, size / 8);
        ctx.fillRect(size / 8, -size / 8, size / 8, size / 8);
    } else if (type === 'boss') {
        // Boss body (intimidating)
        ctx.fillStyle = color;
        ctx.fillRect(-size / 2, -size / 3, size, size * 0.8);

        // Horns
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(-size / 2, -size / 3);
        ctx.lineTo(-size / 2 - size / 4, -size / 2);
        ctx.lineTo(-size / 2, -size / 4);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(size / 2, -size / 3);
        ctx.lineTo(size / 2 + size / 4, -size / 2);
        ctx.lineTo(size / 2, -size / 4);
        ctx.fill();

        // Eyes (glowing)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-size / 4, -size / 8, size / 6, size / 6);
        ctx.fillRect(size / 12, -size / 8, size / 6, size / 6);
    } else {
        // Normal mob body
        ctx.fillStyle = color;
        ctx.fillRect(-size / 2, -size / 3, size, size * 0.7);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-size / 4, -size / 8, size / 8, size / 8);
        ctx.fillRect(size / 8, -size / 8, size / 8, size / 8);

        // Weapon/detail for warrior
        if (type === 'normal') {
            ctx.fillStyle = '#888';
            ctx.fillRect(size / 3, 0, size / 6, size / 3);
        }

        // Armor for tank
        if (type === 'tank') {
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.strokeRect(-size / 2, -size / 3, size, size * 0.7);
        }
    }

    ctx.restore();
}

function generateMobSprite(mobType, mobData) {
    const frameSize = 32;
    const cols = 3;
    const rows = 4;

    const canvas = createCanvas(frameSize * cols, frameSize * rows);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Generate frames for different directions
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cx = col * frameSize + frameSize / 2;
            const cy = row * frameSize + frameSize / 2;
            drawMob(ctx, cx, cy, mobData, col);
        }
    }

    return canvas;
}

// ==================== SKILL/PROJECTILE SPRITES ====================
const skillAssets = {
    // Djox - Anchor chain
    anchor: { color: '#334155', shape: 'anchor' },

    // Brunão - Holy shield
    holy_shield: { color: '#db2777', shape: 'shield' },

    // Jubarbie - Water blast
    water_blast: { color: '#1e3a8a', shape: 'wave' },

    // Shiryu - Dragon breath
    dragon_breath: { color: '#064e3b', shape: 'flame' },

    // Charles - Sound wave
    sound_wave: { color: '#475569', shape: 'wave' },

    // Gusto - Acid flask
    acid_flask: { color: '#78350f', shape: 'bottle' },

    // Kleyiton - Crystal beam
    crystal_beam: { color: '#b45309', shape: 'crystal' },

    // Milan - Magic cards
    magic_cards: { color: '#4a044e', shape: 'card' },

    // Enzo - Electric lightning
    electric_bolt: { color: '#0369a1', shape: 'lightning' },

    // Mayron - Water wave
    water_wave: { color: '#0d9488', shape: 'wave' },

    // Klebão - Holy light
    holy_cross: { color: '#ffffff', shape: 'cross' },

    // Poisoncraft - Plague bolt
    plague_bolt: { color: '#4d7c0f', shape: 'skull' },

    // Foxz - Dark orb
    dark_orb: { color: '#7e22ce', shape: 'orb' },

    // Peixe - Holy radiance
    holy_radiance: { color: '#fbbf24', shape: 'star' },

    // Dan - Nature vine
    nature_vine: { color: '#16a34a', shape: 'leaf' },

    // Huntskan - Spear
    water_spear: { color: '#0f766e', shape: 'spear' },

    // Nadson - Fireball
    fireball: { color: '#f97316', shape: 'fireball' },

    // Espirro - Chi blast
    chi_blast: { color: '#dc2626', shape: 'energy' },

    // Generic effects
    arrow: { color: '#8B4513', shape: 'arrow' },
    bolt: { color: '#60a5fa', shape: 'bolt' },
    slash: { color: '#ffffff', shape: 'slash' }
};

function drawSkillIcon(ctx, x, y, skillData) {
    const { color, shape } = skillData;
    const size = 24;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = color;

    switch (shape) {
        case 'anchor':
            ctx.fillRect(-4, -8, 8, 12);
            ctx.fillRect(-10, 4, 20, 3);
            ctx.fillRect(-8, -10, 4, 4);
            ctx.fillRect(4, -10, 4, 4);
            break;

        case 'shield':
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(8, -6);
            ctx.lineTo(8, 6);
            ctx.lineTo(0, 10);
            ctx.lineTo(-8, 6);
            ctx.lineTo(-8, -6);
            ctx.closePath();
            ctx.fill();
            break;

        case 'wave':
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            for (let i = -10; i <= 10; i += 2) {
                ctx.lineTo(i, Math.sin(i * 0.5) * 4);
            }
            ctx.lineWidth = 3;
            ctx.strokeStyle = color;
            ctx.stroke();
            break;

        case 'flame':
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.bezierCurveTo(-6, -8, -8, 0, 0, 8);
            ctx.bezierCurveTo(8, 0, 6, -8, 0, -10);
            ctx.fill();
            break;

        case 'bottle':
            ctx.fillRect(-4, -6, 8, 12);
            ctx.fillRect(-6, -10, 12, 4);
            break;

        case 'crystal':
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(6, -4);
            ctx.lineTo(6, 4);
            ctx.lineTo(0, 10);
            ctx.lineTo(-6, 4);
            ctx.lineTo(-6, -4);
            ctx.closePath();
            ctx.fill();
            break;

        case 'card':
            ctx.fillRect(-6, -8, 12, 16);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-6, -8, 12, 16);
            break;

        case 'lightning':
            ctx.beginPath();
            ctx.moveTo(2, -10);
            ctx.lineTo(-4, 0);
            ctx.lineTo(2, 0);
            ctx.lineTo(-2, 10);
            ctx.lineTo(4, 0);
            ctx.lineTo(-2, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 'cross':
            ctx.fillRect(-2, -10, 4, 20);
            ctx.fillRect(-10, -2, 20, 4);
            break;

        case 'skull':
            ctx.fillRect(-6, -6, 12, 10);
            ctx.fillStyle = '#000';
            ctx.fillRect(-4, -4, 3, 3);
            ctx.fillRect(1, -4, 3, 3);
            break;

        case 'orb':
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            break;

        case 'star':
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const x = Math.cos(angle) * 10;
                const y = Math.sin(angle) * 10;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            break;

        case 'leaf':
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 10, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'spear':
            ctx.fillRect(-2, -10, 4, 18);
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(-4, -8);
            ctx.lineTo(4, -8);
            ctx.closePath();
            ctx.fill();
            break;

        case 'fireball':
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(-2, -2, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'energy':
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

        default:
            ctx.fillRect(-8, -8, 16, 16);
    }

    ctx.restore();
}

function generateSkillSprite(skillName, skillData) {
    const size = 32;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);
    drawSkillIcon(ctx, size / 2, size / 2, skillData);

    return canvas;
}

// ==================== GENERATION ====================
const mobDir = path.join(__dirname, 'client', 'public', 'assets', 'mobs');
const skillDir = path.join(__dirname, 'client', 'public', 'assets', 'skills');

// Create directories
[mobDir, skillDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Generate mob sprites
console.log('Generating mob sprites...');
Object.keys(mobTypes).forEach(mobType => {
    const canvas = generateMobSprite(mobType, mobTypes[mobType]);
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(mobDir, `${mobType}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`  ✓ Generated ${mobType}.png`);
});

// Generate skill sprites
console.log('\nGenerating skill sprites...');
Object.keys(skillAssets).forEach(skillName => {
    const canvas = generateSkillSprite(skillName, skillAssets[skillName]);
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(skillDir, `${skillName}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`  ✓ Generated ${skillName}.png`);
});

console.log('\n✅ All assets generated successfully!');
console.log(`   - Mob sprites: ${Object.keys(mobTypes).length} files`);
console.log(`   - Skill sprites: ${Object.keys(skillAssets).length} files`);
