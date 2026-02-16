import { POSITIONS } from './constants';

/**
 * Centralized GameState to maintain synchronization and authority.
 * Host is the authority, Clients are mirrors.
 */
export class GameState {
    constructor() {
        this.players = [];      // { id, x, y, hp, maxHp, angle, isMoving, ... }
        this.mobs = [];         // { id, x, y, hp, type, ... }
        this.projectiles = [];  // { id, x, y, vx, vy, type, ownerId, ... }
        this.effects = [];      // { id, x, y, type, timer }
        this.wave = 1;
        this.difficulty = 1;
        this.baseHp = 1000;
        this.maxBaseHp = 1000;
        this.lastUpdateTime = Date.now();
    }

    /**
     * Updates the local state with authoritative data from the server/host.
     */
    syncFromHost(data) {
        if (!data) return;
        if (data.mobs) this.mobs = data.mobs;
        if (data.projectiles) this.projectiles = data.projectiles;
        if (data.wave) this.wave = data.wave;
        if (data.baseHp !== undefined) this.baseHp = data.baseHp;

        // Players are usually synced separately or per-update
        if (data.players) {
            // Merge remote players into local proxy
            this.players = data.players;
        }
    }

    /**
     * Returns a snapshot for broadcasting.
     */
    getSnapshot() {
        return {
            mobs: this.mobs,
            projectiles: this.projectiles,
            wave: this.wave,
            baseHp: this.baseHp,
            timestamp: Date.now()
        };
    }
}
