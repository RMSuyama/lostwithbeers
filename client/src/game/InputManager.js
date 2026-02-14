export default class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.cursors = scene.input.keyboard.createCursorKeys();

        // Custom keys
        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            // Skills
            skill_q: Phaser.Input.Keyboard.KeyCodes.Q,
            skill_w: Phaser.Input.Keyboard.KeyCodes.W,
            skill_e: Phaser.Input.Keyboard.KeyCodes.E,
            skill_r: Phaser.Input.Keyboard.KeyCodes.R,
            // Extra
            skill_space: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        this.lastState = {
            x: 0,
            y: 0,
            actions: {}
        };
    }

    update() {
        const state = {
            vector: { x: 0, y: 0 },
            actions: {
                skill_q: this.keys.skill_q.isDown,
                skill_w: this.keys.skill_w.isDown,
                skill_e: this.keys.skill_e.isDown,
                skill_r: this.keys.skill_r.isDown,
                skill_space: this.keys.skill_space.isDown
            }
        };

        // Keyboard Movement (Arrows)
        if (this.keys.left.isDown) state.vector.x = -1;
        else if (this.keys.right.isDown) state.vector.x = 1;

        if (this.keys.up.isDown) state.vector.y = -1;
        else if (this.keys.down.isDown) state.vector.y = 1;

        // Gamepad Support
        if (this.scene.input.gamepad.total > 0) {
            const pad = this.scene.input.gamepad.getPad(0);
            if (pad) {
                if (Math.abs(pad.leftStick.x) > 0.1) state.vector.x = pad.leftStick.x;
                if (Math.abs(pad.leftStick.y) > 0.1) state.vector.y = pad.leftStick.y;

                if (pad.A) state.actions.skill_space = true; // A = Space/Dash?
                if (pad.X) state.actions.skill_q = true;
                if (pad.Y) state.actions.skill_w = true;
                if (pad.B) state.actions.skill_e = true;
            }
        }

        // Normalize vector
        const mag = Math.sqrt(state.vector.x * state.vector.x + state.vector.y * state.vector.y);
        if (mag > 0) {
            state.vector.x /= mag;
            state.vector.y /= mag;
        }

        return state;
    }
}
