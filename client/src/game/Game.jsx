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
import { RULES } from './GameplayRules';
import { GameState } from './GameState';
import { RhythmSystem } from './systems/RhythmSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { PerformanceSystem } from './systems/PerformanceSystem';
import { ControlsSystem } from './systems/ControlsSystem';
import { Sword, Zap, Shield, Play } from 'lucide-react';
import MobileControls from '../components/MobileControls';
import VoiceChat from '../components/VoiceChat';
import { Settings, Maximize, Music, Mic, MicOff, ShoppingBag } from 'lucide-react';
const MAX_LEVEL = 30;

const LERP_FACTOR = 0.1;

const Game = ({ roomId, playerName, championId, initialGameMode, user, setInGame, socket }) => {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const minimapCanvasRef = useRef(null);

    // --- STATE ---
    const [gameMode, setGameMode] = useState(initialGameMode || 'standard');
    const [startTimer, setStartTimer] = useState(5);
    const [uiStats, setUiStats] = useState({ hp: 100, maxHp: 100, mana: 50, maxMana: 50, stamina: 100, maxStamina: 100, level: 1, xp: 0, maxXp: 50 });
    const [waveUi, setWaveUi] = useState({ current: 0, timer: 60, total: 0, dead: 0, baseHp: 1000 });
    const [showEscMenu, setShowEscMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768 || navigator.maxTouchPoints > 0);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [gameState, setGameState] = useState('starting');
    const [settings, setSettings] = useState(() => {
        const savedRaw = localStorage.getItem('gameSettings');
        const saved = savedRaw ? JSON.parse(savedRaw) : { showMyName: true, controlMode: 'wasd', musicEnabled: true };
        if (saved.controlMode === 'both') saved.controlMode = 'wasd';
        return {
            ...saved,
            godMode: saved.godMode || false,
            infStamina: saved.infStamina || false,
            superSpeed: saved.superSpeed || false
        };
    });

    // --- REFS ---
    const isHost = useRef(false);
    const amIHost = useRef(false);
    const gameStateRef = useRef(gameState);
    const settingsRef = useRef(settings);
    const playersRef = useRef([]);
    const myPos = useRef({ x: POSITIONS.BASE.x + Math.random() * 50, y: POSITIONS.BASE.y + Math.random() * 50 });
    const facingAngle = useRef(0);
    const cameraRef = useRef({ x: POSITIONS.BASE.x, y: POSITIONS.BASE.y });
    const keys = useRef({});
    const lastTimeRef = useRef(Date.now());
    const walkTimerRef = useRef(0);
    const lastPosRef = useRef({ ...myPos.current });
    const statsRef = useRef({
        ...getChamp(championId),
        maxHp: getChamp(championId).hp,
        maxMana: getChamp(championId).mana,
        atk: 1,
        stamina: 100, maxStamina: 100,
        xp: 0, maxXp: 50, level: 1,
        totalDamage: 0, kills: 0,
        gold: 0
    });
    const baseHpRef = useRef(1000);

    // Systems Refs
    const networkRef = useRef(null);
    const mobSystemRef = useRef(null);
    const combatRef = useRef(null);
    const gameStateObj = useRef(new GameState());
    const rhythmSystem = useRef(new RhythmSystem(120));
    const performanceSystem = useRef(new PerformanceSystem());
    const projectileSystem = useRef(new ProjectileSystem(performanceSystem.current));
    const controlsRef = useRef(new ControlsSystem());
    const lastAttack = useRef(0);

    // --- SYNC REFS ---
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    // --- COUNTDOWN ---
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

    // --- GAME INIT ---
    useEffect(() => {
        console.log(`[GAME] Init Room: ${roomId}`);

        const seed = Array.from(roomId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        // Initial Map Init 
        engineRef.current = new MapRenderer(canvasRef.current, seed, gameMode);
        console.log(`[GAME] Initializing with mode: ${gameMode}`);

        supabase.from('players').select('is_host').eq('room_id', roomId).eq('name', playerName).single()
            .then(({ data }) => {
                if (data?.is_host) {
                    isHost.current = true;
                    amIHost.current = true;
                    console.log('[GAME] I am HOST');
                }

                mobSystemRef.current = new MobSystem(isHost.current, performanceSystem.current, gameMode);
                combatRef.current = new CombatSystem();

                networkRef.current = new NetworkSystem(
                    roomId,
                    playerName,
                    (payload) => {
                        const idx = playersRef.current.findIndex(p => p.id === payload.id);
                        if (idx === -1) playersRef.current.push(payload);
                        else playersRef.current[idx] = payload;
                    },
                    (state) => {
                        if (!isHost.current) {
                            gameStateObj.current.syncFromHost(state);
                            if (mobSystemRef.current) {
                                mobSystemRef.current.syncFromHost(state.mobs);
                                // Handle both standard wave and boss rush state if we add it
                                mobSystemRef.current.waveStats.current = state.wave?.current || 0;
                                mobSystemRef.current.waveStats.timer = state.wave?.timer || 0;
                            }
                            if (projectileSystem.current) {
                                projectileSystem.current.projectiles = state.projectiles || [];
                            }
                            if (state.baseHp !== undefined) baseHpRef.current = state.baseHp;
                        }
                    }
                );
                networkRef.current.connect();

                if (socket) {
                    socket.emit('join_room', { roomId, userId: user?.id });

                    socket.on('room_joined', (data) => {
                        if (data.gameMode && data.gameMode !== 'standard') {
                            console.log(`[GAME] Switching to mode: ${data.gameMode}`);
                            setGameMode(data.gameMode);
                            engineRef.current = new MapRenderer(canvasRef.current, seed, data.gameMode);
                            if (mobSystemRef.current) mobSystemRef.current.gameMode = data.gameMode;
                        }
                    });

                    socket.on('game_state', (state) => {
                        try {
                            if (!state) return;
                            if (window._syncConfirmed !== true) {
                                console.log('[GAME] Authoritative sync received!');
                                window._syncConfirmed = true;
                            }

                            if (isHost.current) {
                                isHost.current = false;
                                if (mobSystemRef.current) mobSystemRef.current.isHost = false;
                            }

                            gameStateObj.current.syncFromHost(state);

                            // Sync Player
                            const serverMe = state.players?.[socket.id];
                            if (serverMe) {
                                statsRef.current.hp = serverMe.hp;
                                statsRef.current.maxHp = serverMe.maxHp;
                                statsRef.current.mana = serverMe.mana;
                                statsRef.current.stamina = serverMe.stamina;
                                statsRef.current.gold = serverMe.gold || 0;
                            }

                            // Sync Mobs & Wave
                            if (mobSystemRef.current && state.wave) {
                                mobSystemRef.current.syncFromHost(state.enemies || state.mobs || []);
                                mobSystemRef.current.waveStats.current = state.wave.current;
                                mobSystemRef.current.waveStats.timer = state.wave.timer;
                                mobSystemRef.current.waveStats.totalMobs = state.wave.total || 0;
                                mobSystemRef.current.waveStats.deadMobs = state.wave.dead || 0;

                                setWaveUi({
                                    current: state.wave.current,
                                    timer: state.wave.timer,
                                    total: state.wave.total || 0,
                                    dead: state.wave.dead || 0,
                                    baseHp: state.base?.hp || 1000
                                });
                            }

                            if (projectileSystem.current) {
                                projectileSystem.current.projectiles = state.projectiles || [];
                            }
                        } catch (err) {
                            console.error('[GAME] Sync Error:', err);
                        }
                    });
                }
            });

        // Resize
        const resize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();

        // Loop
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

        const handleKeyActions = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'escape') setShowEscMenu(p => !p);

            if (gameStateRef.current === 'playing' && !showEscMenu) {
                const s = settingsRef.current;
                const isWASD = s.controlMode === 'wasd';
                const isArrows = s.controlMode === 'arrows';

                if (isWASD) {
                    if (key === '1') useSkill(1);
                    if (key === '2') useSkill(2);
                    if (key === 'q') basicAttack();
                } else if (isArrows) {
                    if (key === 'q') useSkill(1);
                    if (key === 'w') useSkill(2);
                    if (key === 'a') basicAttack();
                }

                if (key === ' ') dash();
            }
        };
        window.addEventListener('keydown', handleKeyActions);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', handleKeyActions);
            cancelAnimationFrame(animationFrame);
            if (networkRef.current) networkRef.current.cleanup();
            if (socket) {
                socket.off('game_state');
                socket.off('room_joined');
                socket.off('player_joined'); // Ensure all are removed
            }
        };
    }, []);

    const updateGame = (dt) => {
        handleMovement(dt);

        cameraRef.current.x += (myPos.current.x - cameraRef.current.x) * LERP_FACTOR;
        cameraRef.current.y += (myPos.current.y - cameraRef.current.y) * LERP_FACTOR;

        if (mobSystemRef.current && combatRef.current) {
            // Update Rhythm
            rhythmSystem.current.update();

            const { xpGain, kills, playerDamage } = mobSystemRef.current.update(
                dt,
                [...playersRef.current, { id: playerName, x: myPos.current.x, y: myPos.current.y, hp: statsRef.current.hp }],
                baseHpRef,
                (x, y, val, color) => combatRef.current.spawnDamage(x, y, val, color),
                setGameState,
                engineRef.current
            );

            if (xpGain > 0) gainXp(xpGain);
            if (kills > 0) statsRef.current.kills += kills;

            // Update Projectiles
            projectileSystem.current.update(
                dt,
                mobSystemRef.current.mobs,
                playersRef.current,
                (p, m) => {
                    // On Hit Mob
                    m.hp -= p.dmg;
                    combatRef.current.spawnDamage(m.x, m.y, Math.ceil(p.dmg), '#fff');
                    combatRef.current.addAttackEffect(m.x, m.y, Math.random() * Math.PI * 2, 'impact');
                }
            );

            // Handle player damage
            if (playerDamage && playerDamage.length > 0) {
                const s = settingsRef.current;
                playerDamage.forEach(d => {
                    if (d.id === playerName && !s.godMode && gameStateRef.current === 'playing') {
                        statsRef.current.hp = Math.max(0, statsRef.current.hp - d.dmg);
                        combatRef.current.spawnDamage(d.x, d.y, d.dmg, '#ff0000');
                        if (statsRef.current.hp <= 0) {
                            statsRef.current.hp = 0;
                            setGameState('dead');
                        }
                    }
                });
            }

            // Check Global Game Over Condition (All players dead)
            if (gameStateRef.current === 'playing' || gameStateRef.current === 'dead') {
                const allPlayers = [...playersRef.current, { id: playerName, hp: statsRef.current.hp }];
                const anyAlive = allPlayers.some(p => p.hp === undefined || p.hp > 0);
                // Only trigger Game Over if players exist and all are dead
                if (allPlayers.length > 0 && !anyAlive) {
                    setGameState('over');
                }
            }

            if (isHost.current) {
                // Update Authoritative GameState with current snapshots
                gameStateObj.current.mobs = mobSystemRef.current.mobs;
                gameStateObj.current.projectiles = projectileSystem.current.projectiles;
                gameStateObj.current.wave = mobSystemRef.current.waveSystem.currentWave;
                gameStateObj.current.timer = Math.ceil(mobSystemRef.current.waveSystem.nextWaveTimer);
                gameStateObj.current.baseHp = baseHpRef.current;

                networkRef.current.sendGameStateUpdate(gameStateObj.current.getSnapshot());
            }

            combatRef.current.update(dt, mobSystemRef.current.mobs, (x, y, v) => combatRef.current.spawnDamage(x, y, v));
        }

        // Efficient UI updates
        setUiStats({ ...statsRef.current });

        const myStatuses = mobSystemRef.current?.statusSystem?.effects?.get(playerName) || [];
        const statusObj = {};
        myStatuses.forEach(s => statusObj[s.type] = s);

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
                statuses: statusObj,
                isMoving: Math.hypot(myPos.current.x - lastPosRef.current.x, myPos.current.y - lastPosRef.current.y) > 0.1
            };
            networkRef.current.sendPlayerUpdate(me);

            // Authoritative Sync to Socket.IO Server
            if (socket) {
                const s = settingsRef.current;
                const mode = s.controlMode || 'wasd';
                const input = controlsRef.current.getMovement(mode);
                socket.emit('player_input', {
                    roomId,
                    input: {
                        vector: { x: input.mx, y: input.my },
                        pos: { x: myPos.current.x, y: myPos.current.y }, // Snap position
                        actions: {
                            skill_q: controlsRef.current.isPressed('1') || controlsRef.current.isPressed('q'),
                            skill_space: controlsRef.current.isPressed(' ')
                        }
                    }
                });
            }
        }

        // 4. Natural Regeneration (HP, Mana, Stamina)
        const s = settingsRef.current;
        const regenRate = s.godMode ? 100 : 5;
        const manaRegen = 2;
        const stamRegen = s.infStamina ? 100 : 15;

        if (statsRef.current.hp < statsRef.current.maxHp) {
            statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + regenRate * dt);
        }
        if (statsRef.current.mana < statsRef.current.maxMana) {
            statsRef.current.mana = Math.min(statsRef.current.maxMana, statsRef.current.mana + manaRegen * dt);
        }
        if (statsRef.current.stamina < statsRef.current.maxStamina) {
            statsRef.current.stamina = Math.min(statsRef.current.maxStamina, statsRef.current.stamina + stamRegen * dt);
        }

        if (mobSystemRef.current) {
            const ws = mobSystemRef.current.waveStats;
            if (ws.current !== waveUi.current || ws.deadMobs !== waveUi.dead || ws.totalMobs !== waveUi.total || Math.ceil(ws.timer) !== Math.ceil(waveUi.timer)) {
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
        const s = settingsRef.current;
        const mode = s.controlMode || 'wasd';
        const rawMove = controlsRef.current.getMovement(mode);

        const speed = s.superSpeed ? RULES.SUPER_SPEED : RULES.PLAYER_SPEED;
        let mx = rawMove.mx * speed;
        let my = rawMove.my * speed;

        // Friction / Smoothing for "less silly" controls
        // Currently direct, but let's ensure normalization from getMovement is used

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

            // Angle updates from movement
            facingAngle.current = Math.atan2(my, mx);
            walkTimerRef.current += dt * 5;
            lastPosRef.current = { ...myPos.current };
        }

        // Mouse Overrides Angle
        if (controlsRef.current.mouse.isDown) {
            facingAngle.current = controlsRef.current.mouse.angle;
            basicAttack();
        }

        // Tab for Scoreboard (Polling-friendly)
        setShowScoreboard(controlsRef.current.isPressed('tab'));
    };

    const basicAttack = () => {
        if (!combatRef.current) return;
        const champ = getChamp(championId);

        const now = Date.now();
        if (now - (lastAttack.current || 0) < (champ.basic.cd || 400)) return;
        lastAttack.current = now;

        // Rhythm Validation ONLY for J. Charles
        let finalDmg = statsRef.current.atk * champ.basic.dmg;
        const isCharles = championId === 'charles' || championId === 'rafarofa';

        if (isCharles) {
            const rhythm = rhythmSystem.current.validateInput();
            finalDmg *= (rhythm.multiplier || 1.0);

            if (rhythm.rating === 'perfect') {
                combatRef.current.spawnDamage(myPos.current.x, myPos.current.y - 40, "PERFECT!", "#ffd700");
            } else if (rhythm.rating === 'miss') {
                combatRef.current.spawnDamage(myPos.current.x, myPos.current.y - 40, "MISS...", "#666");
                return; // Penalty: attack fails for Charles
            }
        }

        const angle = facingAngle.current;
        combatRef.current.addAttackEffect(myPos.current.x, myPos.current.y, angle, championId);

        if (champ.basic.ranged) {
            // Use new ProjectileSystem with champion config
            projectileSystem.current.spawn({
                x: myPos.current.x,
                y: myPos.current.y,
                angle: angle,
                speed: champ.basic.projSpeed || 10,
                ownerId: playerName,
                dmg: finalDmg,
                lifetime: champ.basic.projLifetime || 1500,
                color: champ.color || '#fff',
                ...(champ.basic.proj || { type: 'linear' })
            });
        } else {
            mobSystemRef.current.mobs.forEach(m => {
                const dist = Math.hypot(m.x - myPos.current.x, m.y - myPos.current.y);
                if (dist < champ.basic.range + 20) {
                    const angleToMob = Math.atan2(m.y - myPos.current.y, m.x - myPos.current.x);
                    let diff = angleToMob - angle;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    if (Math.abs(diff) < champ.basic.arc / 2) {
                        m.hp -= finalDmg;
                        combatRef.current.spawnDamage(m.x, m.y, Math.ceil(finalDmg), '#fff');
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

        const result = castSkill(
            championId,
            { ...myPos.current, angle: facingAngle.current, level: statsRef.current.level },
            mobSystemRef.current.mobs,
            projectileSystem.current,
            mobSystemRef.current.statusSystem,
            engineRef.current?.mapData,
            combatRef.current.damageNumbers,
            { current: null },
            index
        );
        statsRef.current.mana -= skillData.cost;
        statsRef.current[skillKey] = now;
        setUiStats({ ...statsRef.current });
        combatRef.current.addAttackEffect(myPos.current.x, myPos.current.y, facingAngle.current, 'skill');

        if (result.heal) {
            statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + result.heal);
            combatRef.current.spawnDamage(myPos.current.x, myPos.current.y, `+${Math.floor(result.heal)}`, "#22c55e");
        }
        if (result.teleport) myPos.current = { ...result.teleport };
        if (result.totalDamage) statsRef.current.totalDamage += result.totalDamage;
    };

    const dash = () => {
        if (!settings.infStamina && statsRef.current.stamina < RULES.DASH_STAMINA_COST) {
            combatRef.current.spawnDamage(myPos.current.x, myPos.current.y, "CANSAÇO!", "#f59e0b");
            return;
        }

        const ddist = 140;
        const map = engineRef.current?.mapData;

        let targetX = myPos.current.x;
        let targetY = myPos.current.y;

        const cos = Math.cos(facingAngle.current);
        const sin = Math.sin(facingAngle.current);

        const step = 5;
        for (let d = step; d <= ddist; d += step) {
            const nextX = myPos.current.x + cos * d;
            const nextY = myPos.current.y + sin * d;

            if (PhysicsSystem.canPass(nextX, nextY, 'dash', map)) {
                targetX = nextX;
                targetY = nextY;
            } else break;
        }

        myPos.current.x = targetX;
        myPos.current.y = targetY;

        if (!settings.infStamina) statsRef.current.stamina -= RULES.DASH_STAMINA_COST;
        combatRef.current.addAttackEffect(myPos.current.x, myPos.current.y, facingAngle.current, 'burst');
    };

    const respawn = () => {
        statsRef.current.hp = statsRef.current.maxHp;
        statsRef.current.mana = statsRef.current.maxMana;
        statsRef.current.stamina = statsRef.current.maxStamina;
        myPos.current = { x: POSITIONS.BASE.x + Math.random() * 50, y: POSITIONS.BASE.y + Math.random() * 50 };
        setGameState('playing');
        setUiStats({ ...statsRef.current });
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
        const extraEntities = [];
        if (mobSystemRef.current?.waveSystem?.nextWaveTimer > 0) {
            extraEntities.push({ type: 'wave_timer', value: mobSystemRef.current.waveStats.timer });
        }

        const myStatuses = mobSystemRef.current?.statusSystem?.effects?.get(playerName) || [];
        const statusObj = {};
        myStatuses.forEach(s => statusObj[s.type] = s);

        engineRef.current.draw(
            [...playersRef.current, { ...me, statuses: statusObj }, ...extraEntities],
            cameraRef.current,
            [],
            mobSystemRef.current ? mobSystemRef.current.mobs : [],
            projectileSystem.current ? projectileSystem.current.projectiles : [],
            combatRef.current ? combatRef.current.damageNumbers : [],
            combatRef.current?.attackEffects[0],
            baseHpRef.current,
            1000,
            []
        );
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

            {gameState === 'dead' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(50,0,0,0.7)', color: '#fff' }}>
                    <h1 style={{ fontSize: '5rem', color: '#ff4444', textShadow: '4px 4px #000' }}>VOCÊ CAIU!</h1>
                    <p style={{ fontSize: '2rem', marginBottom: '30px' }}>Mas a batalha ainda não acabou...</p>
                    <button onClick={respawn} style={{ background: '#22c55e', color: '#fff', padding: '15px 40px', fontSize: '2.5rem', fontFamily: 'VT323', border: '5px solid #fff', cursor: 'pointer', borderRadius: '8px', boxShadow: '0 0 20px #22c55e' }}>
                        RENASCER (RESSURREIÇÃO)
                    </button>
                </div>
            )}

            {gameState === 'over' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.95)', color: '#ffd700' }}>
                    <h1 style={{ fontSize: '6rem', marginBottom: '10px', textShadow: '0 0 30px #ff0000', color: '#ff0000' }}>FIM DE JOGO</h1>
                    <p style={{ fontSize: '2rem', color: '#fff', marginBottom: '40px' }}>Todos os heróis foram derrotados.</p>
                    <button onClick={handleExitToLobby} style={{ background: '#ffd700', color: '#000', padding: '15px 60px', fontSize: '2.5rem', fontFamily: 'VT323', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
                        VOLTAR AO LOBBY
                    </button>
                </div>
            )}

            <canvas ref={canvasRef} />

            <VoiceChat roomId={roomId} userId={user?.id} playerName={playerName} minimal={true} />


            {/* Render mobile controls only on touch devices */}
            {('ontouchstart' in window || navigator.maxTouchPoints > 0) && (
                <MobileControls
                    onInput={(input) => {
                        // Mobile joystick sends { mx, my } normalized vectors
                        if (input && typeof input === 'object' && 'mx' in input) {
                            controlsRef.current.mobileInput = input;
                        }
                    }}
                    onAction={(type) => {
                        if (type === 'attack') basicAttack();
                        if (type === 'skill') useSkill();
                        if (type === 'skill2') useSkill2();
                        if (type === 'dash') dash();
                    }}
                />
            )}


            <div style={{ position: 'fixed', top: 20, left: 20, pointerEvents: 'none', zIndex: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', padding: '12px', border: '3px solid #ffd700', borderRadius: '4px', minWidth: '200px' }}>
                    <div style={{ fontSize: '1.4rem', color: '#ffd700', marginBottom: '8px', borderBottom: '1px solid rgba(255,215,0,0.3)', paddingBottom: '4px' }}>
                        {getChamp(championId).name.toUpperCase()} - LV {uiStats.level}
                    </div>

                    {/* HP BAR */}
                    <div style={{ width: '100%', height: '22px', background: '#333', border: '2px solid #000', position: 'relative' }}>
                        <div style={{ width: `${Math.min(100, (uiStats.hp / (uiStats.maxHp || statsRef.current.maxHp || 100)) * 100)}%`, height: '100%', background: '#ef4444', transition: 'width 0.2s' }} />
                        <span style={{ position: 'absolute', inset: 0, textAlign: 'center', fontSize: '1rem', color: '#fff', textShadow: '2px 2px #000', lineHeight: '20px', fontWeight: 'bold' }}>
                            ❤️ {Math.ceil(uiStats.hp)} / {uiStats.maxHp || statsRef.current.maxHp || 120}
                        </span>
                    </div>

                    {/* MANA BAR */}
                    <div style={{ width: '100%', height: '18px', background: '#333', border: '2px solid #000', marginTop: '6px', position: 'relative' }}>
                        {/* Fix: Clamp width to 100% to avoid overflow if current mana > max mana temporarily */}
                        <div style={{ width: `${Math.min(100, (uiStats.mana / (uiStats.maxMana || statsRef.current.maxMana || 100)) * 100)}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s' }} />
                        <span style={{ position: 'absolute', inset: 0, textAlign: 'center', fontSize: '0.9rem', color: '#fff', textShadow: '1px 1px #000', lineHeight: '16px', fontWeight: 'bold' }}>
                            💧 {Math.ceil(uiStats.mana)} / {uiStats.maxMana || statsRef.current.maxMana || 120}
                        </span>
                    </div>

                    {/* STAMINA BAR */}
                    <div style={{ width: '100%', height: '14px', background: '#333', border: '2px solid #000', marginTop: '6px', position: 'relative' }}>
                        <div style={{ width: `${(uiStats.stamina / uiStats.maxStamina) * 100}%`, height: '100%', background: '#f59e0b', transition: 'width 0.2s' }} />
                        <span style={{ position: 'absolute', inset: 0, textAlign: 'center', fontSize: '0.7rem', color: '#fff', textShadow: '1px 1px #000', lineHeight: '12px', fontWeight: 'bold' }}>
                            ⚡ STAMINA: {Math.ceil(uiStats.stamina)}%
                        </span>
                    </div>

                    {/* STATS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '1rem', color: '#ffd700', opacity: 0.9 }}>
                        <span>⚔️ {uiStats.atk}</span>
                        <span>💀 {uiStats.kills}</span>
                        <span>👤 {playerName}</span>
                    </div>

                    {/* SKILLS HUD */}
                    <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                        {[1, 2].map(idx => {
                            const champ = getChamp(championId);
                            const skill = idx === 2 ? (champ.skill2 || { name: '-', cost: 0, cd: 0 }) : champ.skill;
                            const isArrows = settings.controlMode === 'arrows';
                            const keyName = isArrows ? (idx === 1 ? 'Q' : 'W') : (idx === 1 ? '1' : '2');
                            const skillKey = idx === 2 ? 'lastSkillTime2' : 'lastSkillTime';
                            const now = Date.now();
                            const onCd = statsRef.current[skillKey] && now - statsRef.current[skillKey] < skill.cd;

                            return (
                                <div key={idx} style={{ flex: 1, background: 'rgba(0,0,0,0.4)', padding: '4px', border: onCd ? '1px solid #ef4444' : '1px solid #ffd700', borderRadius: '4px', opacity: onCd ? 0.6 : 1, textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: onCd ? '#ef4444' : '#ffd700', overflow: 'hidden', textOverflow: 'ellipsis' }}>[{keyName}] {skill.name}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#aaa' }}>{skill.cost} MP</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div style={{ position: 'fixed', top: 20, right: 20, textAlign: 'right', zIndex: 10 }}>
                {gameMode === 'boss_rush' ? (
                    <div style={{ background: 'rgba(50,0,0,0.8)', padding: '15px', border: '3px solid #ff4444', borderRadius: '4px', minWidth: '200px' }}>
                        <div style={{ fontSize: '2.2rem', color: '#ff4444' }}>BOSS RUSH</div>
                        <div style={{ fontSize: '1.2rem', color: '#fff' }}>SOBREVIVA AO COLISEU</div>
                    </div>
                ) : (
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '15px', border: '3px solid #ffd700', borderRadius: '4px', minWidth: '200px' }}>
                        <div style={{ fontSize: '2.2rem', color: '#ffd700' }}>ONDA {waveUi.current}</div>
                        <div style={{ fontSize: '1.2rem', color: '#fff', opacity: 0.8 }}>MOBS: {waveUi.dead}/{waveUi.total}</div>

                        {waveUi.timer > 0 && waveUi.dead >= waveUi.total && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold' }}>PRÓXIMA EM: {Math.ceil(waveUi.timer)}s</div>
                                {amIHost.current && (
                                    <button
                                        onClick={() => {
                                            if (socket) socket.emit('wave_control', { roomId, type: 'skip_wave' });
                                            else mobSystemRef.current?.skipWaveWaiting();
                                        }}
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

                        {amIHost.current && waveUi.dead < waveUi.total && (
                            <button
                                onClick={() => {
                                    if (socket) socket.emit('wave_control', { roomId, type: 'spawn_all' });
                                    else mobSystemRef.current?.spawnInstant();
                                }}
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
                )}

                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'flex-end', pointerEvents: 'auto' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #ffd700', color: '#ffd700', padding: '5px 10px', borderRadius: '4px', fontSize: '0.9rem' }}>
                        CONTROLES: {settings.controlMode === 'arrows' ? 'SETAS + QWER' : 'WASD + 1234'}
                    </div>
                    {/* SHOP BUTON */}
                    <button onClick={() => setShowShop(true)} style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #ffd700', color: '#ffd700', padding: '10px', borderRadius: '4px', cursor: 'pointer' }} title="Loja (P)">
                        <ShoppingBag size={24} />
                    </button>
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
            {
                showScoreboard && (
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
                )
            }

            <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 10 }}>
                <button onClick={toggleFullscreen} style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #ffd700', color: '#ffd700', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', pointerEvents: 'auto' }}>FULLSCREEN</button>
            </div>

            {/* Shop UI */}
            {showShop && (
                <Shop
                    gold={Math.floor(uiStats.gold || 0)}
                    buyUpgrade={(type, cost) => {
                        if (socket) socket.emit('buy_upgrade', { type, cost });
                        // Optimistic update could go here, but waiting for server is safer
                    }}
                    onClose={() => setShowShop(false)}
                />
            )}

            {/* Settings Menu */}
            {
                showSettings && (
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

                                {/* ADMIN/HOST CHEATS */}
                                {(playerName === 'admin' || amIHost.current) && (
                                    <div style={{ marginTop: '20px', borderTop: '2px solid #555', paddingTop: '15px' }}>
                                        <h3 style={{ color: '#ffd700', fontSize: '1rem', marginBottom: '10px' }}>PAINEL ADMIN / HOST</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {[
                                                { label: 'Vida Infinita', key: 'godMode' },
                                                { label: 'Stamina Infinita', key: 'infStamina' },
                                                { label: 'Super Velocidade', key: 'superSpeed' }
                                            ].map(cheat => (
                                                <div key={cheat.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{cheat.label}</span>
                                                    <button onClick={() => {
                                                        const ns = { ...settings, [cheat.key]: !settings[cheat.key] };
                                                        setSettings(ns); localStorage.setItem('gameSettings', JSON.stringify(ns));
                                                    }} style={{ padding: '4px 10px', background: settings[cheat.key] ? '#16a34a' : '#555', border: 'none', color: '#fff', fontFamily: 'VT323', fontSize: '1rem', cursor: 'pointer' }}>
                                                        {settings[cheat.key] ? 'ATIVO' : 'OFF'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setShowSettings(false)} style={{ background: '#ffd700', color: '#000', padding: '10px 40px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>FECHAR</button>
                            {settings.musicEnabled && <div style={{ display: 'none' }}><MusicPlayer /></div>}
                        </div>
                    </div>
                )
            }

            {/* Mobile Controls Overlay */}
            {isMobile && gameStateRef.current === 'playing' && (
                <MobileControls
                    onInput={(joystick) => {
                        if (controlsSystem.current) controlsSystem.current.handleJoystick(joystick);
                    }}
                    onAction={(action) => {
                        if (controlsSystem.current) controlsSystem.current.handleAction(action);
                    }}
                />
            )}

            {
                showEscMenu && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                        <div style={{ background: '#1a1a1a', border: '5px solid #ffd700', padding: '40px 60px', textAlign: 'center' }}>
                            <h1 style={{ fontSize: '4rem', color: '#ffd700', margin: '0 0 30px 0' }}>MENU</h1>
                            <button onClick={() => setShowEscMenu(false)} style={{ background: '#22c55e', color: '#fff', padding: '15px 40px', fontSize: '2rem', fontFamily: 'VT323', width: '100%', marginBottom: '10px', border: 'none', cursor: 'pointer' }}>RETOMAR</button>
                            <button onClick={handleExitToLobby} style={{ background: '#ef4444', color: '#fff', padding: '15px 40px', fontSize: '2rem', fontFamily: 'VT323', width: '100%', border: 'none', cursor: 'pointer' }}>SAIR</button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Game;
