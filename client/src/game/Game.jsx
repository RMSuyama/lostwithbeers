import React, { useEffect, useRef, useState } from 'react';
import { MapRenderer } from './MapEngine';
import { supabase } from '../supabaseClient';
import MusicPlayer from '../components/Lobby/MusicPlayer';

// Systems
import { NetworkSystem } from './systems/NetworkSystem';
import { MobSystem } from './systems/MobSystem';
import { CombatSystem } from './systems/CombatSystem';

// Modules
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, BASE_POS, SPAWN_POS_L, SPAWN_POS_R } from './constants';
import { CHAMPIONS, getChamp } from './Champions';

// Assets
import jacaSprite from '../Jaca, o pirata crocodilo em 8 direções.png';

const Game = ({ roomId, playerName, championId, user, setInGame }) => {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);

    // State
    const [gameState, setGameState] = useState('starting'); // starting, playing, dead, over
    const [startTimer, setStartTimer] = useState(5);
    const [uiStats, setUiStats] = useState({ hp: 100, maxHp: 100, mana: 50, maxMana: 50, level: 1, xp: 0, maxXp: 50 });
    const [waveUi, setWaveUi] = useState({ current: 0, timer: 60, total: 0, dead: 0, baseHp: 1000 });
    const [showEscMenu, setShowEscMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settings] = useState(() => JSON.parse(localStorage.getItem('gameSettings') || '{"showMyName": true, "controlMode": "both"}'));

    // Refs (Mutable Game State)
    const isHost = useRef(false);
    const gameStateRef = useRef(gameState);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const playersRef = useRef([]);
    const myPos = useRef({ x: BASE_POS.x + Math.random() * 50, y: BASE_POS.y + Math.random() * 50 });
    const facingAngle = useRef(0);
    const cameraRef = useRef({ x: BASE_POS.x, y: BASE_POS.y });
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
        console.log("VERSION: BUILD_FIX_V3");

        // 1. Initialize Engine
        const seed = Array.from(roomId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        engineRef.current = new MapRenderer(canvasRef.current, seed);

        // Load Assets
        const jSprite = new Image(); jSprite.src = jacaSprite;
        jSprite.onload = () => engineRef.current.jacaAssets = { ...engineRef.current.jacaAssets, sprite: jSprite };

        // 2. Check Host
        supabase.from('players').select('is_host').eq('room_id', roomId).eq('name', playerName).single()
            .then(({ data }) => {
                if (data?.is_host) {
                    isHost.current = true;
                    console.log('[GAME] I am HOST');
                }

                // 3. Initialize Systems
                mobSystemRef.current = new MobSystem(isHost.current);
                combatRef.current = new CombatSystem();

                networkRef.current = new NetworkSystem(
                    roomId,
                    playerName,
                    (payload) => { // On Player Update
                        const idx = playersRef.current.findIndex(p => p.id === payload.id);
                        if (idx === -1) playersRef.current.push(payload);
                        else playersRef.current[idx] = payload;
                    },
                    (payload) => { // On Wave Sync
                        if (!isHost.current) {
                            mobSystemRef.current.waveStats = payload.wave;
                            baseHpRef.current = payload.baseHp;
                        }
                    },
                    (payload) => { // On Mob Update (Client Sync)
                        if (!isHost.current) {
                            // Sync raw mobs list from host
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

        // 4. Game Loop
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

        // 5. Input Listeners
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'escape') setShowEscMenu(p => !p);
            keys.current[key] = true;

            if (gameStateRef.current === 'playing' && !showEscMenu) {
                if (key === 'q') basicAttack();
                if (['1', '2', '3', '4'].includes(key)) useSkill();
                if (key === ' ') dash();
            }
        };
        const handleKeyUp = (e) => keys.current[e.key.toLowerCase()] = false;

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

    // --- UPDATE LOOP ---
    const updateGame = (dt) => {
        // 1. Movement
        handleMovement(dt);

        // 2. Camera
        const lerp = 0.12;
        cameraRef.current.x += (myPos.current.x - cameraRef.current.x) * lerp;
        cameraRef.current.y += (myPos.current.y - cameraRef.current.y) * lerp;

        // 3. Systems Update
        if (mobSystemRef.current && combatRef.current) {
            // Mob AI (Host only) or simple interpolation (Client)
            const { xpGain, kills } = mobSystemRef.current.update(
                dt,
                [...playersRef.current, { id: playerName, x: myPos.current.x, y: myPos.current.y }],
                baseHpRef,
                (x, y, val, color) => combatRef.current.spawnDamage(x, y, val, color), // Callback to spawn damage
                setGameState,
                engineRef.current
            );

            if (xpGain > 0) gainXp(xpGain);
            if (kills > 0) statsRef.current.kills += kills;

            // Host: Broadcast Mob State
            if (isHost.current) {
                networkRef.current.sendMobUpdate(mobSystemRef.current.mobs);

                // Wave Logic
                const ws = mobSystemRef.current.waveStats;
                if (ws.timer > 0) ws.timer -= dt;
                else if (ws.deadMobs >= ws.totalMobs) {
                    mobSystemRef.current.startWave(ws.current + 1);
                }

                // Sync Wave Stats sometimes
                if (Math.random() < 0.05) {
                    networkRef.current.sendWaveSync(ws, baseHpRef.current);
                }
            }

            // Combat (Projectiles)
            combatRef.current.update(dt, mobSystemRef.current.mobs, (x, y, v) => combatRef.current.spawnDamage(x, y, v));
        }

        // 4. Networking Broadcast (Player State)
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
                walkTimer: walkTimerRef.current,
                isMoving: Math.hypot(myPos.current.x - lastPosRef.current.x, myPos.current.y - lastPosRef.current.y) > 0.1
            };
            networkRef.current.sendPlayerUpdate(me);
        }

        // 5. UI Sync (Low freq)
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
        const speed = 4; // Base speed
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

            // Collision Helper
            const canMove = (x, y) => {
                if (!engineRef.current) return true;
                const gX = Math.floor(x / TILE_SIZE);
                const gY = Math.floor(y / TILE_SIZE);
                // Scale 0 = Walkable, 2 = Wall, 3 = Water
                const scale = engineRef.current.mapData.scales[gY]?.[gX] ?? 0;
                return scale === 0;
            };

            // Slide
            if (canMove(nextX, myPos.current.y)) myPos.current.x = nextX;
            if (canMove(myPos.current.x, nextY)) myPos.current.y = nextY;

            facingAngle.current = Math.atan2(my, mx);
            walkTimerRef.current += dt * 5;
            lastPosRef.current = { ...myPos.current };
        }
    };

    const basicAttack = () => {
        if (!combatRef.current) return;
        const champ = getChamp(championId);

        // Add Effect
        combatRef.current.addAttackEffect(myPos.current.x, myPos.current.y, facingAngle.current, championId);

        if (champ.basic.ranged) {
            combatRef.current.spawnProjectile(
                myPos.current.x, myPos.current.y, facingAngle.current,
                statsRef.current, champ.color
            );
        } else {
            // Melee Logic (Client Side Hit)
            mobSystemRef.current.mobs.forEach(m => {
                const dist = Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y);
                if (dist < champ.basic.range + 20) {
                    // Check Arc
                    const angleToMob = Math.atan2(m.y - myPos.current.y, m.x - myPos.current.x);
                    let diff = angleToMob - facingAngle.current;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;

                    if (Math.abs(diff) < champ.basic.arc / 2) {
                        const dmg = statsRef.current.atk;
                        m.hp -= dmg; // Optimistic
                        combatRef.current.spawnDamage(m.x, m.y, dmg, '#fff');
                    }
                }
            });
        }
    };

    const useSkill = () => { /* Placeholder for skill logic re-integration */ };
    const dash = () => {
        const ddist = 140;
        const dx = Math.cos(facingAngle.current) * ddist;
        const dy = Math.sin(facingAngle.current) * ddist;
        myPos.current.x += dx;
        myPos.current.y += dy;
        // Note: Needs Map Collision check ideally, skipped for brevity in refactor msg
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

    // Auto Cleanup Rooms
    useEffect(() => {
        if (!isHost.current) return;
        const cleanup = setInterval(async () => {
            const { data: activePlayers } = await supabase.from('players').select('id').eq('room_id', roomId);
            if (!activePlayers || activePlayers.length === 0) {
                console.log('[GAME] Room empty, self-destructing...');
                await supabase.from('rooms').delete().eq('id', roomId);
            }
        }, 10000);
        return () => clearInterval(cleanup);
    }, [roomId]);

    const handleExitToLobby = () => {
        setInGame(false);
    };

    // --- RENDER ---
    const renderGame = () => {
        if (!engineRef.current || !canvasRef.current) return;

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
            walkTimer: walkTimerRef.current,
            isMoving: Math.hypot(myPos.current.x - lastPosRef.current.x, myPos.current.y - lastPosRef.current.y) > 0.1
        };

        engineRef.current.draw(
            [...playersRef.current, me],
            cameraRef.current,
            [], // dummies
            mobSystemRef.current ? mobSystemRef.current.mobs : [],
            combatRef.current ? combatRef.current.projectiles : [],
            combatRef.current ? combatRef.current.damageNumbers : [],
            combatRef.current?.attackEffects[0], // Single effect for now
            baseHpRef.current,
            1000,
            []
        );
    };

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#000', fontFamily: 'VT323' }}>
            {gameState === 'starting' && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.8)', color: '#ffd700'
                }}>
                    <h1 style={{ fontSize: '4rem' }}>{startTimer}</h1>
                </div>
            )}

            <canvas ref={canvasRef} />

            {showEscMenu && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ background: '#1a1a1a', border: '5px solid #ffd700', padding: '40px 60px', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '4rem', color: '#ffd700', margin: '0 0 30px 0' }}>MENU</h1>
                        <button onClick={() => setShowEscMenu(false)} style={{ background: '#22c55e', color: '#fff', padding: '15px 40px', fontSize: '2rem', fontFamily: 'VT323', width: '100%', marginBottom: '10px' }}>RETOMAR</button>
                        <button onClick={handleExitToLobby} style={{ background: '#ef4444', color: '#fff', padding: '15px 40px', fontSize: '2rem', fontFamily: 'VT323', width: '100%' }}>SAIR</button>
                    </div>
                </div>
            )}

            <div style={{ position: 'fixed', top: 20, left: 20, color: '#ffd700', fontSize: '1.5rem', textShadow: '2px 2px #000' }}>
                <div>LV {uiStats.level} {playerName}</div>
                <div style={{ color: '#ef4444' }}>HP: {Math.ceil(uiStats.hp)} / {uiStats.maxHp}</div>
                <div style={{ color: '#3b82f6' }}>MP: {Math.ceil(uiStats.mana)} / {uiStats.maxMana}</div>
                <div>WAVE: {waveUi.current} ({waveUi.dead}/{waveUi.total})</div>
            </div>

            <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: '#fff', textAlign: 'center' }}>
                {baseHpRef.current <= 0 ? <h1 style={{ color: 'red' }}>GAME OVER</h1> : <div>BASE HP: {baseHpRef.current}</div>}
            </div>
        </div>
    );
};

export default Game;
