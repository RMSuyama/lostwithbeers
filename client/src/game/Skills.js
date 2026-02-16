import { PhysicsSystem } from './systems/PhysicsSystem';
import { getChamp } from './Champions';

export const castSkill = (championId, player, monsters, projectileSystem, statusSystem, mapData, damageList, attackEffectRef, skillIndex = 1) => {
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
            case 'gusto':
                // Gusto Skill 1: Bouncing Acid (Using new system)
                projectileSystem.spawn({
                    x: myPos.x, y: myPos.y, angle: facingAngle, speed: 10,
                    type: 'linear', ownerId: player.id, dmg: 160 * levelBonus,
                    lifetime: 2000, color: '#10b981'
                });
                break;
            case 'peixe':
                // Peixe Skill 1: Holy Burst + Stun
                monsters.forEach(m => {
                    const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                    if (d < 220) {
                        const sdmg = 130 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg;
                        spawnDamage(m.x, m.y, sdmg, "#fbbf24");
                        statusSystem.apply(m.id, { type: 'stun', duration: 1000, value: 1 });
                        m.blink = 12;
                    }
                });
                break;
            case 'dan':
                totalDamageDealt = 1;
                attackEffectRef.current = { x: myPos.x, y: myPos.y, angle: 0, time: Date.now(), type: 'nature' };
                break;
            case 'poisoncraft':
                // Poison Nova + Delayed Damage
                monsters.forEach(m => {
                    const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                    if (d < 350) {
                        const sdmg = 50 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg;
                        statusSystem.apply(m.id, { type: 'poison', duration: 4000, value: 10 });
                        spawnDamage(m.x, m.y, "POISONED", "#a3e635");
                        m.blink = 10;
                    }
                });
                break;
            case 'klebao':
                // Supremo Stun
                monsters.forEach(m => {
                    const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
                    if (d < 400) {
                        const sdmg = 200 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg;
                        statusSystem.apply(m.id, { type: 'stun', duration: 2500, value: 1 });
                        m.blink = 15;
                        spawnDamage(m.x, m.y, "TAPA SECO!", "#ffffff");
                        spawnDamage(m.x, m.y - 20, sdmg, "#ef4444");
                    }
                });
                break;
            case 'nadson':
                // Nadson Skill 1: Pyrotechnics (Piercing Fireball)
                projectileSystem.spawn({
                    x: myPos.x, y: myPos.y, angle: facingAngle, speed: 12,
                    type: 'linear', maxPierce: 5, ownerId: player.id, dmg: 150 * levelBonus,
                    lifetime: 1500, color: '#f97316'
                });
                break;
            default:
                // Generic close range for others (already implemented cases above)
                monsters.forEach(m => {
                    if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 200) {
                        const sdmg = 50 * levelBonus;
                        m.hp -= sdmg; totalDamageDealt += sdmg; spawnDamage(m.x, m.y, sdmg, '#fff');
                    }
                });
                break;
        }
    }
    // --- SKILL 2 LOGIC ---
    else if (skillIndex === 2) {
        switch (championId) {
            case 'bia':
                // Bia Skill 2: Star Dust (Boomerang Projectile!)
                projectileSystem.spawn({
                    x: myPos.x, y: myPos.y, angle: facingAngle, speed: 12,
                    type: 'boomerang', ownerId: player.id, dmg: 100 * levelBonus,
                    lifetime: 2500, color: '#f472b6'
                });
                break;
            case 'jubarbie':
                projectileSystem.spawn({
                    x: myPos.x, y: myPos.y, angle: facingAngle, speed: 10,
                    type: 'linear', ownerId: player.id, dmg: 80 * levelBonus,
                    lifetime: 1500, color: '#3b82f6'
                });
                break;
            case 'djox':
                // Djox Skill 2: Slow Area
                monsters.forEach(m => {
                    if (Math.hypot(m.x - myPos.x, m.y - myPos.y) < 250) {
                        statusSystem.apply(m.id, { type: 'slow', duration: 3000, value: 0.6 });
                        spawnDamage(m.x, m.y, "SLOWED!", "#334155");
                    }
                });
                break;
            case 'brunao':
                return { totalDamage: 0, heal: 150 };
            case 'enzo':
                // Overdrive (Teleport)
                const ex = myPos.x + Math.cos(facingAngle) * 350, ey = myPos.y + Math.sin(facingAngle) * 350;
                if (PhysicsSystem.canPass(ex, ey, 'skill', mapData)) {
                    return { totalDamage: 0, teleport: { x: ex, y: ey } };
                }
                break;
            case 'nadson':
                // Nadson Skill 2: Curvilinear Explosion (Multiple curving projectiles)
                for (let i = -1; i <= 1; i++) {
                    projectileSystem.spawn({
                        x: myPos.x, y: myPos.y, angle: facingAngle + (i * 0.3), speed: 8,
                        type: 'curve', curve: i * 2, ownerId: player.id, dmg: 120 * levelBonus,
                        lifetime: 2000, color: '#f97316'
                    });
                }
                break;
            default:
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

    // Self-Heals Handling
    if (skillIndex === 1) {
        if (championId === 'brunao') return { totalDamage: totalDamageDealt, heal: 60 };
        if (championId === 'dan') return { totalDamage: totalDamageDealt, heal: 150 };
        if (championId === 'peixe') return { totalDamage: totalDamageDealt, heal: 100 };
    }

    return { totalDamage: totalDamageDealt };
};
