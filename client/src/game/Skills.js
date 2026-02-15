import { getChamp } from './Champions';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './constants';

export const castSkill = (championId, player, monsters, projectiles, mapData, damageList, attackEffectRef) => {
    const champ = getChamp(championId);

    // Check mana managed by caller (Game.jsx) or here? 
    // Logic here assumes mana check passed.
    const levelBonus = 1 + (player.level * 0.25);
    const facingAngle = player.angle;
    const myPos = { x: player.x, y: player.y };

    attackEffectRef.current = { x: myPos.x, y: myPos.y, angle: facingAngle, time: Date.now(), type: 'mystic' };

    // Function to spawn damage
    const spawnDamage = (x, y, val, color) => damageList.push({ x, y, value: Math.floor(val), anim: 0, color });
    let totalDamageDealt = 0;

    switch (championId) {
        case 'jaca':
            monsters.forEach(m => {
                const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                if (d < 120) {
                    const sdmg = 65 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg);
                    m.blink = 8;
                    m.x += (Math.random() - 0.5) * 60;
                }
            });
            break;
        case 'djox':
            monsters.forEach(m => {
                const dx = m.x - myPos.x, dy = m.y - myPos.y, d = Math.hypot(dx, dy);
                if (d < 180) {
                    const sdmg = 90 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg);
                    m.blink = 8;
                    m.x += (dx / d) * 120; m.y += (dy / d) * 120;
                }
            });
            break;
        case 'brunao':
            // Logic handled in Game.jsx for self-heal to player stats ref? 
            // Better to return "selfHeal" amount or handle it if we pass a callback or stats object.
            // For now, let's assume we handle external effects via return or direct object mutation if plausible.
            // Since player stats are refs in Game.jsx, we can't easily modify them here without passing the ref.
            // We'll return an "effects" object.
            monsters.forEach(m => {
                if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 220) {
                    const sdmg = 40 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg);
                }
            });
            break;
        case 'jubarbie':
            monsters.forEach(m => {
                if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 300) {
                    const sdmg = 120 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg);
                }
            });
            break;
        case 'shiryu':
            // Mystic blast / AoE
            monsters.forEach(m => {
                if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 250) {
                    const sdmg = 70 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#064e3b');
                    m.blink = 7;
                }
            });
            break;
        case 'charles':
            // Bateria de Guerra (Shockwave)
            monsters.forEach(m => {
                if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 350) {
                    const sdmg = 45 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#475569');
                    m.blink = 5;
                    const ang = Math.atan2(m.y - myPos.y, m.x - myPos.x);
                    m.x += Math.cos(ang) * 100; m.y += Math.sin(ang) * 100;
                }
            });
            break;
        case 'gusto':
            // Alchemist Blast (Big projectile)
            projectiles.push({ x: myPos.x, y: myPos.y, angle: facingAngle, speed: 12, life: 2, dmg: 160 * levelBonus, big: true, color: '#10b981' });
            break;
        case 'kleyiton':
            // Geometric Barrier (AoE DMG + minor push)
            monsters.forEach(m => {
                const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                if (d < 300) {
                    const sdmg = 55 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#c084fc');
                    m.blink = 6;
                    const ang = Math.atan2(m.y - myPos.y, m.x - myPos.x);
                    m.x += Math.cos(ang) * 50; m.y += Math.sin(ang) * 50;
                }
            });
            break;
        case 'klebao':
            // JULGAMENTO SUPREMO (Massive Area Stun/DMG)
            monsters.forEach(m => {
                const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                if (d < 400) {
                    const sdmg = 200 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg;
                    m.blink = 15;
                    spawnDamage(m.x, m.y, "TAPA SECO!", "#ffffff");
                    spawnDamage(m.x, m.y - 20, sdmg, "#ef4444");
                    m.speed = 0; // Stun
                    setTimeout(() => m.speed = 2, 2000);
                }
            });
            break;
        case 'milan':
            // Card blast
            monsters.forEach(m => {
                if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 240) {
                    const sdmg = 85 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#c026d3');
                }
            });
            break;
        case 'enzo':
            // Dash / Blink
            // This one modifies PLAYER Position directly. 
            // We need to return the new position or an effect indicating teleporation.
            const ex = myPos.x + Math.cos(facingAngle) * 300, ey = myPos.y + Math.sin(facingAngle) * 300;
            const egx = Math.floor(ex / TILE_SIZE), egy = Math.floor(ey / TILE_SIZE);
            const escale = mapData?.scales[egy]?.[egx] || 3;
            if (escale < 3) {
                return { totalDamage: 0, teleport: { x: Math.max(0, Math.min(MAP_WIDTH * TILE_SIZE, ex)), y: Math.max(0, Math.min(MAP_HEIGHT * TILE_SIZE, ey)) } };
            }
            break;
        case 'mayron':
            monsters.forEach(m => {
                const dx = m.x - myPos.x, dy = m.y - myPos.y, d = Math.hypot(dx, dy);
                if (d < 280) {
                    const sdmg = 65 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#0d9488');
                    m.blink = 8;
                    m.x -= (dx / d) * 180; m.y -= (dy / d) * 180;
                }
            });
            break;
        case 'poisoncraft':
            // VENOM NOVA: AoE DoT + Slow
            monsters.forEach(m => {
                const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                if (d < 350) {
                    const sdmg = 50 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg;
                    spawnDamage(m.x, m.y, "POISONED", "#a3e635");
                    m.blink = 10;
                    const oldSpeed = m.speed;
                    m.speed *= 0.4; // 60% Slow
                    setTimeout(() => m.speed = oldSpeed, 3000);
                }
            });
            break;
        case 'foxz':
            // SOUL DRAIN: Lifesteal AoE
            monsters.forEach(m => {
                const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                if (d < 280) {
                    const sdmg = 80 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg;
                    spawnDamage(m.x, m.y, sdmg, "#7e22ce");
                    m.blink = 8;
                }
            });
            break;
        case 'peixe':
            // HOLY BURST: DMG + Shield (Simulated as big heal for now)
            monsters.forEach(m => {
                const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                if (d < 220) {
                    const sdmg = 130 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg;
                    spawnDamage(m.x, m.y, sdmg, "#fbbf24");
                    m.blink = 12;
                }
            });
            break;
        case 'dan':
            // REJUVENATION: Pure AoE Heal (handled in return)
            totalDamageDealt = 1; // Minimal so game loop registers it
            attackEffectRef.current = { x: myPos.x, y: myPos.y, angle: 0, time: Date.now(), type: 'nature' };
            break;
        case 'huntskan':
            // SLITHEREEN CRUSH: Stun + KB
            monsters.forEach(m => {
                const dx = m.x - myPos.x, dy = m.y - myPos.y, d = Math.hypot(dx, dy);
                if (d < 200) {
                    const sdmg = 100 * levelBonus;
                    m.hp -= sdmg; totalDamageDealt += sdmg;
                    spawnDamage(m.x, m.y, "STUNNED", "#0f766e");
                    m.blink = 15;
                    const oldSpeed = m.speed;
                    m.speed = 0; // Stun
                    setTimeout(() => m.speed = oldSpeed, 1500);
                    if (d > 0) {
                        m.x += (dx / d) * 100; m.y += (dy / d) * 100;
                    }
                }
            });
            break;
    }
    setTimeout(() => attackEffectRef.current = null, 300);

    // Special handling return
    if (championId === 'brunao') return { totalDamage: totalDamageDealt, heal: 60 };
    if (championId === 'dan') return { totalDamage: totalDamageDealt, heal: 150 };
    if (championId === 'foxz') return { totalDamage: totalDamageDealt, heal: totalDamageDealt * 0.3 };
    if (championId === 'peixe') return { totalDamage: totalDamageDealt, heal: 100 }; // Fake shield as heal

    return { totalDamage: totalDamageDealt };
};
