// GameState imported dynamically now
// const GameState = require('./game');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabaseClient');

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = {}; // { roomId: { gameState, interval } }
    }

    async createRoom(id, gameMode = 'standard') {
        const roomId = id || uuidv4().substring(0, 6);

        let gameState;
        if (gameMode === 'boss_rush') {
            const BossColosseumGame = require('./BossColosseumGame');
            gameState = new BossColosseumGame(roomId);
            console.log(`[RoomManager] Created Boss Rush room: ${roomId}`);
        } else {
            const StandardGame = require('./StandardGame');
            gameState = new StandardGame(roomId);
            console.log(`[RoomManager] Created Standard room: ${roomId}`);
        }

        this.rooms[roomId] = {
            gameState,
            interval: null,
            started: false,
            mode: gameMode
        };

        // Update mode in Supabase if room exists (or create if needed - though usually created by client)
        // For now, valid since client creates room record first usually.





        return roomId;
    }

    async joinRoom(socket, roomId, userId) {
        // Validate room status in Supabase
        const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('status, game_mode')
            .eq('id', roomId)
            .single();

        if (roomError || !roomData) {
            console.error(`[RoomManager] Room ${roomId} lookup error or not found in DB. Error:`, roomError);
            // If it's already in memory, we might still want to join (resilience)
            if (!this.rooms[roomId]) {
                return socket.emit('error', 'Sala não encontrada no banco de dados');
            }
        }

        if (roomData?.status === 'playing' && !this.rooms[roomId]) {
            console.log(`[RoomManager] Room ${roomId} is playing and missing from memory.`);
            // Auto-recovery: if playing in DB but missing in memory, we should initialize
            const mode = roomData?.game_mode || 'standard';
            await this.createRoom(roomId, mode);
        }

        if (!this.rooms[roomId]) {
            console.log(`[RoomManager] Initializing room ${roomId} on join attempt.`);
            const mode = roomData?.game_mode || 'standard'; // Ensure client sets this column
            await this.createRoom(roomId, mode);
        }

        socket.join(roomId);
        // Associate socket.id with userId for cleanup
        this.rooms[roomId].gameState.addPlayer(socket.id, userId);

        // Notify client
        socket.emit('room_joined', {
            roomId,
            playerId: socket.id,
            gameMode: this.rooms[roomId].mode || 'standard'
        });

        console.log(`Socket ${socket.id} (User: ${userId}) joined room ${roomId}`);
    }

    async handleDisconnect(socket) {
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            const player = room.gameState.players[socket.id];

            if (player) {
                const userId = player.userId;
                room.gameState.removePlayer(socket.id);

                // Server-side cleanup of Supabase
                if (userId) {
                    console.log(`[RoomManager] Cleaning up player ${userId} from Supabase on disconnect`);
                    await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', userId);
                }

                if (Object.keys(room.gameState.players).length === 0) {
                    this.closeRoom(roomId);
                }
            }
        }
    }

    handleInput(socket, data) {
        // data should contain roomId and input payload
        const { roomId, input } = data;
        if (this.rooms[roomId]) {
            this.rooms[roomId].gameState.handleInput(socket.id, input);
        }
    }

    handleWaveControl(socket, data) {
        const { roomId, type } = data;
        if (this.rooms[roomId]) {
            const gs = this.rooms[roomId].gameState;
            if (type === 'skip_wave') gs.skipWave();
            if (type === 'spawn_all') gs.spawnInstant();
        }
    }

    handleBuyUpgrade(socket, data) {
        const { roomId, type, cost } = data;
        if (this.rooms[roomId]) {
            const gs = this.rooms[roomId].gameState;
            if (gs.handleBuyUpgrade) {
                gs.handleBuyUpgrade(socket.id, { type, cost });
            }
        }
    }

    async startGameLoop(roomId) {
        // Ensure room exists in memory
        // Ensure room exists in memory
        if (!this.rooms[roomId]) {
            console.log(`[RoomManager] Initializing room ${roomId} on demand for game loop.`);
            // Retrieve mode from DB
            const { data } = await supabase.from('rooms').select('game_mode').eq('id', roomId).single();
            const mode = data?.game_mode || 'standard';
            await this.createRoom(roomId, mode);
        }

        if (this.rooms[roomId].started) return;
        this.rooms[roomId].started = true;

        // Update room status to playing in Supabase
        await supabase
            .from('rooms')
            .update({ status: 'playing' })
            .eq('id', roomId);

        console.log(`Room ${roomId} status updated to playing`);

        // 60 TPS
        this.rooms[roomId].interval = setInterval(() => {
            try {
                const room = this.rooms[roomId];
                if (room) {
                    room.gameState.update();
                    this.io.to(roomId).emit('game_state', room.gameState.getState());
                }
            } catch (err) {
                console.error(`[RoomManager] CRITICAL ERROR in loop for room ${roomId}:`, err);
            }
        }, 1000 / 60);
    }

    async closeRoom(roomId) {
        if (this.rooms[roomId]) {
            clearInterval(this.rooms[roomId].interval);
            delete this.rooms[roomId];

            // Delete room from Supabase (will cascade delete players)
            await supabase
                .from('rooms')
                .delete()
                .eq('id', roomId);

            console.log(`Room ${roomId} closed and removed from database`);
        }
    }
}

module.exports = RoomManager;
