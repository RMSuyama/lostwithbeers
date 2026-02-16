/**
 * Handles monster waves, timing, and scaling difficulty.
 */
export class WaveSystem {
    constructor() {
        this.currentWave = 0;
        this.nextWaveTimer = 10;
        this.isWaveActive = false;
        this.difficultyMultiplier = 1.0;
        this.waveStartTime = 0;
        this.lastWaveDuration = 0;
    }

    /**
     * Calculates mob stats based on wave and player count.
     */
    getMobStats(wave, playerCount) {
        // Adaptive Multiplier: If players are too fast, difficulty increases
        const adaptiveFactor = this.difficultyMultiplier;

        const hpMultiplier = 1 + (playerCount * 0.6);
        const speedMultiplier = 1 + (wave * 0.08);
        const countMultiplier = 1 + (wave * 0.4);

        return {
            hp: Math.floor(50 * hpMultiplier * (1 + wave * 0.2) * adaptiveFactor),
            speed: 2 * speedMultiplier,
            count: Math.floor(5 * countMultiplier * Math.sqrt(adaptiveFactor)),
            damage: (10 + (wave * 2)) * adaptiveFactor
        };
    }

    update(dt, aliveMobCount) {
        if (!this.isWaveActive && this.nextWaveTimer > 0) {
            this.nextWaveTimer -= dt;
            if (this.nextWaveTimer <= 0) {
                return { startWave: true, wave: this.currentWave + 1 };
            }
        }

        if (this.isWaveActive && aliveMobCount === 0) {
            this.endWave();
            return { waveCleared: true };
        }

        return { startWave: false };
    }

    start(waveNum) {
        this.currentWave = waveNum;
        this.isWaveActive = true;
        this.nextWaveTimer = 0;
        this.waveStartTime = Date.now();
    }

    endWave() {
        const now = Date.now();
        this.lastWaveDuration = (now - this.waveStartTime) / 1000;
        this.isWaveActive = false;

        // Adaptive Scaling:
        // Expected duration is roughly 30-45 seconds
        if (this.lastWaveDuration < 20) {
            this.difficultyMultiplier += 0.2; // Pro players! Buff enemies.
        } else if (this.lastWaveDuration > 60) {
            this.difficultyMultiplier = Math.max(0.8, this.difficultyMultiplier - 0.1); // Struggling. Relief.
        }

        this.nextWaveTimer = 15; // Break between waves
    }
}
