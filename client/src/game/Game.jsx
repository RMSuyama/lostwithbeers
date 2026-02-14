import React, { useEffect, useRef, useState } from 'react';
import { MapRenderer, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './MapEngine';
import { supabase } from '../supabaseClient';
import MusicPlayer from '../components/Lobby/MusicPlayer';
import MobileControls from '../components/MobileControls';

// Champion Configuration - Porto Cast Roster
const CHAMPIONS = {
    jaca: { name: 'Jaca', color: '#15803d', hp: 100, mana: 40, basic: { range: 80, arc: 1.6, dmg: 28 }, skill: { name: 'Death Roll', cost: 15, cd: 4000 } },
    djox: { name: 'Djox', color: '#334155', hp: 140, mana: 50, basic: { range: 110, arc: 2.2, dmg: 20, kb: 30 }, skill: { name: 'Anchor Smash', cost: 20, cd: 6000 } },
    brunao: { name: 'Brunão', color: '#db2777', hp: 180, mana: 60, basic: { range: 70, arc: 1.4, dmg: 16, kb: 50 }, skill: { name: 'Guardian Aura', cost: 25, cd: 9000 } },
    jubarbie: { name: 'Jubarbie', color: '#1e3a8a', hp: 220, mana: 50, basic: { range: 130, arc: 2.6, dmg: 24 }, skill: { name: 'Heavy Splash', cost: 30, cd: 8000 } },
    shiryu: { name: 'Shiryu Suyama', color: '#064e3b', hp: 90, mana: 130, basic: { range: 250, arc: 0.6, dmg: 12, ranged: true }, skill: { name: 'Sopro Ancestral', cost: 35, cd: 6000 } },
    charles: { name: 'J. Charles', color: '#475569', hp: 80, mana: 70, basic: { range: 350, arc: 0.3, dmg: 20, ranged: true }, skill: { name: 'Bateria de Guerra', cost: 25, cd: 7000 } },
    gusto: { name: 'Gusto', color: '#78350f', hp: 150, mana: 60, basic: { range: 90, arc: 1.8, dmg: 22 }, skill: { name: 'Frasco Ácido', cost: 20, cd: 6000 } },
    kleyiton: { name: 'Kleyiton', color: '#b45309', hp: 110, mana: 90, basic: { range: 160, arc: 1.2, dmg: 18 }, skill: { name: 'Campo Geométrico', cost: 30, cd: 10000 } },
    milan: { name: 'Milan', color: '#4a044e', hp: 70, mana: 160, basic: { range: 190, arc: 2.0, dmg: 14 }, skill: { name: 'Blefe Espectral', cost: 25, cd: 5000 } },
    enzo: { name: 'Enzo', color: '#0369a1', hp: 90, mana: 50, basic: { range: 100, arc: 2.2, dmg: 17 }, skill: { name: 'Riff Elétrico', cost: 12, cd: 3000 } },
    mayron: { name: 'Mayron', color: '#0d9488', hp: 110, mana: 100, basic: { range: 170, arc: 2.4, dmg: 18 }, skill: { name: 'Corrente de Vento', cost: 25, cd: 6000 } },
    klebao: { name: 'Klebão', color: '#ffffff', hp: 200, mana: 100, basic: { range: 300, arc: 0.2, dmg: 35, ranged: true }, skill: { name: 'Julgamento Supremo', cost: 50, cd: 12000 } }
};

const BASE_POS = { x: 320, y: 320 };
const SPAWN_POS = { x: 3000, y: 3000 };

const Game = ({ roomId, playerName, championId, user, setInGame }) => {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const [players, setPlayers] = useState([]);
    const [isMounted, setIsMounted] = useState(false);
    const [gameState, setGameState] = useState('playing'); // playing, dead, over, victory
    const [showEscMenu, setShowEscMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const isHost = useRef(false);
    const activeVirtualKeys = useRef(new Set());

    // Refs for Loop performance & Fresh state
    const myPos = useRef({ x: 400, y: 400 });
    const facingAngle = useRef(0);
    const cameraRef = useRef({ x: 400, y: 400 });
    const monstersRef = useRef([]);
    const projectilesRef = useRef([]);
    const damageRef = useRef([]);
    const baseHpRef = useRef(1000);
    const waveStats = useRef({ current: 0, timer: 60, totalMobs: 0, deadMobs: 0 });
    const statsRef = useRef({
        hp: CHAMPIONS[championId]?.hp || 100,
        maxHp: CHAMPIONS[championId]?.hp || 100,
        mana: CHAMPIONS[championId]?.mana || 50,
        maxMana: CHAMPIONS[championId]?.mana || 50,
        atk: 1, // Start DMG 1
        range: CHAMPIONS[championId]?.basic?.range || 150,
        xp: 0, maxXp: 50, level: 1,
        totalDamage: 0, kills: 0
    });

    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('gameSettings');
        return saved ? JSON.parse(saved) : { showMyName: true, showMusicBtn: true };
    });
    const [showSettings, setShowSettings] = useState(false);

    const [uiStats, setUiStats] = useState({ ...statsRef.current });
    const [waveUi, setWaveUi] = useState({ current: 0, timer: 60, total: 0, dead: 0, baseHp: 1000 });

    const attackEffect = useRef(null);

    useEffect(() => {
        setIsMounted(true);
        if (!canvasRef.current) return;
        engineRef.current = new MapRenderer(canvasRef.current);

        // Detect Mobile
        setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);

        const resize = () => {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Check host status
        const fetchHost = async () => {
            const { data } = await supabase.from('players').select('is_host').eq('room_id', roomId).eq('name', playerName).single();
            if (data?.is_host) isHost.current = true;
        };
        fetchHost();

        // Subscriptions
        const channel = supabase.channel(`game_state:${roomId}`);
        channel.on('broadcast', { event: 'player_update' }, ({ payload }) => {
            if (payload.id === playerName) return;
            setPlayers(prev => {
                const idx = prev.findIndex(p => p.id === payload.id);
                if (idx === -1) return [...prev, payload];
                const next = [...prev];
                next[idx] = payload;
                return next;
            });
        }).on('broadcast', { event: 'wave_sync' }, ({ payload }) => {
            if (!isHost.current) {
                waveStats.current = payload.wave;
                baseHpRef.current = payload.baseHp;
            }
        }).subscribe();

        const broadcastInterval = setInterval(() => {
            if (gameState === 'playing') {
                channel.send({
                    type: 'broadcast',
                    event: 'player_update',
                    payload: {
                        id: playerName, x: myPos.current.x, y: myPos.current.y,
                        angle: facingAngle.current,
                        name: playerName, color: CHAMPIONS[championId].color, championId,
                        hp: statsRef.current.hp, maxHp: statsRef.current.maxHp,
                        totalDamage: statsRef.current.totalDamage, kills: statsRef.current.kills
                    }
                });
            }
            if (isHost.current) {
                channel.send({
                    type: 'broadcast',
                    event: 'wave_sync',
                    payload: { wave: waveStats.current, baseHp: baseHpRef.current }
                });
            }
        }, 50);

        let animationFrame;
        let lastTime = Date.now();
        const loop = () => {
            const now = Date.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            if (gameState === 'over') return;

            // Camera follow
            const lerp = 0.12;
            cameraRef.current.x += (myPos.current.x - cameraRef.current.x) * lerp;
            cameraRef.current.y += (myPos.current.y - cameraRef.current.y) * lerp;

            // Sync UI State
            if (Math.random() < 0.1) {
                setUiStats({ ...statsRef.current });
                setWaveUi({
                    current: waveStats.current.current,
                    timer: waveStats.current.timer,
                    total: waveStats.current.totalMobs,
                    dead: waveStats.current.deadMobs,
                    baseHp: baseHpRef.current
                });
            }

            // Wave Timer Logic (Host Only)
            if (isHost.current) {
                if (waveStats.current.timer > 0) {
                    waveStats.current.timer -= dt;
                } else if (waveStats.current.deadMobs >= waveStats.current.totalMobs) {
                    startNextWave();
                }
            }

            // Projectiles Logic
            projectilesRef.current = projectilesRef.current.filter(p => {
                p.x += Math.cos(p.angle) * p.speed;
                p.y += Math.sin(p.angle) * p.speed;
                p.life -= dt;

                monstersRef.current.forEach((m, mIndex) => {
                    const dist = Math.hypot(m.x - p.x, m.y - p.y);
                    if (dist < 30) {
                        m.hp -= p.dmg;
                        statsRef.current.totalDamage += p.dmg;
                        spawnDamage(m.x, m.y, p.dmg);
                        p.life = 0;
                        if (m.hp <= 0) {
                            monstersRef.current.splice(mIndex, 1);
                            gainXp(2);
                            statsRef.current.kills++;
                        }
                    }
                });
                return p.life > 0;
            });

            // Monster AI & Combat
            monstersRef.current = monstersRef.current.filter(m => {
                if (m.hp <= 0) {
                    waveStats.current.deadMobs++;
                    statsRef.current.kills++;
                    gainXp(2);
                    return false;
                }

                const distPlayer = Math.hypot(myPos.current.x - m.x, myPos.current.y - m.y);
                const dxBase = BASE_POS.x - m.x;
                const dyBase = BASE_POS.y - m.y;
                const distBase = Math.hypot(dxBase, dyBase);

                // Aggro / Chasing
                if (distPlayer < 400 && gameState === 'playing') {
                    const angle = Math.atan2(myPos.current.y - m.y, myPos.current.x - m.x);
                    m.x += Math.cos(angle) * m.speed;
                    m.y += Math.sin(angle) * m.speed;

                    // Attack Player
                    if (distPlayer < 40) {
                        if (!m.lastAttack || now - m.lastAttack > 1200) {
                            statsRef.current.hp = Math.max(0, statsRef.current.hp - 10);
                            m.lastAttack = now;
                            spawnDamage(myPos.current.x, myPos.current.y, 10);
                            if (statsRef.current.hp <= 0) setGameState('dead');
                        }
                    }
                } else {
                    // Move toward Base
                    if (distBase > 60) {
                        const angle = Math.atan2(dyBase, dxBase);
                        m.x += Math.cos(angle) * m.speed;
                        m.y += Math.sin(angle) * m.speed;
                    } else {
                        // Attack Base
                        if (!m.lastAttack || now - m.lastAttack > 1500) {
                            baseHpRef.current -= 15;
                            m.lastAttack = now;
                            spawnDamage(BASE_POS.x, BASE_POS.y, 15);
                            if (baseHpRef.current <= 0) setGameState('over');
                        }
                    }
                }
                return true;
            });

            // Entity Pushing Physics (Player <-> Monsters)
            monstersRef.current.forEach(m => {
                const dx = m.x - myPos.current.x;
                const dy = m.y - myPos.current.y;
                const dist = Math.hypot(dx, dy);
                const combinedRadius = 35; // Player 20 + Monster 15
                if (dist < combinedRadius && dist > 0) {
                    const overlap = combinedRadius - dist;
                    const angle = Math.atan2(dy, dx);
                    // Push player back slightly, push monster more
                    myPos.current.x -= Math.cos(angle) * (overlap * 0.3);
                    myPos.current.y -= Math.sin(angle) * (overlap * 0.3);
                    m.x += Math.cos(angle) * (overlap * 0.7);
                    m.y += Math.sin(angle) * (overlap * 0.7);
                }
            });

            // Monster <-> Monster pushing
            for (let i = 0; i < monstersRef.current.length; i++) {
                for (let j = i + 1; j < monstersRef.current.length; j++) {
                    const m1 = monstersRef.current[i];
                    const m2 = monstersRef.current[j];
                    const dx = m2.x - m1.x;
                    const dy = m2.y - m1.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 30 && dist > 0) {
                        const overlap = 30 - dist;
                        const angle = Math.atan2(dy, dx);
                        m1.x -= Math.cos(angle) * overlap * 0.5;
                        m1.y -= Math.sin(angle) * overlap * 0.5;
                        m2.x += Math.cos(angle) * overlap * 0.5;
                        m2.y += Math.sin(angle) * overlap * 0.5;
                    }
                }
            }

            // Damage Numbers
            damageRef.current = damageRef.current
                .map(d => ({ ...d, anim: d.anim + 1.5 }))
                .filter(d => d.anim < 60);

            // Collisions
            resolveCollisions();

            if (engineRef.current) {
                const me = {
                    id: playerName, x: myPos.current.x, y: myPos.current.y,
                    angle: facingAngle.current,
                    name: playerName, color: CHAMPIONS[championId].color, championId,
                    hp: statsRef.current.hp, maxHp: statsRef.current.maxHp, walkTimer: now * 0.005
                };
                engineRef.current.draw(
                    [...players, me],
                    cameraRef.current,
                    [], // Dummies
                    monstersRef.current,
                    projectilesRef.current,
                    damageRef.current,
                    attackEffect.current,
                    baseHpRef.current,
                    1000,
                    [{ x: SPAWN_POS.x, y: SPAWN_POS.y, timer: waveUi.timer }]
                );
            }
            animationFrame = requestAnimationFrame(loop);
        };
        loop();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
            clearInterval(broadcastInterval);
            supabase.removeChannel(channel);
        };
    }, [roomId, playerName, championId, gameState]);


    const startNextWave = () => {
        waveStats.current.current++;
        waveStats.current.timer = 60;
        const count = 5 + (waveStats.current.current * 4);
        waveStats.current.totalMobs = count;
        waveStats.current.deadMobs = 0;

        for (let i = 0; i < count; i++) {
            const offset = i * 200;
            setTimeout(() => {
                monstersRef.current.push({
                    id: `w-${waveStats.current.current}-${i}`,
                    x: SPAWN_POS.x + (Math.random() - 0.5) * 150,
                    y: SPAWN_POS.y + (Math.random() - 0.5) * 150,
                    type: Math.random() > 0.4 ? 'orc' : 'slime',
                    hp: 50 + (waveStats.current.current * 25),
                    maxHp: 50 + (waveStats.current.current * 25),
                    speed: 1.5 + Math.random() * 0.5,
                });
            }, offset);
        }
    };

    const resolveCollisions = () => {
        const pR = 18; const mR = 15;
        monstersRef.current.forEach(m => {
            const dx = m.x - myPos.current.x; const dy = m.y - myPos.current.y;
            const dist = Math.hypot(dx, dy);
            if (dist < pR + mR && dist > 0) {
                const overlap = (pR + mR) - dist;
                const angle = Math.atan2(dy, dx);
                m.x += Math.cos(angle) * overlap; m.y += Math.sin(angle) * overlap;
            }
        });
    };

    // Input Controller
    useEffect(() => {
        const keys = {};
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'escape') { setShowEscMenu(prev => !prev); return; }
            keys[key] = true;
            if (gameState !== 'playing' || showEscMenu) return;
            if (key === 'a') basicAttack();
            if (key === 'q') useSkill();
            if (key === ' ') dash();
        };
        const handleKeyUp = (e) => keys[e.key.toLowerCase()] = false;

        const moveLoop = setInterval(() => {
            if (gameState !== 'playing' || showEscMenu) return;
            const speed = 5; let mx = 0, my = 0;
            const vKeys = activeVirtualKeys.current;

            if (keys['arrowup'] || vKeys.has('ArrowUp')) my -= speed;
            if (keys['arrowdown'] || vKeys.has('ArrowDown')) my += speed;
            if (keys['arrowleft'] || vKeys.has('ArrowLeft')) mx -= speed;
            if (keys['arrowright'] || vKeys.has('ArrowRight')) mx += speed;

            if (mx !== 0 || my !== 0) {
                myPos.current.x = Math.max(0, Math.min(MAP_WIDTH * TILE_SIZE, myPos.current.x + mx));
                myPos.current.y = Math.max(0, Math.min(MAP_HEIGHT * TILE_SIZE, myPos.current.y + my));
                facingAngle.current = Math.atan2(my, mx);
            }
        }, 16);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            clearInterval(moveLoop);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [championId, gameState, showEscMenu]);

    const basicAttack = () => {
        const champ = CHAMPIONS[championId];
        const angle = facingAngle.current;
        const levelBonus = 1 + (statsRef.current.level * 0.2);
        const dmg = champ.basic.dmg * levelBonus;

        attackEffect.current = { x: myPos.current.x, y: myPos.current.y, angle, time: Date.now(), type: championId };
        setTimeout(() => attackEffect.current = null, 150);

        if (champ.basic.ranged) {
            projectilesRef.current.push({ x: myPos.current.x, y: myPos.current.y, angle, speed: 10, life: 1.5, dmg, color: champ.color });
            return;
        }

        monstersRef.current.forEach(m => {
            const dx = m.x - myPos.current.x; const dy = m.y - myPos.current.y;
            const dist = Math.hypot(dx, dy);
            if (dist < champ.basic.range + 20) {
                const targetAngle = Math.atan2(dy, dx);
                let diff = targetAngle - angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                if (Math.abs(diff) < champ.basic.arc / 2) {
                    m.hp -= dmg; statsRef.current.totalDamage += dmg; spawnDamage(m.x, m.y, dmg);
                    if (champ.basic.kb) {
                        m.x += Math.cos(targetAngle) * champ.basic.kb; m.y += Math.sin(targetAngle) * champ.basic.kb;
                    }
                }
            }
        });
    };

    const useSkill = () => {
        const champ = CHAMPIONS[championId];
        if (statsRef.current.mana < champ.skill.cost) return;
        statsRef.current.mana -= champ.skill.cost;
        const levelBonus = 1 + (statsRef.current.level * 0.25);

        attackEffect.current = { x: myPos.current.x, y: myPos.current.y, angle: facingAngle.current, time: Date.now(), type: 'mystic' };

        switch (championId) {
            case 'jaca':
                monstersRef.current.forEach(m => {
                    const d = Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y);
                    if (d < 120) {
                        const sdmg = 65 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg);
                        m.x += (Math.random() - 0.5) * 60;
                    }
                });
                break;
            case 'djox':
                monstersRef.current.forEach(m => {
                    const dx = m.x - myPos.current.x, dy = m.y - myPos.current.y, d = Math.hypot(dx, dy);
                    if (d < 180) {
                        const sdmg = 90 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg);
                        m.x += (dx / d) * 120; m.y += (dy / d) * 120;
                    }
                });
                break;
            case 'brunao':
                statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + 60);
                monstersRef.current.forEach(m => {
                    if (Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y) < 220) {
                        const sdmg = 40 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg);
                    }
                });
                break;
            case 'jubarbie':
                monstersRef.current.forEach(m => {
                    if (Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y) < 300) {
                        const sdmg = 120 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg);
                    }
                });
                break;
            case 'shiryu':
                // Mystic blast / AoE
                monstersRef.current.forEach(m => {
                    if (Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y) < 250) {
                        const sdmg = 70 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg, '#064e3b');
                    }
                });
                break;
            case 'charles':
                // Bateria de Guerra (Shockwave)
                monstersRef.current.forEach(m => {
                    if (Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y) < 350) {
                        const sdmg = 45 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg, '#475569');
                        const ang = Math.atan2(m.y - myPos.current.y, m.x - myPos.current.x);
                        m.x += Math.cos(ang) * 100; m.y += Math.sin(ang) * 100;
                    }
                });
                break;
            case 'gusto':
                // Alchemist Blast (Big projectile)
                projectilesRef.current.push({ x: myPos.current.x, y: myPos.current.y, angle: facingAngle.current, speed: 12, life: 2, dmg: 160 * levelBonus, big: true, color: '#10b981' });
                break;
            case 'kleyiton':
                // Geometric Barrier (AoE DMG + minor push)
                monstersRef.current.forEach(m => {
                    const d = Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y);
                    if (d < 300) {
                        const sdmg = 55 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg, '#c084fc');
                        const ang = Math.atan2(m.y - myPos.current.y, m.x - myPos.current.x);
                        m.x += Math.cos(ang) * 50; m.y += Math.sin(ang) * 50;
                    }
                });
                break;
            case 'klebao':
                // JULGAMENTO SUPREMO (Massive Area Stun/DMG)
                monstersRef.current.forEach(m => {
                    const d = Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y);
                    if (d < 400) {
                        const sdmg = 200 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg;
                        spawnDamage(m.x, m.y, "TAPA SECO!", "#ffffff");
                        spawnDamage(m.x, m.y - 20, sdmg, "#ef4444");
                        m.speed = 0; // Stun
                        setTimeout(() => m.speed = 2, 2000);
                    }
                });
                break;
            case 'milan':
                // Card blast
                monstersRef.current.forEach(m => {
                    if (Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y) < 240) {
                        const sdmg = 85 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg, '#c026d3');
                    }
                });
                break;
            case 'enzo':
                // Dash
                const ex = myPos.current.x + Math.cos(facingAngle.current) * 300, ey = myPos.current.y + Math.sin(facingAngle.current) * 300;
                myPos.current.x = Math.max(0, Math.min(MAP_WIDTH * TILE_SIZE, ex)); myPos.current.y = Math.max(0, Math.min(MAP_HEIGHT * TILE_SIZE, ey));
                break;
            case 'mayron':
                monstersRef.current.forEach(m => {
                    const dx = m.x - myPos.current.x, dy = m.y - myPos.current.y, d = Math.hypot(dx, dy);
                    if (d < 280) {
                        const sdmg = 65 * levelBonus;
                        m.hp -= sdmg; statsRef.current.totalDamage += sdmg; spawnDamage(m.x, m.y, sdmg, '#0d9488');
                        m.x -= (dx / d) * 180; m.y -= (dy / d) * 180;
                    }
                });
                break;
        }
        setTimeout(() => attackEffect.current = null, 300);
    };

    const dash = () => {
        const ddist = 140;
        myPos.current.x = Math.max(0, Math.min(MAP_WIDTH * TILE_SIZE, myPos.current.x + Math.cos(facingAngle.current) * ddist));
        myPos.current.y = Math.max(0, Math.min(MAP_HEIGHT * TILE_SIZE, myPos.current.y + Math.sin(facingAngle.current) * ddist));
    };

    const spawnDamage = (x, y, val) => damageRef.current.push({ x, y, value: Math.floor(val), anim: 0 });

    const gainXp = (amount) => {
        statsRef.current.xp += amount;
        if (statsRef.current.xp >= statsRef.current.maxXp) {
            statsRef.current.level++;
            statsRef.current.xp -= statsRef.current.maxXp;
            statsRef.current.maxXp = Math.floor(statsRef.current.maxXp * 1.5);
            statsRef.current.maxHp += 20;
            statsRef.current.hp = statsRef.current.maxHp;
            statsRef.current.atk += 1;
            statsRef.current.range += 1;
            spawnDamage(myPos.current.x, myPos.current.y, "LEVEL UP!", "#ffd700");
        }
    };

    const savePlayerStats = async () => {
        if (!user?.id) return;
        try {
            await supabase.rpc('update_player_stats', {
                p_user_id: user?.id,
                p_kills: statsRef.current.kills,
                p_damage: Math.floor(statsRef.current.totalDamage),
                p_wave: waveStats.current.current,
                p_champion_id: championId
            });
        } catch (error) {
            console.error('Error saving player stats:', error);
        }
    };

    // Auto Cleanup Rooms
    useEffect(() => {
        if (!isHost.current) return;
        const cleanup = setInterval(async () => {
            const { data: activePlayers } = await supabase.from('players').select('id').eq('room_id', roomId);
            if (!activePlayers || activePlayers.length === 0) {
                await supabase.from('rooms').delete().eq('id', roomId);
            }
        }, 10000);
        return () => clearInterval(cleanup);
    }, [roomId]);

    const handleExitToLobby = async () => {
        // Save stats before leaving
        await savePlayerStats();

        // Clean up presence
        try {
            await supabase.from('players').delete().eq('room_id', roomId).eq('name', playerName);
        } catch (error) {
            console.error('Error cleaning up player:', error);
        }

        // Return to lobby
        if (setInGame) {
            setInGame(false);
        } else {
            window.location.reload(); // Fallback
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#000', fontFamily: 'VT323' }}>
            <canvas ref={canvasRef} onMouseDown={() => !showEscMenu && basicAttack()} style={{ background: '#1e3a1a', display: 'block', width: '100vw', height: '100vh', cursor: showEscMenu ? 'default' : 'crosshair' }} />

            {showEscMenu && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ background: '#1a1a1a', border: '5px solid #ffd700', padding: '40px 60px', textAlign: 'center', boxShadow: '0 0 40px rgba(255,215,0,0.5)' }}>
                        <h1 style={{ fontSize: '4rem', color: '#ffd700', margin: '0 0 30px 0' }}>MENU</h1>
                        <button onClick={() => setShowEscMenu(false)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '15px 40px', fontSize: '2rem', fontFamily: 'VT323', cursor: 'pointer', marginBottom: '15px', width: '100%', boxShadow: '4px 4px #000' }}>RETOMAR JOGO</button>
                        <button onClick={handleExitToLobby} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '15px 40px', fontSize: '2rem', fontFamily: 'VT323', cursor: 'pointer', width: '100%', boxShadow: '4px 4px #000' }}>SAIR PARA O LOBBY</button>
                    </div>
                </div>
            )}

            <div style={{ position: 'fixed', top: '15px', right: '15px', background: 'rgba(0,0,0,0.85)', border: '3px solid #ffd700', padding: '10px', color: '#fff', textAlign: 'right', zIndex: 10 }}>
                <div style={{ fontSize: '1.6rem', color: '#ffd700' }}>WAVE {waveUi.current}</div>
                <div style={{ fontSize: '1rem' }}>ALVOS: {waveUi.dead} / {waveUi.total}</div>
                {waveUi.timer > 0 && <div style={{ fontSize: '1.2rem', color: '#ef4444' }}>COOLDOWN: {Math.ceil(waveUi.timer)}s</div>}
                {isHost.current && waveUi.timer > 0 && <button onClick={() => waveStats.current.timer = 0} style={{ background: '#ffd700', border: 'none', padding: '5px 10px', marginTop: '6px', fontFamily: 'VT323', cursor: 'pointer' }}>PULAR »</button>}
            </div>

            <div style={{ position: 'fixed', top: '15px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', border: '3px solid #fff', padding: '6px 20px', textAlign: 'center' }}>
                <div style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px' }}>HP DO BAR: {Math.ceil(waveUi.baseHp)} / 1000</div>
                <div style={{ width: '250px', height: '12px', background: '#333' }}><div style={{ width: `${(waveUi.baseHp / 1000) * 100}%`, height: '100%', background: '#22c55e' }} /></div>
            </div>

            <div style={{ position: 'fixed', bottom: '15px', left: '15px', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ color: '#ffd700', fontSize: '1.6rem' }}>LV {uiStats.level} {playerName.toUpperCase()} ({CHAMPIONS[championId].name})</div>
                <div style={{ width: '200px', height: '20px', background: '#222', border: '3px solid #fff', position: 'relative' }}>
                    <div style={{ width: `${(uiStats.hp / uiStats.maxHp) * 100}%`, height: '100%', background: '#ef4444' }} />
                    <div style={{ position: 'absolute', inset: 0, textAlign: 'center', color: '#fff' }}>{Math.ceil(uiStats.hp)} HP</div>
                </div>
                <div style={{ width: '150px', height: '12px', background: '#222', border: '2px solid #fff' }}>
                    <div style={{ width: `${(uiStats.mana / uiStats.maxMana) * 100}%`, height: '100%', background: '#3b82f6' }} />
                </div>
            </div>

            <div className="hide-mobile" style={{ position: 'fixed', bottom: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                <div style={{ width: '45px', height: '45px', border: '3px solid #ffd700', background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <span style={{ fontSize: '0.7rem' }}>Q</span><span style={{ fontSize: '0.8rem' }}>SKILL</span>
                </div>
                {['W', 'E', 'R'].map(k => <div key={k} style={{ width: '45px', height: '45px', border: '3px solid #444', background: 'rgba(0,0,0,0.4)', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k}</div>)}
            </div>

            {gameState !== 'playing' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, color: '#fff', textAlign: 'center', fontFamily: 'VT323' }}>
                    <h1 style={{ fontSize: '5rem', color: '#ef4444' }}>{gameState === 'dead' ? 'VOCÊ CAIU!' : 'DERROTA'}</h1>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', maxWidth: '800px', width: '90%', background: '#111', border: '4px solid #ffd700', padding: '25px', boxShadow: '10px 10px #000' }}>
                        <div style={{ textAlign: 'left', borderRight: '2px solid #333', paddingRight: '20px' }}>
                            <h2 style={{ color: '#ffd700', borderBottom: '2px solid #ffd700', marginBottom: '15px' }}>SEUS STATUS</h2>
                            <p>CAMPEÃO: {CHAMPIONS[championId].name}</p>
                            <p>NÍVEL: {uiStats.level}</p>
                            <p>ABATES: {statsRef.current.kills}</p>
                            <p>DANO: {Math.floor(statsRef.current.totalDamage)}</p>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h2 style={{ color: '#ffd700', borderBottom: '2px solid #ffd700', marginBottom: '15px' }}>REINO (TOP DMG)</h2>
                            <p>WAVES: {waveUi.current - 1}</p>
                            <div style={{ fontSize: '1rem', marginTop: '10px' }}>
                                {[...players, { id: 'me', name: playerName, totalDamage: statsRef.current.totalDamage }]
                                    .sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0)).map((p, i) => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', color: p.id === 'me' ? '#ffd700' : '#fff' }}>
                                            <span>{i + 1}. {p.name}</span><span>{Math.floor(p.totalDamage || 0)}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
                        {gameState === 'dead' && <button onClick={() => { statsRef.current.hp = statsRef.current.maxHp; setGameState('playing') }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '15px 35px', fontSize: '1.8rem', fontFamily: 'VT323', cursor: 'pointer' }}>PRÓXIMA WAVE</button>}
                        <button onClick={handleExitToLobby} style={{ background: '#ffd700', border: 'none', padding: '15px 35px', fontSize: '1.8rem', fontFamily: 'VT323', cursor: 'pointer' }}>SAIR</button>
                    </div>
                </div>
            )}

            {/* Music Player */}
            {settings.showMusicBtn && <MusicPlayer />}

            {/* Settings Toggle */}
            <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid #ffd700',
                    color: '#ffd700',
                    padding: '8px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    zIndex: 200,
                    fontFamily: 'VT323'
                }}
            >
                SETTINGS
            </button>

            {/* Settings Modal */}
            {showSettings && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#1a1a1a',
                    border: '4px solid #ffd700',
                    padding: '20px',
                    zIndex: 300,
                    fontFamily: 'VT323',
                    color: '#fff',
                    maxWidth: '300px',
                    width: '90%'
                }}>
                    <h2 style={{ color: '#ffd700', marginTop: 0 }}>OPÇÕES DO REINO</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                checked={settings.showMyName}
                                onChange={(e) => {
                                    const newSet = { ...settings, showMyName: e.target.checked };
                                    setSettings(newSet);
                                    localStorage.setItem('gameSettings', JSON.stringify(newSet));
                                }}
                            />
                            MOSTRAR MEU NOME
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                checked={settings.showMusicBtn}
                                onChange={(e) => {
                                    const newSet = { ...settings, showMusicBtn: e.target.checked };
                                    setSettings(newSet);
                                    localStorage.setItem('gameSettings', JSON.stringify(newSet));
                                }}
                            />
                            BOTÃO DE MÚSICA
                        </label>
                    </div>
                    <button
                        onClick={() => setShowSettings(false)}
                        className="btn-primary"
                        style={{ marginTop: '20px', width: '100%' }}
                    >
                        FECHAR
                    </button>
                </div>
            )}
            {/* Next Wave Button (Host Only) */}
            {isHost.current && monstersRef.current.length === 0 && (
                <button
                    onClick={() => supabase.from('rooms').update({ wave: waveStats.current.current + 1 }).eq('id', roomId)}
                    className="btn-primary"
                    style={{ background: '#166534', marginTop: '10px' }}
                >
                    PRÓXIMA ONDA ⚔️
                </button>
            )}

            {/* Mobile Controls */}
            {isMobile && (
                <MobileControls
                    onInput={(vKeys) => {
                        activeVirtualKeys.current = vKeys;
                    }}
                    onAction={(action) => {
                        if (action === 'attack') basicAttack();
                        if (action === 'skill') useSkill();
                        if (action === 'dash') dash();
                    }}
                />
            )}

            {/* Minimap (showing entities) */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '20px',
                width: '120px',
                height: '120px',
                background: 'rgba(0,0,0,0.5)',
                border: '2px solid rgba(255,255,255,0.3)',
                zIndex: 50,
                pointerEvents: 'none'
            }} className="hide-mobile">
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {/* Me */}
                    <div style={{
                        position: 'absolute',
                        left: `${(myPos.current.x / (MAP_WIDTH * TILE_SIZE)) * 100}%`,
                        top: `${(myPos.current.y / (MAP_HEIGHT * TILE_SIZE)) * 100}%`,
                        width: '4px', height: '4px', background: '#3b82f6', borderRadius: '50%'
                    }} />
                    {/* Monsters */}
                    {monstersRef.current.map(m => (
                        <div key={m.id} style={{
                            position: 'absolute',
                            left: `${(m.x / (MAP_WIDTH * TILE_SIZE)) * 100}%`,
                            top: `${(m.y / (MAP_HEIGHT * TILE_SIZE)) * 100}%`,
                            width: '2px', height: '2px', background: '#ef4444'
                        }} />
                    ))}
                    {/* Base */}
                    <div style={{
                        position: 'absolute',
                        left: `${(BASE_POS.x / (MAP_WIDTH * TILE_SIZE)) * 100}%`,
                        top: `${(BASE_POS.y / (MAP_HEIGHT * TILE_SIZE)) * 100}%`,
                        width: '6px', height: '6px', background: '#ffd700', borderRadius: '2px', transform: 'translate(-50%, -50%)'
                    }} />
                </div>
            </div>
        </div>
    );
};

export default Game;
