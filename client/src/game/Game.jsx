import React, { useEffect, useRef, useState } from 'react';
import { MapRenderer } from './MapEngine';
import { supabase } from '../supabaseClient';
import MusicPlayer from '../components/Lobby/MusicPlayer';
import MobileControls from '../components/MobileControls';
import VoiceChat from '../components/VoiceChat';

// Modules
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, BASE_POS, SPAWN_POS_L, SPAWN_POS_R, HUB_POS } from './constants';
import { CHAMPIONS, getChamp } from './Champions';
import { castSkill } from './Skills';
import { updateMobs } from './Mobs';

// Assets
import jacaSprite from '../Jaca, o pirata crocodilo em 8 direções.png';
import jacaAttack from '../Ataques do crocodilo com espada.png';
import { Sword, Shield } from 'lucide-react';

const Game = ({ roomId, playerName, championId, user, setInGame }) => {
    const canvasRef = useRef(null);
    const minimapCanvasRef = useRef(null);
    const engineRef = useRef(null);
    const [players, setPlayers] = useState([]);
    const [isMounted, setIsMounted] = useState(false);
    const [gameState, setGameState] = useState('starting'); // starting, playing, dead, over, victory
    const [startTimer, setStartTimer] = useState(5);
    const gameStateRef = useRef(gameState);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    // Countdown Logic
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

    const playersRef = useRef([]); // Critical for draw loop closure

    const [showEscMenu, setShowEscMenu] = useState(false);
    const showEscMenuRef = useRef(showEscMenu);
    useEffect(() => { showEscMenuRef.current = showEscMenu; }, [showEscMenu]);

    const [isMobile, setIsMobile] = useState(false);
    const isHost = useRef(false);
    const activeVirtualKeys = useRef(new Set());
    const championIdRef = useRef(championId);
    useEffect(() => { championIdRef.current = championId; }, [championId]);
    const playerNameRef = useRef(playerName);
    useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
    const keys = useRef({});

    // Refs for Loop performance & Fresh state
    // Randomize initial spawn slightly to prevent 10-player stack
    const initialSpawn = (roomId.charCodeAt(0) % 2 === 0) ? SPAWN_POS_L : SPAWN_POS_R;
    const myPos = useRef({
        x: initialSpawn.x + (Math.random() * 60 - 30),
        y: initialSpawn.y + (Math.random() * 60 - 30)
    });
    const facingAngle = useRef(0);
    const cameraRef = useRef({ x: BASE_POS.x, y: BASE_POS.y });
    const monstersRef = useRef([]);
    const projectilesRef = useRef([]);
    const damageRef = useRef([]);
    const baseHpRef = useRef(1000);
    const waveStats = useRef({ current: 0, timer: 60, totalMobs: 0, deadMobs: 0 });
    const walkTimerRef = useRef(0);
    const lastPosRef = useRef({ x: BASE_POS.x, y: BASE_POS.y });
    const statsRef = useRef({
        hp: getChamp(championId).hp || 100,
        maxHp: getChamp(championId).hp || 100,
        mana: getChamp(championId).mana || 50,
        maxMana: getChamp(championId).mana || 50,
        atk: 1, // Start DMG 1
        range: getChamp(championId).basic?.range || 150,
        xp: 0, maxXp: 50, level: 1,
        totalDamage: 0, kills: 0
    });

    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('gameSettings');
        return saved ? JSON.parse(saved) : { showMyName: true, showMusicBtn: true, controlMode: 'both' };
    });
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const [showSettings, setShowSettings] = useState(false);
    const [uiStats, setUiStats] = useState({ ...statsRef.current });
    const [waveUi, setWaveUi] = useState({ current: 0, timer: 60, total: 0, dead: 0, baseHp: 1000 });

    const attackEffect = useRef(null);

    useEffect(() => {
        console.log(`[GAME] Mounted! Room: ${roomId}, Champ Prop: ${championId}, Player: ${playerName}`);
        setIsMounted(true);
        if (!canvasRef.current) return;

        // Use hash of roomId as seed for map consistency
        const seed = Array.from(roomId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        engineRef.current = new MapRenderer(canvasRef.current, seed);

        // Load Jaca Assets
        const jSprite = new Image();
        const jAttack = new Image();
        jSprite.onload = () => {
            if (engineRef.current) engineRef.current.jacaAssets = { ...engineRef.current.jacaAssets, sprite: jSprite };
        };
        jAttack.onload = () => {
            if (engineRef.current) engineRef.current.jacaAssets = { ...engineRef.current.jacaAssets, attack: jAttack };
        };
        jSprite.src = jacaSprite;
        jAttack.src = jacaAttack;

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

            // Update the display state (optional/slow) and the logic REF (fast/reliable)
            playersRef.current = (() => {
                const idx = playersRef.current.findIndex(p => p.id === payload.id);
                if (idx === -1) return [...playersRef.current, payload];
                const next = [...playersRef.current];
                next[idx] = payload;
                return next;
            })();

            // Still update state so UI elements (like a player list) might react
            setPlayers(playersRef.current);
        }).on('broadcast', { event: 'wave_sync' }, ({ payload }) => {
            if (!isHost.current) {
                waveStats.current = payload.wave;
                baseHpRef.current = payload.baseHp;
            }
        }).subscribe();

        const broadcastInterval = setInterval(() => {
            if (gameStateRef.current === 'playing') {
                channel.send({
                    type: 'broadcast',
                    event: 'player_update',
                    payload: {
                        id: playerName, x: myPos.current.x, y: myPos.current.y,
                        angle: facingAngle.current,
                        name: playerName, color: getChamp(championId).color, championId,
                        hp: statsRef.current.hp, maxHp: statsRef.current.maxHp,
                        totalDamage: statsRef.current.totalDamage, kills: statsRef.current.kills,
                        walkTimer: walkTimerRef.current,
                        isMoving: Math.hypot(myPos.current.x - lastPosRef.current.x, myPos.current.y - lastPosRef.current.y) > 0.1
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

        // Pre-render Minimap Static Layer
        setTimeout(() => {
            if (minimapCanvasRef.current && engineRef.current?.mapData) {
                const mk = minimapCanvasRef.current.getContext('2d');
                const grid = engineRef.current.mapData.grid;
                mk.clearRect(0, 0, 180, 180);
                const ts = 180 / 100; // Map is 100x100
                for (let y = 0; y < 100; y++) {
                    for (let x = 0; x < 100; x++) {
                        const tile = grid[y][x];
                        if (tile === 2 || tile === 3 || tile === 5) {
                            mk.fillStyle = tile === 2 ? '#0ea5e9' : (tile === 5 ? '#92400e' : '#475569');
                            mk.fillRect(x * ts, y * ts, ts + 0.1, ts + 0.1);
                        }
                    }
                }
            }
        }, 1000); // Wait for engine to init

        let animationFrame;
        let lastTime = Date.now();
        const loop = () => {
            const now = Date.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            // Animation Timer (Only if moving)
            const isMoving = Math.hypot(myPos.current.x - lastPosRef.current.x, myPos.current.y - lastPosRef.current.y) > 0.1;
            if (isMoving) {
                walkTimerRef.current += dt * 4;
            }
            lastPosRef.current = { ...myPos.current };

            if (gameStateRef.current === 'over' || gameStateRef.current === 'starting') return;

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
            const { activeMonsters, deadCount, xpGain, kills } = updateMobs(
                monstersRef.current,
                myPos.current,
                engineRef.current,
                dt,
                gameStateRef.current,
                setGameState,
                spawnDamage,
                statsRef.current,
                baseHpRef
            );

            monstersRef.current = activeMonsters;
            if (deadCount > 0) {
                waveStats.current.deadMobs += deadCount;
                statsRef.current.kills += kills;
                gainXp(xpGain);
            }

            // Entity Pushing Physics (Player <-> Monsters)
            monstersRef.current.forEach(m => {
                const dx = m.x - myPos.current.x;
                const dy = m.y - myPos.current.y;
                const dist = Math.hypot(dx, dy);
                const combinedRadius = 35; // Player 20 + Monster 15
                if (dist < combinedRadius && dist > 0) {
                    const overlap = combinedRadius - dist;
                    const angle = Math.atan2(dy, dx);
                    // Light push for player-monster interaction
                    myPos.current.x -= Math.cos(angle) * (overlap * 0.3);
                    myPos.current.y -= Math.sin(angle) * (overlap * 0.3);
                    m.x += Math.cos(angle) * (overlap * 0.7);
                    m.y += Math.sin(angle) * (overlap * 0.7);
                }
            });

            // Monster <-> Monster pushing (Harder blocking)
            for (let p = 0; p < 2; p++) {
                for (let i = 0; i < monstersRef.current.length; i++) {
                    for (let j = i + 1; j < monstersRef.current.length; j++) {
                        const m1 = monstersRef.current[i], m2 = monstersRef.current[j];
                        const dx = m2.x - m1.x, dy = m2.y - m1.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist < 35 && dist > 0) {
                            const overlap = 35 - dist;
                            const angle = Math.atan2(dy, dx);
                            m1.x -= Math.cos(angle) * overlap * 0.5;
                            m1.y -= Math.sin(angle) * overlap * 0.5;
                            m2.x += Math.cos(angle) * overlap * 0.5;
                            m2.y += Math.sin(angle) * overlap * 0.5;
                        }
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
                    name: playerName, color: getChamp(championId).color, championId,
                    hp: statsRef.current.hp, maxHp: statsRef.current.maxHp,
                    walkTimer: walkTimerRef.current,
                    isMoving: Math.hypot(myPos.current.x - lastPosRef.current.x, myPos.current.y - lastPosRef.current.y) > 0.1
                };
                engineRef.current.draw(
                    [...playersRef.current, me],
                    cameraRef.current,
                    [], // Dummies
                    monstersRef.current,
                    projectilesRef.current,
                    damageRef.current,
                    attackEffect.current,
                    baseHpRef.current,
                    1000,
                    [
                        { x: SPAWN_POS_L.x, y: SPAWN_POS_L.y, timer: waveUi.timer },
                        { x: SPAWN_POS_R.x, y: SPAWN_POS_R.y, timer: waveUi.timer }
                    ]
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
            const spawnSide = i % 2 === 0 ? SPAWN_POS_L : SPAWN_POS_R;
            setTimeout(() => {
                monstersRef.current.push({
                    id: `w-${waveStats.current.current}-${i}`,
                    x: spawnSide.x + (Math.random() - 0.5) * 150,
                    y: spawnSide.y + (Math.random() - 0.5) * 150,
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
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'escape') { setShowEscMenu(prev => !prev); return; }
            keys.current[key] = true;

            // USE REFS for state checks inside listeners to avoid stale closures
            if (gameStateRef.current !== 'playing' || showEscMenuRef.current) return;

            // Attack and skills (only on press)
            if (key === 'q') basicAttack();
            if (['1', '2', '3', '4'].includes(key)) useSkill();
            if (key === ' ') dash();
        };
        const handleKeyUp = (e) => keys.current[e.key.toLowerCase()] = false;

        const moveLoop = setInterval(() => {
            if (gameStateRef.current !== 'playing' || showEscMenuRef.current) return;
            const speed = 5;
            let mx = 0, my = 0;
            const vKeys = activeVirtualKeys.current;
            const k = keys.current;
            const mode = settingsRef.current.controlMode || 'both';

            // Movement Logic - Combined for responsiveness
            const up = ((mode === 'both' || mode === 'arrows') && (k['arrowup'] || vKeys.has('ArrowUp'))) || ((mode === 'both' || mode === 'wasd') && k['w']);
            const down = ((mode === 'both' || mode === 'arrows') && (k['arrowdown'] || vKeys.has('ArrowDown'))) || ((mode === 'both' || mode === 'wasd') && k['s']);
            const left = ((mode === 'both' || mode === 'arrows') && (k['arrowleft'] || vKeys.has('ArrowLeft'))) || ((mode === 'both' || mode === 'wasd') && k['a']);
            const right = ((mode === 'both' || mode === 'arrows') && (k['arrowright'] || vKeys.has('ArrowRight'))) || ((mode === 'both' || mode === 'wasd') && k['d']);

            if (up) my -= speed;
            if (down) my += speed;
            if (left) mx -= speed;
            if (right) mx += speed;

            if (mx !== 0 || my !== 0) {
                const stepX = mx;
                const stepY = my;

                let finalX = myPos.current.x;
                let finalY = myPos.current.y;

                if (engineRef.current) {
                    const sc = engineRef.current.mapData.scales;
                    if (sc) {
                        // Try X movement separately
                        const nextX = Math.max(0, Math.min(MAP_WIDTH * TILE_SIZE, myPos.current.x + stepX));
                        const gridX_X = Math.floor(nextX / TILE_SIZE);
                        const gridY_X = Math.floor(myPos.current.y / TILE_SIZE);
                        if ((sc[gridY_X]?.[gridX_X] || 0) === 0) {
                            finalX = nextX;
                        }

                        // Try Y movement separately
                        const nextY = Math.max(0, Math.min(MAP_HEIGHT * TILE_SIZE, myPos.current.y + stepY));
                        const gridX_Y = Math.floor(finalX / TILE_SIZE);
                        const gridY_Y = Math.floor(nextY / TILE_SIZE);
                        if ((sc[gridY_Y]?.[gridX_Y] || 0) === 0) {
                            finalY = nextY;
                        }
                    }
                } else {
                    finalX = Math.max(0, Math.min(MAP_WIDTH * TILE_SIZE, myPos.current.x + stepX));
                    finalY = Math.max(0, Math.min(MAP_HEIGHT * TILE_SIZE, myPos.current.y + stepY));
                }

                myPos.current.x = finalX;
                myPos.current.y = finalY;
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
    }, []); // Only run once, using REFS for everything inside


    const basicAttack = () => {
        const champ = getChamp(championIdRef.current);
        const angle = facingAngle.current;
        const dmg = Math.floor(statsRef.current.atk); // Use direct statsRef for base 1 + lvl scaling

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
                    m.hp -= dmg; statsRef.current.totalDamage += dmg;
                    m.blink = 5; // Hit feedback
                    spawnDamage(m.x, m.y, dmg);
                    if (champ.basic.kb) {
                        m.x += Math.cos(targetAngle) * champ.basic.kb; m.y += Math.sin(targetAngle) * champ.basic.kb;
                    }
                }
            }
        });
    };

    const useSkill = () => {
        const champ = getChamp(championIdRef.current);
        if (statsRef.current.mana < champ.skill.cost) return;
        statsRef.current.mana -= champ.skill.cost;

        const player = {
            level: statsRef.current.level,
            x: myPos.current.x,
            y: myPos.current.y,
            angle: facingAngle.current
        };

        const result = castSkill(
            championIdRef.current,
            player,
            monstersRef.current,
            projectilesRef.current,
            engineRef.current?.mapData,
            damageRef.current,
            attackEffect
        );

        if (result.totalDamage) statsRef.current.totalDamage += result.totalDamage;
        if (result.heal) {
            statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + result.heal);
        }
        if (result.teleport) {
            myPos.current.x = result.teleport.x;
            myPos.current.y = result.teleport.y;
        }
    };

    const dash = () => {
        const ddist = 140;
        const angle = facingAngle.current;
        const steps = 10;
        let lastSafeX = myPos.current.x;
        let lastSafeY = myPos.current.y;

        for (let i = 1; i <= steps; i++) {
            const checkX = myPos.current.x + Math.cos(angle) * (ddist * (i / steps));
            const checkY = myPos.current.y + Math.sin(angle) * (ddist * (i / steps));

            if (engineRef.current) {
                const gx = Math.floor(checkX / TILE_SIZE);
                const gy = Math.floor(checkY / TILE_SIZE);
                const scale = engineRef.current.mapData.scales[gy]?.[gx] ?? 3;

                // Scale 2 (Wall) & 3 (Water) block dash trajectory
                if (scale >= 2) break;

                // Scale 1 (Low Barrier) allows passing through, but NOT landing on it
                if (i === steps && scale >= 1) break;
            }
            lastSafeX = checkX;
            lastSafeY = checkY;
        }

        myPos.current.x = Math.max(0, Math.min(MAP_WIDTH * TILE_SIZE, lastSafeX));
        myPos.current.y = Math.max(0, Math.min(MAP_HEIGHT * TILE_SIZE, lastSafeY));
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
            // Direct update to players table instead of RPC to avoid 404
            await supabase.from('players').update({
                kills: statsRef.current.kills,
                damage: Math.floor(statsRef.current.totalDamage)
            }).eq('room_id', roomId).eq('name', playerName);
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
            {/* Wallpaper Overlay for 5s Pre-Match */}
            {gameState === 'starting' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(/src/loading_bg.png)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 9999,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#ffd700', fontFamily: 'VT323, monospace',
                    textShadow: '0 0 10px #000'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>PREPARANDO BATALHA...</div>
                    <div style={{ fontSize: '8rem', fontWeight: 'bold' }}>{startTimer}</div>
                </div>
            )}
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

            {/* HUD: Top Left - Status then Map */}
            <div style={{ position: 'fixed', top: '15px', left: '15px', display: 'flex', flexDirection: 'column', gap: '15px', zIndex: 50 }}>
                {/* Status Bar */}
                <div style={{ background: 'rgba(0,0,0,0.8)', border: '3px solid #ffd700', padding: '10px', minWidth: '220px', boxShadow: '5px 5px #000' }}>
                    <div style={{ color: '#ffd700', fontSize: '1.6rem', marginBottom: '8px' }}>LV {uiStats.level} {playerName.toUpperCase()} ({getChamp(championId).name})</div>
                    <div style={{ width: '100%', height: '24px', background: '#222', border: '2px solid #fff', position: 'relative', marginBottom: '8px' }}>
                        <div style={{ width: `${(uiStats.hp / uiStats.maxHp) * 100}%`, height: '100%', background: '#ef4444', transition: 'width 0.3s' }} />
                        <div style={{ position: 'absolute', inset: 0, textAlign: 'center', color: '#fff', fontSize: '1rem', lineHeight: '20px' }}>{Math.ceil(uiStats.hp)} HP</div>
                    </div>
                    <div style={{ width: '100%', height: '12px', background: '#222', border: '2px solid #fff' }}>
                        <div style={{ width: `${(uiStats.mana / uiStats.maxMana) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }} />
                    </div>
                </div>

                {/* Minimap - Optimized for Mobile (Compass) */}
                <div style={{
                    width: isMobile ? '120px' : '180px',
                    height: isMobile ? '120px' : '180px',
                    background: 'rgba(10, 20, 10, 0.9)',
                    border: '3px solid #ffd700',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '5px 5px #000',
                    pointerEvents: 'none'
                }}>
                    <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.5 }}>
                        <canvas ref={minimapCanvasRef} width={180} height={180} style={{ width: '100%', height: '100%' }} />
                    </div>
                    <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
                        {players.map(p => (
                            <div key={p.id} style={{
                                position: 'absolute',
                                left: `${(p.x / (MAP_WIDTH * TILE_SIZE)) * 100}%`,
                                top: `${(p.y / (MAP_HEIGHT * TILE_SIZE)) * 100}%`,
                                width: '10px', height: '10px',
                                border: '1px solid #fff',
                                background: p.id === playerName ? '#3b82f6' : (p.color || '#ef4444'),
                                borderRadius: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '6px', color: '#fff', fontWeight: 'bold'
                            }}>
                                {p.name.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {/* Me indicator (just in case players list is slow) */}
                        <div style={{
                            position: 'absolute',
                            left: `${(myPos.current.x / (MAP_WIDTH * TILE_SIZE)) * 100}%`,
                            top: `${(myPos.current.y / (MAP_HEIGHT * TILE_SIZE)) * 100}%`,
                            width: '8px', height: '8px',
                            border: '2px solid #fff',
                            background: '#3b82f6',
                            borderRadius: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 11
                        }} />
                        {monstersRef.current.map(m => (
                            <div key={m.id} style={{
                                position: 'absolute',
                                left: `${(m.x / (MAP_WIDTH * TILE_SIZE)) * 100}%`,
                                top: `${(m.y / (MAP_HEIGHT * TILE_SIZE)) * 100}%`,
                                width: '4px', height: '4px',
                                background: '#ffd700',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 5
                            }} />
                        ))}
                    </div>
                    <div style={{ position: 'absolute', bottom: '5px', width: '100%', textAlign: 'center', fontSize: '0.8rem', color: '#ffd700', fontWeight: 'bold' }}>BÚSSOLA</div>
                </div>
            </div>

            <div style={{ position: 'fixed', bottom: '15px', left: '15px', zIndex: 60 }}>
                <button
                    onClick={() => {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen();
                        } else {
                            document.exitFullscreen();
                        }
                    }}
                    style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: '2px solid #ffd700',
                        color: '#ffd700',
                        padding: '10px',
                        cursor: 'pointer',
                        fontFamily: 'VT323',
                        fontSize: '1rem',
                        boxShadow: '3px 3px #000'
                    }}
                >
                    FULLSCREEN 📺
                </button>
            </div>

            <div style={{ position: 'fixed', top: '15px', right: '15px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', zIndex: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.85)', border: '3px solid #ffd700', padding: '10px', color: '#fff', textAlign: 'right', boxShadow: '4px 4px #000' }}>
                    <div style={{ fontSize: '1.6rem', color: '#ffd700' }}>WAVE {waveUi.current}</div>
                    <div style={{ fontSize: '1rem' }}>ALVOS: {waveUi.dead} / {waveUi.total}</div>
                    {waveUi.timer > 0 && <div style={{ fontSize: '1.2rem', color: '#ef4444' }}>PRÓXIMA ONDA EM: {Math.ceil(waveUi.timer)}s</div>}
                    {isHost.current && waveUi.timer > 0 && <button onClick={() => waveStats.current.timer = 0} style={{ background: '#ffd700', border: 'none', padding: '5px 10px', marginTop: '6px', fontFamily: 'VT323', cursor: 'pointer', fontWeight: 'bold' }}>PULAR »</button>}
                </div>

                {/* Settings Toggle moved here to avoid overlap */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: '2px solid #ffd700',
                        color: '#ffd700',
                        padding: '10px 20px',
                        cursor: 'pointer',
                        fontFamily: 'VT323',
                        fontSize: '1.2rem',
                        boxShadow: '3px 3px #000'
                    }}
                >
                    SETTINGS ⚙️
                </button>
            </div>

            <div className="hide-mobile" style={{ position: 'fixed', bottom: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                <div style={{ width: '45px', height: '45px', border: '3px solid #ffd700', background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <span style={{ fontSize: '0.7rem' }}>Q</span><span style={{ fontSize: '0.8rem' }}>HIT</span>
                </div>
                {['1', '2', '3', '4'].map(k => (
                    <div key={k} style={{ width: '45px', height: '45px', border: '3px solid #ffd700', background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <span style={{ fontSize: '0.7rem' }}>{k}</span><span style={{ fontSize: '0.8rem' }}>SKILL</span>
                    </div>
                ))}
            </div>

            {gameState !== 'playing' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, color: '#fff', textAlign: 'center', fontFamily: 'VT323' }}>
                    <h1 style={{ fontSize: '5rem', color: '#ef4444' }}>{gameState === 'dead' ? 'VOCÊ CAIU!' : 'DERROTA'}</h1>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', maxWidth: '800px', width: '90%', background: '#111', border: '4px solid #ffd700', padding: '25px', boxShadow: '10px 10px #000' }}>
                        <div style={{ textAlign: 'left', borderRight: '2px solid #333', paddingRight: '20px' }}>
                            <h2 style={{ color: '#ffd700', borderBottom: '2px solid #ffd700', marginBottom: '15px' }}>SEUS STATUS</h2>
                            <p>CAMPEÃO: {getChamp(championId).name}</p>
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
                        <div style={{ marginTop: '10px' }}>
                            <div style={{ color: '#ffd700', marginBottom: '5px' }}>MODO DE CONTROLE:</div>
                            <select
                                value={settings.controlMode || 'both'}
                                onChange={(e) => {
                                    const newSet = { ...settings, controlMode: e.target.value };
                                    setSettings(newSet);
                                    localStorage.setItem('gameSettings', JSON.stringify(newSet));
                                }}
                                style={{ background: '#222', color: '#fff', border: '1px solid #ffd700', padding: '5px', width: '100%', fontFamily: 'VT323' }}
                            >
                                <option value="both">HÍBRIDO (WASD + SETAS)</option>
                                <option value="arrows">APENAS SETAS</option>
                                <option value="wasd">APENAS WASD</option>
                            </select>
                        </div>
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

            {/* Voice Chat Overlay */}
            <VoiceChat
                roomId={roomId}
                userId={user?.id}
                playerName={playerName}
                muted={true} // Default muted
            />

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

        </div>
    );
};

export default Game;
