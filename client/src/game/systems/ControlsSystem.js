export class ControlsSystem {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, isDown: false, angle: 0 };
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.isDown = true;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.isDown = false;
        });

        window.addEventListener('mousemove', (e) => {
            // Screen relative mouse position
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        });
    }

    getMovement(mode = 'wasd') {
        let mx = 0;
        let my = 0;

        if (mode === 'wasd') {
            if (this.keys['w']) my -= 1;
            if (this.keys['s']) my += 1;
            if (this.keys['a']) mx -= 1;
            if (this.keys['d']) mx += 1;
        } else {
            if (this.keys['arrowup']) my -= 1;
            if (this.keys['arrowdown']) my += 1;
            if (this.keys['arrowleft']) mx -= 1;
            if (this.keys['arrowright']) mx += 1;
        }

        // Normalize for diagonal movement
        if (mx !== 0 && my !== 0) {
            const mag = Math.sqrt(mx * mx + my * my);
            mx /= mag;
            my /= mag;
        }

        return { mx, my };
    }

    isPressed(key) {
        return !!this.keys[key.toLowerCase()];
    }

    cleanup() {
        // Since listeners are bound to window, we should ideally remove them, 
        // but for a singleton-like system, we'll keep it simple for now or 
        // store references if cleanup is frequent.
    }
}
