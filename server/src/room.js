const GameState = require('./game');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabaseClient');

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = {}; // { roomId: { gameState, interval } }
    }

    createRoom() {
        const roomId = uuidv4().substring(0, 6);
        const gameState = new GameState(roomId);

        this.rooms[roomId] = {
            gameState,
            interval: null
        };

        this.startGameLoop(roomId);
        return roomId;
    }

    async joinRoom(socket, roomId) {
        // Validate room status in Supabase
        const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('status')
            .eq('id', roomId)
            .single();

        if (roomError || !roomData) {
            console.log(`Room ${roomId} not found in database`);
            return socket.emit('error', 'Sala não encontrada');
        }

        if (roomData.status === 'in_progress') {
            console.log(`Room ${roomId} is in progress, blocking join`);
            return socket.emit('error', 'Partida em andamento! Aguarde a próxima rodada.');
        }

        if (this.rooms[roomId]) {
            socket.join(roomId);
            this.rooms[roomId].gameState.addPlayer(socket.id);

            // Notify client
            socket.emit('room_joined', { roomId, playerId: socket.id });

            console.log(`Socket ${socket.id} joined room ${roomId}`);
        } else {
            socket.emit('error', 'Room not found');
        }
    }

    handleDisconnect(socket) {
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            if (room.gameState.players[socket.id]) {
                room.gameState.removePlayer(socket.id);
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

    async startGameLoop(roomId) {
        if (!this.rooms[roomId]) return;

        // Update room status to in_progress in Supabase
        await supabase
            .from('rooms')
            .update({ status: 'in_progress' })
            .eq('id', roomId);

        console.log(`Room ${roomId} status updated to in_progress`);

        // 60 TPS
        this.rooms[roomId].interval = setInterval(() => {
            const room = this.rooms[roomId];
            if (room) {
                room.gameState.update();
                this.io.to(roomId).emit('game_state', room.gameState.getState());
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
