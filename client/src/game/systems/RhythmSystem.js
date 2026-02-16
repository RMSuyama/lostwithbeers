/**
 * Handles BPM-based combat multipliers and input timing validation.
 */
export class RhythmSystem {
    constructor(bpm = 120) {
        this.bpm = bpm;
        this.beatInterval = 60000 / bpm; // ms between beats
        this.lastBeatTime = Date.now();
        this.nextBeatTime = this.lastBeatTime + this.beatInterval;
    }

    setBPM(bpm) {
        this.bpm = bpm;
        this.beatInterval = 60000 / bpm;
    }

    update() {
        const now = Date.now();
        if (now >= this.nextBeatTime) {
            this.lastBeatTime = this.nextBeatTime;
            this.nextBeatTime += this.beatInterval;
        }
    }

    /**
     * Validates how close an input is to the current/next beat.
     * returns { rating: 'perfect'|'good'|'ok'|'miss', multiplier: 1.6|1.2|1.0|0 }
     */
    validateInput() {
        const now = Date.now();
        const distToLast = Math.abs(now - this.lastBeatTime);
        const distToNext = Math.abs(now - this.nextBeatTime);
        const accuracy = Math.min(distToLast, distToNext);

        if (accuracy < 40) return { rating: 'perfect', multiplier: 1.6 };
        if (accuracy < 90) return { rating: 'good', multiplier: 1.2 };
        if (accuracy < 160) return { rating: 'ok', multiplier: 1.0 };
        return { rating: 'miss', multiplier: 0 };
    }

    getBeatProgress() {
        const now = Date.now();
        return (now - this.lastBeatTime) / this.beatInterval;
    }
}
