import { supabase } from '../../supabaseClient';

export class NetworkSystem {
    constructor(roomId, playerName, onPlayerUpdate, onWaveSync, onMobUpdate) {
        this.roomId = roomId;
        this.playerName = playerName;
        this.channel = null;
        this.onPlayerUpdate = onPlayerUpdate;
        this.onWaveSync = onWaveSync;
        this.onMobUpdate = onMobUpdate;
        this.lastBroadcast = 0;
    }

    connect() {
        this.channel = supabase.channel(`game_state:${this.roomId}`);

        this.channel
            .on('broadcast', { event: 'player_update' }, ({ payload }) => {
                if (payload.id !== this.playerName) {
                    this.onPlayerUpdate(payload);
                }
            })
            .on('broadcast', { event: 'wave_sync' }, ({ payload }) => {
                this.onWaveSync(payload);
            })
            .on('broadcast', { event: 'mob_update' }, ({ payload }) => {
                this.onMobUpdate(payload);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[Network] Connected to room ${this.roomId}`);
                }
            });
    }

    sendPlayerUpdate(playerState) {
        const now = Date.now();
        if (now - this.lastBroadcast < 50) return; // Cap at 20Hz

        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'player_update',
            payload: playerState
        });
        this.lastBroadcast = now;
    }

    sendWaveSync(waveStats, baseHp) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'wave_sync',
            payload: { wave: waveStats, baseHp }
        });
    }

    sendMobUpdate(mobs) {
        // Optimize: Only send essential data (id, x, y, hp, type)
        // Maybe compress or delta compressed in future, for now raw list
        const payload = mobs.map(m => ({
            id: m.id,
            x: Math.round(m.x),
            y: Math.round(m.y),
            hp: m.hp,
            maxHp: m.maxHp,
            type: m.type
        }));

        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'mob_update',
            payload
        });
    }

    cleanup() {
        if (this.channel) {
            supabase.removeChannel(this.channel);
            this.channel = null;
        }
    }
}
