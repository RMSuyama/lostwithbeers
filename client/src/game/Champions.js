import { TILE_SIZE } from './constants';

// Champion Stats & Configuration
export const CHAMPIONS = {
    jaca: {
        name: 'Jaca', color: '#15803d', hp: 100, mana: 40,
        basic: { range: 80, arc: 1.6, dmg: 1 },
        skill: { name: 'Death Roll', cost: 15, cd: 4000 },
        skill2: { name: 'Tail Swipe', cost: 10, cd: 3000 }
    },
    djox: {
        name: 'Djox', color: '#334155', hp: 140, mana: 50,
        basic: { range: 110, arc: 2.2, dmg: 1, kb: 30 },
        skill: { name: 'Anchor Smash', cost: 20, cd: 6000 },
        skill2: { name: 'Heavy Chain', cost: 12, cd: 4000 }
    },
    brunao: {
        name: 'Brunão', color: '#db2777', hp: 180, mana: 60,
        basic: { range: 70, arc: 1.4, dmg: 1, kb: 50 },
        skill: { name: 'Guardian Aura', cost: 25, cd: 9000 },
        skill2: { name: 'Holy Shield', cost: 15, cd: 5000 }
    },
    jubarbie: {
        name: 'Jubarbie', color: '#1e3a8a', hp: 220, mana: 50,
        basic: { range: 130, arc: 2.6, dmg: 1 },
        skill: { name: 'Heavy Splash', cost: 30, cd: 8000 },
        skill2: { name: 'Water Jet', cost: 15, cd: 4000 }
    },
    shiryu: {
        name: 'Shiryu Suyama', color: '#064e3b', hp: 90, mana: 130,
        basic: { range: 250, arc: 0.6, dmg: 1, ranged: true, proj: { maxPierce: 2 } },
        skill: { name: 'Sopro Ancestral', cost: 35, cd: 6000 },
        skill2: { name: 'Dragon Breath', cost: 20, cd: 5000 }
    },
    charles: {
        name: 'J. Charles', color: '#475569', hp: 80, mana: 70,
        basic: { range: 350, arc: 0.3, dmg: 1, ranged: true, proj: { type: 'chain', bounce: 5 } },
        skill: { name: 'Bateria de Guerra', cost: 25, cd: 7000 },
        skill2: { name: 'Artillery Strike', cost: 15, cd: 4000 }
    },
    gusto: {
        name: 'Gusto', color: '#78350f', hp: 150, mana: 60,
        basic: { range: 90, arc: 1.8, dmg: 1 },
        skill: { name: 'Frasco Ácido', cost: 20, cd: 6000 },
        skill2: { name: 'Toxic Cloud', cost: 15, cd: 5000 }
    },
    kleyiton: {
        name: 'Kleyiton', color: '#b45309', hp: 110, mana: 90,
        basic: { range: 160, arc: 1.2, dmg: 1 },
        skill: { name: 'Campo Geométrico', cost: 30, cd: 10000 },
        skill2: { name: 'Prism Blast', cost: 15, cd: 3000 }
    },
    milan: {
        name: 'Milan', color: '#4a044e', hp: 70, mana: 160,
        basic: { range: 190, arc: 2.0, dmg: 1, ranged: true, proj: { type: 'lastHitReturn' } },
        skill: { name: 'Blefe Espectral', cost: 25, cd: 5000 },
        skill2: { name: 'Card Trick', cost: 10, cd: 2000 }
    },
    enzo: {
        name: 'Enzo', color: '#0369a1', hp: 90, mana: 50,
        basic: { range: 100, arc: 2.2, dmg: 1 },
        skill: { name: 'Riff Elétrico', cost: 12, cd: 3000 },
        skill2: { name: 'Overdrive', cost: 20, cd: 8000 }
    },
    mayron: {
        name: 'Mayron', color: '#0d9488', hp: 110, mana: 100,
        basic: { range: 170, arc: 2.4, dmg: 1 },
        skill: { name: 'Tide Wave', cost: 25, cd: 6000 },
        skill2: { name: 'Whirlpool', cost: 15, cd: 4000 }
    },
    klebao: {
        name: 'Klebão', color: '#ffffff', hp: 200, mana: 100,
        basic: { range: 300, arc: 0.2, dmg: 1, ranged: true, proj: { maxPierce: 5 } },
        skill: { name: 'Julgamento Supremo', cost: 50, cd: 12000 },
        skill2: { name: 'Mao de Deus', cost: 20, cd: 5000 }
    },
    poisoncraft: {
        name: 'Poisoncraft', color: '#4d7c0f', hp: 100, mana: 120,
        basic: { range: 250, arc: 0.5, dmg: 1, ranged: true, proj: { maxPierce: 3 } },
        skill: { name: 'Venom Nova', cost: 40, cd: 8000 },
        skill2: { name: 'Plague Bolt', cost: 10, cd: 3000 }
    },
    foxz: {
        name: 'Foxz', color: '#7e22ce', hp: 90, mana: 140,
        basic: { range: 300, arc: 0.4, dmg: 1, ranged: true, proj: { type: 'curve', curve: -1.5 } },
        skill: { name: 'Soul Drain', cost: 35, cd: 7000 },
        skill2: { name: 'Dark Pact', cost: 20, cd: 6000 }
    },
    peixe: {
        name: 'Peixe', color: '#fbbf24', hp: 160, mana: 80,
        basic: { range: 90, arc: 1.8, dmg: 1 },
        skill: { name: 'Holy Burst', cost: 25, cd: 6000 },
        skill2: { name: 'Blessed Shield', cost: 15, cd: 4000 }
    },
    dan: {
        name: 'Dan', color: '#16a34a', hp: 110, mana: 150,
        basic: { range: 220, arc: 0.6, dmg: 1, ranged: true, proj: { type: 'boomerang' } },
        skill: { name: 'Rejuvenation', cost: 45, cd: 12000 },
        skill2: { name: 'Nature Grace', cost: 15, cd: 5000 }
    },
    huntskan: {
        name: 'Huntskan', color: '#0f766e', hp: 180, mana: 60,
        basic: { range: 110, arc: 2.2, dmg: 1, kb: 40 },
        skill: { name: 'Slithereen Crush', cost: 25, cd: 5000 },
        skill2: { name: 'Hunter Mark', cost: 10, cd: 3000 }
    },
    bia: {
        name: 'Bia', color: '#f472b6', hp: 120, mana: 120,
        basic: { range: 250, arc: 0.8, dmg: 1.2, ranged: true, proj: { type: 'boomerang' } },
        skill: { name: 'Encanto de Fada', cost: 30, cd: 7000 },
        skill2: { name: 'Pó de Estrela', cost: 40, cd: 10000 }
    },
    nadson: {
        name: 'Nadson', color: '#f97316', hp: 100, mana: 80,
        basic: { range: 300, arc: 0.5, dmg: 1, ranged: true, proj: { type: 'curve', curve: 2.2 } },
        skill: { name: 'Pirotecnia', cost: 20, cd: 5000 },
        skill2: { name: 'Explosão Curvilínea', cost: 30, cd: 8000 }
    },
    espirro: {
        name: 'Espirro', color: '#dc2626', hp: 130, mana: 70,
        basic: { range: 95, arc: 1.5, dmg: 1.1, kb: 35 },
        skill: { name: 'Chute Giratório', cost: 18, cd: 4500 },
        skill2: { name: 'Tornado Kick', cost: 25, cd: 7000 }
    }
};

// Aliases
CHAMPIONS.shiryusuyama = CHAMPIONS.shiryu;
CHAMPIONS.rafarofa = CHAMPIONS.charles;

export const getChamp = (id) => CHAMPIONS[id] || CHAMPIONS.jaca;


