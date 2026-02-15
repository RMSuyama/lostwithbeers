import { PhysicsSystem } from './systems/PhysicsSystem';
import { getChamp } from './Champions';

export const castSkill = (championId, player, monsters, projectiles, mapData, damageList, attackEffectRef, skillIndex = 1) => {
    const champ = getChamp(championId);
    const levelBonus = 1 + (player.level * 0.25);
    const facingAngle = player.angle;
    const myPos = { x: player.x, y: player.y };

    attackEffectRef.current = { x: myPos.x, y: myPos.y, angle: facingAngle, time: Date.now(), type: skillIndex === 2 ? 'burst' : 'mystic' };

    const spawnDamage = (x, y, val, color) => damageList.push({ x, y, value: Math.floor(val), anim: 0, color });
    let totalDamageDealt = 0;

    // --- SKILL 1 LOGIC ---
    if (skillIndex === 1) {
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
                monsters.forEach(m => {
                    if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 250) {
                        const sdmg = 70 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#064e3b');
                        m.blink = 7;
                    }
                });
                break;
            case 'charles':
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
                projectiles.push({ x: myPos.x, y: myPos.y, angle: facingAngle, speed: 12, life: 2, dmg: 160 * levelBonus, big: true, color: '#10b981' });
                break;
            case 'kleyiton':
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
                monsters.forEach(m => {
                    const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                    if (d < 400) {
                        const sdmg = 200 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg;
                        m.blink = 15;
                        spawnDamage(m.x, m.y, "TAPA SECO!", "#ffffff");
                        spawnDamage(m.x, m.y - 20, sdmg, "#ef4444");
                        m.speed = 0;
                        setTimeout(() => m.speed = 2, 2000);
                    }
                });
                break;
            case 'milan':
                monsters.forEach(m => {
                    if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 240) {
                        const sdmg = 85 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#c026d3');
                    }
                });
                break;
            case 'enzo':
                // Riff Elétrico (Cone Damage)
                monsters.forEach(m => {
                    const dx = m.x - myPos.x, dy = m.y - myPos.y, d = Math.hypot(dx, dy);
                    if (d < 250) {
                        const angle = Math.atan2(dy, dx);
                        let diff = angle - facingAngle;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        if (Math.abs(diff) < 1.2) {
                            const sdmg = 95 * levelBonus;
                            m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#0ea5e9');
                        }
                    }
                });
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
                monsters.forEach(m => {
                    const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                    if (d < 350) {
                        const sdmg = 50 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg;
                        spawnDamage(m.x, m.y, "POISONED", "#a3e635");
                        m.blink = 10;
                        const oldSpeed = m.speed;
                        m.speed *= 0.4;
                        setTimeout(() => m.speed = oldSpeed, 3000);
                    }
                });
                break;
            case 'foxz':
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
                totalDamageDealt = 1;
                attackEffectRef.current = { x: myPos.x, y: myPos.y, angle: 0, time: Date.now(), type: 'nature' };
                break;
            case 'huntskan':
                monsters.forEach(m => {
                    const dx = m.x - myPos.x, dy = m.y - myPos.y, d = Math.hypot(dx, dy);
                    if (d < 200) {
                        const sdmg = 100 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg;
                        spawnDamage(m.x, m.y, "STUNNED", "#0f766e");
                        m.blink = 15;
                        const oldSpeed = m.speed;
                        m.speed = 0;
                        setTimeout(() => m.speed = oldSpeed, 1500);
                        if (d > 0) {
                            m.x += (dx / d) * 100; m.y += (dy / d) * 100;
                        }
                    }
                });
                break;
        }
    }
    // --- SKILL 2 LOGIC ---
    else if (skillIndex === 2) {
        switch (championId) {
            case 'jaca':
                monsters.forEach(m => {
                    if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 150) {
                        const sdmg = 40 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg);
                        const ang = Math.atan2(m.y - myPos.y, m.x - myPos.x);
                        m.x += Math.cos(ang) * 120; m.y += Math.sin(ang) * 120;
                    }
                });
                break;
            case 'djox':
                monsters.forEach(m => {
                    if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 250) {
                        m.speed *= 0.5;
                        setTimeout(() => m.speed *= 2, 2000);
                        spawnDamage(m.x, m.y, "SLOWED!", "#334155");
                    }
                });
                break;
            case 'brunao':
                return { totalDamage: 0, heal: 150 }; // Massive self-heal for Skill 2
            case 'jubarbie':
                projectiles.push({ x: myPos.x, y: myPos.y, angle: facingAngle, speed: 10, life: 1.5, dmg: 80 * levelBonus, color: '#3b82f6' });
                break;
            case 'enzo':
                // Overdrive (Teleport)
                const ex = myPos.x + Math.cos(facingAngle) * 350, ey = myPos.y + Math.sin(facingAngle) * 350;
                if (PhysicsSystem.canPass(ex, ey, 'skill', mapData)) {
                    return { totalDamage: 0, teleport: { x: ex, y: ey } };
                }
                break;
            default:
                // Generic Burst for others
                monsters.forEach(m => {
                    if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 200) {
                        const sdmg = 50 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#fff');
                    }
                });
                break;
        }
    }

    setTimeout(() => attackEffectRef.current = null, 300);

    // Special handling return (Skill 1)
    if (skillIndex === 1) {
        if (championId === 'brunao') return { totalDamage: totalDamageDealt, heal: 60 };
        if (championId === 'dan') return { totalDamage: totalDamageDealt, heal: 150 };
        if (championId === 'foxz') return { totalDamage: totalDamageDealt, heal: totalDamageDealt * 0.3 };
        if (championId === 'peixe') return { totalDamage: totalDamageDealt, heal: 100 };
    }

    return { totalDamage: totalDamageDealt };
};
