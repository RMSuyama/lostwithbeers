import React, { useEffect, useRef, useState } from 'react';
import { MapRenderer } from './MapEngine';
import { supabase } from '../supabaseClient';
import MusicPlayer from '../components/Lobby/MusicPlayer';
import { POSITIONS, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './constants';
import { getChamp } from './Champions';

// Systems
import { NetworkSystem } from './systems/NetworkSystem';
import { MobSystem } from './systems/MobSystem';
import { CombatSystem } from './systems/CombatSystem';

// Modules
import { PhysicsSystem } from './systems/PhysicsSystem';
import { castSkill } from './Skills';
import { Sword, Zap, Shield, Play } from 'lucide-react';
import MobileControls from '../components/MobileControls';
import VoiceChat from '../components/VoiceChat';
import { Settings, Maximize, Music, Mic, MicOff } from 'lucide-react';

const Game = ({ roomId, playerName, championId, user, setInGame }) => {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const minimapCanvasRef = useRef(null);

    // State
    const [gameState, setGameState] = useState('starting'); // starting, playing, dead, over
    const [startTimer, setStartTimer] = useState(5);
    const [uiStats, setUiStats] = useState({ hp: 100, maxHp: 100, mana: 50, maxMana: 50, level: 1, xp: 0, maxXp: 50 });
    const [waveUi, setWaveUi] = useState({ current: 0, timer: 60, total: 0, dead: 0, baseHp: 1000 });
    const [showEscMenu, setShowEscMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('gameSettings') || '{"showMyName": true, "controlMode": "both", "musicEnabled": true}'));

    // Refs (Mutable Game State)
    const isHost = useRef(false);
    const gameStateRef = useRef(gameState);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const playersRef = useRef([]);
    const myPos = useRef({ x: POSITIONS.BASE.x + Math.random() * 50, y: POSITIONS.BASE.y + Math.random() * 50 });
    const facingAngle = useRef(0);
    const cameraRef = useRef({ x: POSITIONS.BASE.x, y: POSITIONS.BASE.y });
    const keys = useRef({});
    const lastTimeRef = useRef(Date.now());
    const walkTimerRef = useRef(0);
    const lastPosRef = useRef({ ...myPos.current });

    // Stats Ref
    const statsRef = useRef({
        ...getChamp(championId),
        atk: 1,
        xp: 0, maxXp: 50, level: 1,
        totalDamage: 0, kills: 0
    });
    const baseHpRef = useRef(1000);

    // Systems Refs
    const networkRef = useRef(null);
    const mobSystemRef = useRef(null);
    const combatRef = useRef(null);

    // Countdown
    useEffect(() => {
        if (gameState === 'starting') {
            const timer = setInterval(() => {
                setStartTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setGameState('playing');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState]);

    // MAIN INIT
    useEffect(() => {
        console.log(`[GAME] Init Room: ${roomId}`);

        const seed = Array.from(roomId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        engineRef.current = new MapRenderer(canvasRef.current, seed);

        supabase.from('players').select('is_host').eq('room_id', roomId).eq('name', playerName).single()
            .then(({ data }) => {
                if (data?.is_host) {
                    isHost.current = true;
                    console.log('[GAME] I am HOST');
                }

                mobSystemRef.current = new MobSystem(isHost.current);
                combatRef.current = new CombatSystem();

                networkRef.current = new NetworkSystem(
                    roomId,
                    playerName,
                    (payload) => {
                        const idx = playersRef.current.findIndex(p => p.id === payload.id);
                        if (idx === -1) playersRef.current.push(payload);
                        else playersRef.current[idx] = payload;
                    },
                    (payload) => {
                        if (!isHost.current) {
                            mobSystemRef.current.waveStats = payload.wave;
                            baseHpRef.current = payload.baseHp;
                        }
                    },
                    (payload) => {
                        if (!isHost.current) {
                            mobSystemRef.current.syncFromHost(payload);
                        }
                    }
                );
                networkRef.current.connect();
            });

        const resize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();

        let animationFrame;
        const loop = () => {
            const now = Date.now();
            const dt = (now - lastTimeRef.current) / 1000;
            lastTimeRef.current = now;

            if (gameStateRef.current === 'playing') {
                updateGame(dt);
            }

            renderGame();
            animationFrame = requestAnimationFrame(loop);
        };
        loop();

        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'escape') setShowEscMenu(p => !p);
            keys.current[key] = true;

            if (gameStateRef.current === 'playing' && !showEscMenu) {
                const mode = settings.controlMode || 'both';
                const isWASD = mode === 'wasd' || mode === 'both';
                const isArrows = mode === 'arrows' || mode === 'both';

                if ((isWASD && key === 'q') || (isArrows && key === 'a')) basicAttack();

                // SKILLS (1234 for WASD, QWER for Arrows)
                if (isWASD) {
                    if (key === '1') useSkill(1);
                    if (key === '2') useSkill(2);
                    if (key === '3') useSkill(1);
                    if (key === '4') useSkill(2);
                }
                if (isArrows) {
                    if (key === 'q') useSkill(1);
                    if (key === 'w') useSkill(2);
                    if (key === 'e') useSkill(1);
                    if (key === 'r') useSkill(2);
                }

                if (key === ' ') dash();
                if (key === 'tab') {
                    e.preventDefault();
                    setShowScoreboard(true);
                }
            }
        };
        const handleKeyUp = (e) => {
            const key = e.key.toLowerCase();
            keys.current[key] = false;
            if (key === 'tab') setShowScoreboard(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrame);
            if (networkRef.current) networkRef.current.cleanup();
        };
    }, []);

    const updateGame = (dt) => {
        handleMovement(dt);

        const lerp = 0.12;
        cameraRef.current.x += (myPos.current.x - cameraRef.current.x) * lerp;
        cameraRef.current.y += (myPos.current.y - cameraRef.current.y) * lerp;

        if (mobSystemRef.current && combatRef.current) {
            const { xpGain, kills } = mobSystemRef.current.update(
                dt,
                [...playersRef.current, { id: playerName, x: myPos.current.x, y: myPos.current.y }],
                baseHpRef,
                (x, y, val, color) => combatRef.current.spawnDamage(x, y, val, color),
                setGameState,
                engineRef.current
            );

            if (xpGain > 0) gainXp(xpGain);
            if (kills > 0) statsRef.current.kills += kills;

            if (isHost.current) {
                networkRef.current.sendMobUpdate(mobSystemRef.current.mobs);
                const ws = mobSystemRef.current.waveStats;
                if (ws.timer > 0) ws.timer -= dt;
                else if (ws.deadMobs >= ws.totalMobs) {
                    mobSystemRef.current.startWave(ws.current + 1);
                }
                if (Math.random() < 0.05) {
                    networkRef.current.sendWaveSync(ws, baseHpRef.current);
                }
            }

            combatRef.current.update(dt, mobSystemRef.current.mobs, (x, y, v) => combatRef.current.spawnDamage(x, y, v));
        }

        if (networkRef.current) {
            const me = {
                id: playerName,
                x: myPos.current.x,
                y: myPos.current.y,
                angle: facingAngle.current,
                name: playerName,
                color: getChamp(championId).color,
                championId,
                hp: statsRef.current.hp,
                maxHp: statsRef.current.maxHp,
                kills: statsRef.current.kills,
                walkTimer: walkTimerRef.current,
                isMoving: Math.hypot(myPos.current.x - lastPosRef.current.x, myPos.current.y - lastPosRef.current.y) > 0.1
            };
            networkRef.current.sendPlayerUpdate(me);
        }

        // 4. Natural Regeneration (5 HP/sec and Mana)
        const regenRate = 5; // HP per second
        const manaRegen = 2; // Mana per second
        if (statsRef.current.hp < statsRef.current.maxHp) {
            statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + regenRate * dt);
        }
        if (statsRef.current.mana < statsRef.current.maxMana) {
            statsRef.current.mana = Math.min(statsRef.current.maxMana, statsRef.current.mana + manaRegen * dt);
        }

        if (Math.random() < 0.1) {
            setUiStats({ ...statsRef.current });
            if (mobSystemRef.current) {
                const ws = mobSystemRef.current.waveStats;
                setWaveUi({
                    current: ws.current,
                    timer: ws.timer,
                    total: ws.totalMobs,
                    dead: ws.deadMobs,
                    baseHp: baseHpRef.current
                });
            }
        }
    };

    const handleMovement = (dt) => {
        const speed = 4;
        let mx = 0, my = 0;
        const k = keys.current;
        const mode = settings.controlMode || 'both';

        if (((mode === 'both' || mode === 'arrows') && k['arrowup']) || ((mode === 'both' || mode === 'wasd') && k['w'])) my -= speed;
        if (((mode === 'both' || mode === 'arrows') && k['arrowdown']) || ((mode === 'both' || mode === 'wasd') && k['s'])) my += speed;
        if (((mode === 'both' || mode === 'arrows') && k['arrowleft']) || ((mode === 'both' || mode === 'wasd') && k['a'])) mx -= speed;
        if (((mode === 'both' || mode === 'arrows') && k['arrowright']) || ((mode === 'both' || mode === 'wasd') && k['d'])) mx += speed;

        if (mx !== 0 || my !== 0) {
            let nextX = myPos.current.x + mx;
            let nextY = myPos.current.y + my;

            const map = engineRef.current?.mapData;

            // Slide with PhysicsSystem
            if (PhysicsSystem.canMove(nextX, myPos.current.y, map)) myPos.current.x = nextX;
            if (PhysicsSystem.canMove(myPos.current.x, nextY, map)) myPos.current.y = nextY;

            // Entity Collision (Players)
            PhysicsSystem.resolveEntityCollision(myPos.current, playersRef.current, 20);
            PhysicsSystem.clampToMap(myPos.current, MAP_WIDTH, MAP_HEIGHT);

            facingAngle.current = Math.atan2(my, mx);
            walkTimerRef.current += dt * 5;
            lastPosRef.current = { ...myPos.current };
        }
    };

    const basicAttack = () => {
        if (!combatRef.current) return;
        const champ = getChamp(championId);
        combatRef.current.addAttackEffect(myPos.current.x, myPos.current.y, facingAngle.current, championId);

        if (champ.basic.ranged) {
            combatRef.current.spawnProjectile(myPos.current.x, myPos.current.y, facingAngle.current, statsRef.current, champ.color);
        } else {
            mobSystemRef.current.mobs.forEach(m => {
                const dist = Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y);
                if (dist < champ.basic.range + 20) {
                    const angleToMob = Math.atan2(m.y - myPos.current.y, m.x - myPos.current.x);
                    let diff = angleToMob - facingAngle.current;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    if (Math.abs(diff) < champ.basic.arc / 2) {
                        const dmg = statsRef.current.atk;
                        m.hp -= dmg;
                        combatRef.current.spawnDamage(m.x, m.y, dmg, '#fff');
                    }
                }
            });
        }
    };

    const useSkill = (index = 1) => {
        if (!combatRef.current || !mobSystemRef.current) return;
        const champ = getChamp(championId);
        const skillData = index === 2 ? (champ.skill2 || champ.skill) : champ.skill;
        const skillKey = index === 2 ? 'lastSkillTime2' : 'lastSkillTime';

        if (statsRef.current.mana < skillData.cost) {
            combatRef.current.spawnDamage(myPos.current.x, myPos.current.y, "NO MANA!", "#3b82f6");
            return;
        }
        const now = Date.now();
        if (statsRef.current[skillKey] && now - statsRef.current[skillKey] < skillData.cd) return;

        const result = castSkill(championId, { ...myPos.current, angle: facingAngle.current, level: statsRef.current.level }, mobSystemRef.current.mobs, combatRef.current.projectiles, engineRef.current?.mapData, combatRef.current.damageNumbers, { current: null }, index);
        statsRef.current.mana -= skillData.cost;
        statsRef.current[skillKey] = now;
        combatRef.current.addAttackEffect(myPos.current.x, myPos.current.y, facingAngle.current, 'skill');

        if (result.heal) {
            statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + result.heal);
            combatRef.current.spawnDamage(myPos.current.x, myPos.current.y, `+${Math.floor(result.heal)}`, "#22c55e");
        }
        if (result.teleport) myPos.current = { ...result.teleport };
        if (result.totalDamage) statsRef.current.totalDamage += result.totalDamage;
    };

    const dash = () => {
        const ddist = 140;
        const map = engineRef.current?.mapData;

        let targetX = myPos.current.x;
        let targetY = myPos.current.y;

        const cos = Math.cos(facingAngle.current);
        const sin = Math.sin(facingAngle.current);

        // Sub-stepping to find furthest reachable point
        const step = 5;
        for (let d = step; d <= ddist; d += step) {
            const nextX = myPos.current.x + cos * d;
            const nextY = myPos.current.y + sin * d;

            if (PhysicsSystem.canPass(nextX, nextY, 'dash', map)) {
                targetX = nextX;
                targetY = nextY;
            } else {
                // Approximate even closer pixel by pixel
                for (let dd = 1; dd < step; dd++) {
                    const preciseX = targetX + cos * dd;
                    const preciseY = targetY + sin * dd;
                    if (PhysicsSystem.canPass(preciseX, preciseY, 'dash', map)) {
                        targetX = preciseX;
                        targetY = preciseY;
                    } else break;
                }
                break;
            }
        }

        myPos.current.x = targetX;
        myPos.current.y = targetY;
    };

    const gainXp = (amount) => {
        statsRef.current.xp += amount;
        if (statsRef.current.xp >= statsRef.current.maxXp) {
            statsRef.current.level++;
            statsRef.current.xp = 0;
            statsRef.current.maxXp = Math.floor(statsRef.current.maxXp * 1.5);
            statsRef.current.hp = statsRef.current.maxHp += 20;
            statsRef.current.atk += 1;
            combatRef.current.spawnDamage(myPos.current.x, myPos.current.y, "LEVEL UP!", "#ffd700");
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
    };

    const handleExitToLobby = () => setInGame(false);

    const renderGame = () => {
        if (!engineRef.current || !canvasRef.current) return;
        const me = {
            id: playerName, x: myPos.current.x, y: myPos.current.y, angle: facingAngle.current,
            name: playerName, color: getChamp(championId).color, championId,
            hp: statsRef.current.hp, maxHp: statsRef.current.maxHp,
            walkTimer: walkTimerRef.current,
            isMoving: Math.hypot(myPos.current.x - lastPosRef.current.x, myPos.current.y - lastPosRef.current.y) > 0.1
        };
        engineRef.current.draw([...playersRef.current, me], cameraRef.current, [], mobSystemRef.current ? mobSystemRef.current.mobs : [], combatRef.current ? combatRef.current.projectiles : [], combatRef.current ? combatRef.current.damageNumbers : [], combatRef.current?.attackEffects[0], baseHpRef.current, 1000, []);
    };

    // RENDER MINIMAP LOOP
    useEffect(() => {
        if (!minimapCanvasRef.current || !engineRef.current) return;
        const ctx = minimapCanvasRef.current.getContext('2d');
        const drawMinimap = () => {
            if (!engineRef.current) return;
            const map = engineRef.current.mapData;
            const size = 150;
            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, size, size);
            const scale = size / MAP_WIDTH; // MAP_WIDTH in tiles

            for (let y = 0; y < MAP_HEIGHT; y++) {
                for (let x = 0; x < MAP_WIDTH; x++) {
                    if (map.scales[y]?.[x] === 2) { // WALL
                        ctx.fillStyle = '#333';
                        ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(50 * scale - 2, 92 * scale - 2, 4, 4);

            playersRef.current.concat([{ id: playerName, x: myPos.current.x, y: myPos.current.y, color: getChamp(championId).color }]).forEach(p => {
                const px = (p.x / TILE_SIZE) * scale;
                const py = (p.y / TILE_SIZE) * scale;
                ctx.fillStyle = p.id === playerName ? '#fff' : (p.color || '#ef4444');
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
            });

            if (mobSystemRef.current) {
                mobSystemRef.current.mobs.forEach(m => {
                    const mx = (m.x / TILE_SIZE) * scale;
                    const my = (m.y / TILE_SIZE) * scale;
                    ctx.fillStyle = '#f97316';
                    ctx.fillRect(mx - 1, my - 1, 2, 2);
                });
            }
            requestAnimationFrame(drawMinimap);
        };
        drawMinimap();
    }, [gameState]);

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#000', fontFamily: 'VT323' }}>
            {gameState === 'starting' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', color: '#ffd700' }}>
                    <h1 style={{ fontSize: '4rem' }}>{startTimer}</h1>
                </div>
            )}

            <canvas ref={canvasRef} />

            <VoiceChat roomId={roomId} userId={user?.id} playerName={playerName} minimal={true} />

            {/* Render mobile controls only on touch devices */}
            {('ontouchstart' in window || navigator.maxTouchPoints > 0) && (
                <MobileControls
                    onInput={(newKeys) => {
                        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].forEach(k => keys.current[k] = false);
                        newKeys.forEach(k => keys.current[k.toLowerCase()] = true);
                    }}
                    onAction={(type) => {
                        if (type === 'attack') basicAttack();
                        if (type === 'skill') useSkill();
                        if (type === 'dash') dash();
                    }}
                />
            )}

            <div style={{ position: 'fixed', top: 20, left: 20, pointerEvents: 'none', zIndex: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', padding: '15px', border: '3px solid #ffd700', borderRadius: '4px', minWidth: '240px' }}>
                    <div style={{ fontSize: '1.8rem', color: '#ffd700', marginBottom: '8px' }}>LV {uiStats.level} {playerName} ({getChamp(championId).name})</div>

                    {/* HP BAR */}
                    <div style={{ width: '100%', height: '24px', background: '#333', border: '2px solid #000', position: 'relative' }}>
                        <div style={{ width: `${(uiStats.hp / uiStats.maxHp) * 100}%`, height: '100%', background: '#ef4444', transition: 'width 0.2s' }} />
                        <span style={{ position: 'absolute', inset: 0, textAlign: 'center', fontSize: '1rem', color: '#fff', textShadow: '1px 1px #000' }}>HP: {Math.ceil(uiStats.hp)}/{uiStats.maxHp}</span>
                    </div>

                    {/* MANA BAR */}
                    <div style={{ width: '100%', height: '18px', background: '#333', border: '2px solid #000', marginTop: '4px', position: 'relative' }}>
                        <div style={{ width: `${(uiStats.mana / uiStats.maxMana) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s' }} />
                        <span style={{ position: 'absolute', inset: 0, textAlign: 'center', fontSize: '0.9rem', color: '#fff', textShadow: '1px 1px #000' }}>MANA: {Math.ceil(uiStats.mana)}/{uiStats.maxMana}</span>
                    </div>

                    {/* STATS */}
                    <div style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '1.2rem', color: '#ffd700' }}>
                        <span>⚔️ ATK: {uiStats.atk}</span>
                        <span>💀 KILLS: {uiStats.kills}</span>
                    </div>

                    {/* SKILLS HUD */}
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                        {[1, 2].map(idx => {
                            const champ = getChamp(championId);
                            const skill = idx === 2 ? (champ.skill2 || { name: '-', cost: 0, cd: 0 }) : champ.skill;
                            const isArrows = settings.controlMode === 'arrows';
                            const keyName = isArrows ? (idx === 1 ? 'Q' : 'W') : (idx === 1 ? '1' : '2');
                            const skillKey = idx === 2 ? 'lastSkillTime2' : 'lastSkillTime';
                            const now = Date.now();
                            const onCd = statsRef.current[skillKey] && now - statsRef.current[skillKey] < skill.cd;

                            return (
                                <div key={idx} style={{ flex: 1, background: 'rgba(0,0,0,0.4)', padding: '5px', border: onCd ? '1px solid #ef4444' : '1px solid #ffd700', borderRadius: '4px', opacity: onCd ? 0.6 : 1 }}>
                                    <div style={{ fontSize: '0.8rem', color: onCd ? '#ef4444' : '#ffd700', whiteSpace: 'nowrap' }}>[{keyName}] {skill.name.toUpperCase()}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#aaa' }}>{skill.cost} MP</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div style={{ position: 'fixed', top: 20, right: 20, textAlign: 'right', zIndex: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', padding: '15px', border: '3px solid #ffd700', borderRadius: '4px', minWidth: '200px' }}>
                    <div style={{ fontSize: '2.2rem', color: '#ffd700' }}>ONDA {waveUi.current}</div>
                    <div style={{ fontSize: '1.2rem', color: '#fff', opacity: 0.8 }}>MOBS: {waveUi.dead}/{waveUi.total}</div>

                    {waveUi.timer > 0 && waveUi.dead >= waveUi.total && (
                        <div style={{ marginTop: '10px' }}>
                            <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold' }}>PRÓXIMA EM: {Math.ceil(waveUi.timer)}s</div>
                            {isHost.current && (
                                <button
                                    onClick={() => mobSystemRef.current?.skipWaveWaiting()}
                                    style={{
                                        marginTop: '10px', background: '#16a34a', border: '2px solid #fff',
                                        color: '#fff', padding: '8px 15px', borderRadius: '4px',
                                        cursor: 'pointer', fontFamily: 'VT323', fontSize: '1.2rem',
                                        display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center'
                                    }}
                                >
                                    <Play size={18} fill="currentColor" /> INICIAR AGORA
                                </button>
                            )}
                        </div>
                    )}

                    {isHost.current && waveUi.dead < waveUi.total && (mobSystemRef.current?.spawnTimeouts?.length > 0) && (
                        <button
                            onClick={() => mobSystemRef.current?.spawnInstant()}
                            style={{
                                marginTop: '10px', background: '#b45309', border: '2px solid #fff',
                                color: '#fff', padding: '8px 15px', borderRadius: '4px',
                                cursor: 'pointer', fontFamily: 'VT323', fontSize: '1.2rem',
                                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center'
                            }}
                        >
                            <Zap size={18} fill="currentColor" /> APARECER TODOS
                        </button>
                    )}

                    <div style={{ marginTop: '10px', width: '100%', height: '10px', background: '#333', border: '1px solid #000', position: 'relative' }}>
                        <div style={{ width: `${(waveUi.baseHp / 1000) * 100}%`, height: '100%', background: '#22c55e' }} />
                        <span style={{ position: 'absolute', top: -20, left: 0, fontSize: '0.8rem', color: '#22c55e' }}>HP BASE: {waveUi.baseHp}</span>
                    </div>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'flex-end', pointerEvents: 'auto' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #ffd700', color: '#ffd700', padding: '5px 10px', borderRadius: '4px', fontSize: '0.9rem' }}>
                        CONTROLES: {settings.controlMode === 'arrows' ? 'SETAS + QWER' : 'WASD + 1234'}
                    </div>
                    <button onClick={() => setShowSettings(true)} style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #ffd700', color: '#ffd700', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}><Settings size={24} /></button>
                </div>
            </div>

            <div
                onClick={() => setShowScoreboard(prev => !prev)}
                style={{ position: 'fixed', bottom: 20, left: 20, border: '4px solid #ffd700', background: '#000', width: '150px', height: '150px', zIndex: 10, cursor: 'pointer', pointerEvents: 'auto' }}
            >
                <canvas ref={minimapCanvasRef} width={150} height={150} />
            </div>

            {/* SCOREBOARD OVERLAY */}
            {showScoreboard && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                }}>
                    <div style={{
                        background: '#1a1a1a', border: '4px solid #ffd700', padding: '30px',
                        width: '400px', pointerEvents: 'auto'
                    }}>
                        <h2 style={{ color: '#ffd700', textAlign: 'center', fontSize: '2.5rem', marginTop: 0 }}>TABELA DE HÉROIS</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ffd700', paddingBottom: '10px', color: '#ffd700', fontSize: '1.2rem' }}>
                            <span>GUERREIRO</span>
                            <span>MONSTROS DERROTADOS</span>
                        </div>
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* MY PLAYER */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '1.5rem', background: 'rgba(255,215,0,0.1)', padding: '5px 10px' }}>
                                <span style={{ color: '#ffd700' }}>{playerName} (VOCÊ)</span>
                                <span>{statsRef.current.kills}</span>
                            </div>
                            {/* OTHER PLAYERS */}
                            {playersRef.current.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '1.5rem', padding: '5px 10px' }}>
                                    <span>{p.name}</span>
                                    <span>{p.kills || 0}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '30px', textAlign: 'center', color: '#ffd700', fontSize: '1rem', opacity: 0.7 }}>
                            {('ontouchstart' in window) ? "Clique no mapa novamente para fechar" : "Solte TAB para fechar"}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 10 }}>
                <button onClick={toggleFullscreen} style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #ffd700', color: '#ffd700', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', pointerEvents: 'auto' }}>FULLSCREEN</button>
            </div>

            {showSettings && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#1a1a1a', border: '4px solid #ffd700', padding: '40px', width: '400px', textAlign: 'center' }}>
                        <h1 style={{ color: '#ffd700', marginBottom: '30px' }}>CONFIGURAÇÕES</h1>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                                <span>Música</span>
                                <button onClick={() => {
                                    const ns = { ...settings, musicEnabled: !settings.musicEnabled };
                                    setSettings(ns); localStorage.setItem('gameSettings', JSON.stringify(ns));
                                }} style={{ padding: '8px 16px', background: settings.musicEnabled ? '#16a34a' : '#ef4444', border: 'none', color: '#fff', fontFamily: 'VT323', fontSize: '1.2rem', cursor: 'pointer' }}>{settings.musicEnabled ? 'Ligada' : 'Desligada'}</button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                                <span>Esquema de Controle</span>
                                <button onClick={() => {
                                    const nextMode = settings.controlMode === 'wasd' ? 'arrows' : 'wasd';
                                    const ns = { ...settings, controlMode: nextMode };
                                    setSettings(ns); localStorage.setItem('gameSettings', JSON.stringify(ns));
                                }} style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', color: '#fff', fontFamily: 'VT323', fontSize: '1.2rem', cursor: 'pointer' }}>{settings.controlMode === 'wasd' ? 'WASD' : 'SETAS'}</button>
                            </div>
                        </div>
                        <button onClick={() => setShowSettings(false)} style={{ background: '#ffd700', color: '#000', padding: '10px 40px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>FECHAR</button>
                        {settings.musicEnabled && <div style={{ display: 'none' }}><MusicPlayer /></div>}
                    </div>
                </div>
            )}

            {showEscMenu && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div style={{ background: '#1a1a1a', border: '5px solid #ffd700', padding: '40px 60px', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '4rem', color: '#ffd700', margin: '0 0 30px 0' }}>MENU</h1>
                        <button onClick={() => setShowEscMenu(false)} style={{ background: '#22c55e', color: '#fff', padding: '15px 40px', fontSize: '2rem', fontFamily: 'VT323', width: '100%', marginBottom: '10px', border: 'none', cursor: 'pointer' }}>RETOMAR</button>
                        <button onClick={handleExitToLobby} style={{ background: '#ef4444', color: '#fff', padding: '15px 40px', fontSize: '2rem', fontFamily: 'VT323', width: '100%', border: 'none', cursor: 'pointer' }}>SAIR</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Game;
