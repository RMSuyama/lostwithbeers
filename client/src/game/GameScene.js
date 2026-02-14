import Phaser from 'phaser';
import InputManager from './InputManager';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.players = {};
        this.enemies = {};
        this.uiElements = {};
        this.minimapGraphics = null;

        // Map Config
        this.mapSize = { width: 3200, height: 3200 };

        // UI Config
        this.skillConfig = {
            'skill_q': { name: 'Q', maxCd: 2.0, cost: 15, color: 0xff0000 },
            'skill_w': { name: 'W', maxCd: 0, cost: 0, color: 0x888888 },
            'skill_e': { name: 'E', maxCd: 0, cost: 0, color: 0x888888 },
            'skill_r': { name: 'R', maxCd: 0, cost: 0, color: 0x888888 },
            'skill_space': { name: 'SPC', maxCd: 3.0, cost: 10, color: 0x00ffff }
        };
    }

    init(data) {
        this.socket = data.socket;
        this.roomId = data.roomId;
    }

    preload() {
        this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
    }

    create() {
        this.inputManager = new InputManager(this);

        // Set World Bounds
        this.physics.world.setBounds(0, 0, this.mapSize.width, this.mapSize.height);
        this.cameras.main.setBounds(0, 0, this.mapSize.width, this.mapSize.height);

        // Groups
        this.walls = this.add.group(); // World objects
        this.projectiles = this.add.group(); // World objects

        // UI Layer (ScrollFactor 0 to stick to screen)
        this.uiContainer = this.add.container(0, 0).setScrollFactor(0);
        this.createSkillBar();
        this.createMinimap();

        // Socket Events
        this.socket.on('game_state', (state) => {
            this.renderWalls(state.collisionMap);
            this.renderPlayers(state.players);
            this.renderEnemies(state.enemies);
            this.renderProjectiles(state.projectiles);
            this.updateUI(state.players[this.socket.id]);
            this.updateMinimap(state);
        });

        this.socket.emit('ready', { roomId: this.roomId });

        // Instructions (added to UI container)
        const instructions = this.add.text(10, 10, 'Arrows: Move | Q: Fireball | Space: Dash', { fontSize: '16px', fill: '#fff' });
        this.uiContainer.add(instructions);
    }

    createSkillBar() {
        const startX = 250;
        const startY = 520; // Fixed Y pos on screen
        const gap = 60;
        const size = 50;

        const skills = ['skill_q', 'skill_w', 'skill_e', 'skill_r', 'skill_space'];

        skills.forEach((key, index) => {
            const cfg = this.skillConfig[key];
            const x = startX + index * gap;

            const bg = this.add.rectangle(x, startY, size, size, 0x222222).setStrokeStyle(2, 0xffffff);
            const icon = this.add.rectangle(x, startY, size - 4, size - 4, cfg.color);
            const cdOverlay = this.add.rectangle(x, startY, size, size, 0x000000, 0.7);
            cdOverlay.height = 0;
            cdOverlay.setOrigin(0.5, 1);
            cdOverlay.y = startY + size / 2;

            const keyText = this.add.text(x - 20, startY - 20, cfg.name, { fontSize: '12px', fontStyle: 'bold' });
            const costText = this.add.text(x + 5, startY + 10, cfg.cost > 0 ? `${cfg.cost}` : '', { fontSize: '10px', color: '#55ffff' });

            this.uiContainer.add([bg, icon, cdOverlay, keyText, costText]);
            this.uiElements[key] = { overlay: cdOverlay };
        });
    }

    createMinimap() {
        // Bottom Right
        const size = 150;
        const x = 800 - size - 10;
        const y = 600 - size - 10;

        const bg = this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000).setStrokeStyle(2, 0x00ff00);
        this.uiContainer.add(bg);

        this.minimapGraphics = this.add.graphics();
        this.minimapGraphics.setScrollFactor(0); // Stick to camera
        this.uiContainer.add(this.minimapGraphics);

        this.minimapConfig = { x, y, size, scale: size / this.mapSize.width };
    }

    updateMinimap(state) {
        if (!this.minimapGraphics) return;
        const g = this.minimapGraphics;
        const cfg = this.minimapConfig;

        g.clear();

        // Draw Players (Dots)
        for (const id in state.players) {
            const p = state.players[id];
            const mx = cfg.x + p.x * cfg.scale;
            const my = cfg.y + p.y * cfg.scale;

            const color = (id === this.socket.id) ? 0x00ff00 : 0xff0000;
            g.fillStyle(color, 1);
            g.fillCircle(mx, my, 3);
        }

        // Draw Enemies with type colors
        if (state.enemies) {
            const mobColors = {
                scout: 0xff8c00,
                warrior: 0xff0000,
                brute: 0x9932cc,
                ghost: 0x00ff00,
                boss: 0xffd700
            };

            for (const e of state.enemies) {
                const mx = cfg.x + e.x * cfg.scale;
                const my = cfg.y + e.y * cfg.scale;
                const color = mobColors[e.type] || 0xff0000;
                const size = e.type === 'boss' ? 4 : 2;

                g.fillStyle(color, e.type === 'ghost' ? 0.7 : 1);
                g.fillCircle(mx, my, size);
            }
        }

        // Draw Base (Big Green Dot)
        if (state.base) {
            g.fillStyle(0x00ff00, 1);
            const bx = cfg.x + state.base.x * cfg.scale;
            const by = cfg.y + state.base.y * cfg.scale;
            g.fillRect(bx - 2, by - 2, 4, 4);
        }

        // Draw Walls (Optimization: maybe draw once to texture?)
        // For now, iterate collision map is too slow every frame?
        // Just drawing players is enough for now or static walls?
        // Let's rely on server collision map rendering only once to a container, 
        // but for minimap we need to scale. 
        // Simple Hack: Draw map bounds
        g.lineStyle(1, 0x555555);
        g.strokeRect(cfg.x, cfg.y, cfg.size, cfg.size);
    }

    updateUI(myPlayer) {
        if (!myPlayer) return;

        // Update Cooldowns
        for (const [key, el] of Object.entries(this.uiElements)) {
            const cfg = this.skillConfig[key];
            const currentCd = myPlayer.cooldowns[key] || 0;

            if (cfg.maxCd > 0) {
                const ratio = Math.max(0, currentCd / cfg.maxCd);
                el.overlay.height = 50 * ratio;
            } else {
                el.overlay.height = 0;
            }
        }
    }

    update() {
        if (!this.inputManager) return;
        const inputState = this.inputManager.update();
        if (this.socket && this.socket.connected) {
            this.socket.emit('player_input', { roomId: this.roomId, input: inputState });
        }
    }

    renderWalls(mapData) {
        if (!mapData || this.walls.getLength() > 0) return;

        const size = 40;
        const width = 80; // Updated width

        mapData.forEach((val, index) => {
            if (val === 1) {
                const x = (index % width) * size + size / 2;
                const y = Math.floor(index / width) * size + size / 2;
                const wall = this.add.rectangle(x, y, size, size, 0x555555);
                this.walls.add(wall);
            }
        });
    }

    renderEnemies(serverEnemies) {
        if (!serverEnemies) return;

        const activeIds = new Set();

        // Color mapping for mob types
        const mobColors = {
            scout: 0xff8c00,    // Orange
            warrior: 0xff0000,  // Red
            brute: 0x9932cc,    // Purple
            ghost: 0x00ff00,    // Green
            boss: 0xffd700      // Gold
        };

        serverEnemies.forEach(enemy => {
            activeIds.add(enemy.id);
            let container = this.enemies[enemy.id];

            if (!container) {
                // Create new enemy
                container = this.add.container(enemy.x, enemy.y);

                const color = mobColors[enemy.type] || 0xff0000;
                const size = enemy.size || 30;

                // Main body (circle)
                const body = this.add.circle(0, 0, size / 2, color);
                body.setStrokeStyle(2, 0x000000);

                // HP Bar background
                const hpBarBg = this.add.rectangle(0, -size / 2 - 8, size + 4, 6, 0x000000);
                // HP Bar foreground
                const hpBar = this.add.rectangle(0, -size / 2 - 8, size, 4, 0x00ff00);
                hpBar.setOrigin(0.5);

                // Type label
                const label = this.add.text(0, size / 2 + 5, enemy.type.toUpperCase(), {
                    fontSize: '10px',
                    fill: '#fff',
                    fontStyle: 'bold',
                    stroke: '#000',
                    strokeThickness: 2
                }).setOrigin(0.5);

                // State indicator (chasing vs pathing)
                const stateIndicator = this.add.circle(size / 2 - 5, -size / 2 + 5, 4, 0xffff00);
                stateIndicator.setVisible(false);

                container.add([body, hpBarBg, hpBar, label, stateIndicator]);
                container.body = body;
                container.hpBar = hpBar;
                container.hpBarBg = hpBarBg;
                container.label = label;
                container.stateIndicator = stateIndicator;
                container.maxSize = size;

                this.enemies[enemy.id] = container;
            }

            // Update position with interpolation
            container.x = Phaser.Math.Linear(container.x, enemy.x, 0.3);
            container.y = Phaser.Math.Linear(container.y, enemy.y, 0.3);

            // Update HP bar
            const hpPct = enemy.hp / enemy.maxHp;
            container.hpBar.width = container.maxSize * hpPct;

            // Color HP bar based on health
            if (hpPct > 0.6) {
                container.hpBar.setFillStyle(0x00ff00); // Green
            } else if (hpPct > 0.3) {
                container.hpBar.setFillStyle(0xffff00); // Yellow
            } else {
                container.hpBar.setFillStyle(0xff0000); // Red
            }

            // Show state indicator when chasing
            if (enemy.state === 'chasing') {
                container.stateIndicator.setVisible(true);
                container.stateIndicator.setFillStyle(0xff0000); // Red when aggressive
            } else {
                container.stateIndicator.setVisible(false);
            }

            // Pulse effect for boss
            if (enemy.type === 'boss') {
                const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                container.body.setScale(scale);
            }

            // Ghost transparency
            if (enemy.type === 'ghost') {
                container.body.setAlpha(0.7);
            }
        });

        // Remove dead enemies
        for (const id in this.enemies) {
            if (!activeIds.has(id)) {
                this.enemies[id].destroy();
                delete this.enemies[id];
            }
        }
    }

    renderProjectiles(serverProjectiles) {
        if (!serverProjectiles) return;
        const activeIds = new Set();

        serverProjectiles.forEach(proj => {
            activeIds.add(proj.id);
            let sprite = this.projectiles.getChildren().find(p => p.name === proj.id);

            if (!sprite) {
                sprite = this.add.circle(proj.x, proj.y, 5, 0xff0000);
                sprite.name = proj.id;
                this.projectiles.add(sprite);
            }

            sprite.x = Phaser.Math.Linear(sprite.x, proj.x, 0.5);
            sprite.y = Phaser.Math.Linear(sprite.y, proj.y, 0.5);
        });

        this.projectiles.getChildren().forEach(p => {
            if (!activeIds.has(p.name)) p.destroy();
        });
    }

    renderPlayers(serverPlayers) {
        for (const id in serverPlayers) {
            const p = serverPlayers[id];
            let sprite = this.players[id];

            if (!sprite) {
                sprite = this.add.container(p.x, p.y);
                const gfx = this.add.sprite(0, 0, 'player');
                const label = this.add.text(0, -30, id.substring(0, 4), { fontSize: '10px', fill: '#fff' }).setOrigin(0.5);

                // Mana bar (blue)
                const manaBar = this.add.rectangle(0, 25, 30, 4, 0x0000ff);

                // Stamina bar (green) - positioned below mana
                const staminaBar = this.add.rectangle(0, 30, 30, 4, 0x00ff00);

                sprite.add([gfx, label, manaBar, staminaBar]);
                sprite.gfx = gfx;
                sprite.manaBar = manaBar;
                sprite.staminaBar = staminaBar;
                this.players[id] = sprite;

                // Camera follow ME
                if (id === this.socket.id) {
                    this.cameras.main.startFollow(sprite);
                }
            }

            sprite.x = Phaser.Math.Linear(sprite.x, p.x, 0.3);
            sprite.y = Phaser.Math.Linear(sprite.y, p.y, 0.3);

            // Rotate sprite based on movement direction
            if (p.input && p.input.vector) {
                const vx = p.input.vector.x;
                const vy = p.input.vector.y;

                // Only rotate if there's actual movement
                if (vx !== 0 || vy !== 0) {
                    // Calculate angle from vector
                    // atan2(y, x) gives angle in radians
                    // Sprite faces RIGHT by default (0 rad = →)
                    const angle = Math.atan2(vy, vx);
                    sprite.gfx.rotation = angle;
                }
            }

            if (p.isDashing) {
                sprite.gfx.setAlpha(0.5);
                sprite.gfx.setTint(0x00ffff);
            } else {
                sprite.gfx.setAlpha(1);
                sprite.gfx.clearTint();
            }

            const manaPct = p.mana / p.maxMana;
            sprite.manaBar.width = 30 * manaPct;

            // Update stamina bar
            const staminaPct = p.stamina / p.maxStamina;
            sprite.staminaBar.width = 30 * staminaPct;
        }

        for (const id in this.players) {
            if (!serverPlayers[id]) {
                if (this.players[id]) {
                    this.players[id].destroy();
                    delete this.players[id];
                }
            }
        }
    }
}
