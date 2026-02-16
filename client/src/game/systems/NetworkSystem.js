import { supabase } from '../../supabaseClient';

export class NetworkSystem {
    constructor(roomId, playerName, onPlayerUpdate, onGameStateSync) {
        this.roomId = roomId;
        this.playerName = playerName;
        this.channel = null;
        this.onPlayerUpdate = onPlayerUpdate;
        this.onGameStateSync = onGameStateSync;
        this.lastBroadcast = 0;
        this.isJoined = false;
    }

    connect() {
        this.channel = supabase.channel(`game_state:${this.roomId}`);

        this.channel
            .on('broadcast', { event: 'player_update' }, ({ payload }) => {
                if (payload.id !== this.playerName) {
                    this.onPlayerUpdate(payload);
                }
            })
            .on('broadcast', { event: 'game_state_sync' }, ({ payload }) => {
                if (this.onGameStateSync) this.onGameStateSync(payload);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.isJoined = true;
                    console.log(`[Network] Connected to room ${this.roomId}`);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    this.isJoined = false;
                }
            });
    }

    sendPlayerUpdate(playerState) {
        const now = Date.now();
        if (now - this.lastBroadcast < 50) return; // Cap at 20Hz

        if (!this.channel || !this.isJoined) return;
        this.channel.send({
            type: 'broadcast',
            event: 'player_update',
            payload: playerState
        });
        this.lastBroadcast = now;
    }

    /**
     * Authoritative State Sync (Host only)
     */
    sendGameStateUpdate(gameState) {
        if (!this.channel || !this.isJoined) return;
        this.channel.send({
            type: 'broadcast',
            event: 'game_state_sync',
            payload: gameState
        });
    }

    cleanup() {
        if (this.channel) {
            supabase.removeChannel(this.channel);
            this.channel = null;
        }
    }
}
