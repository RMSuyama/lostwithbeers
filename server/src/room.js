const GameState = require('./game');
const { v4: uuidv4 } = require('uuid');

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

    joinRoom(socket, roomId) {
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

    startGameLoop(roomId) {
        if (!this.rooms[roomId]) return;

        // 60 TPS
        this.rooms[roomId].interval = setInterval(() => {
            const room = this.rooms[roomId];
            if (room) {
                room.gameState.update();
                this.io.to(roomId).emit('game_state', room.gameState.getState());
            }
        }, 1000 / 60);
    }

    closeRoom(roomId) {
        if (this.rooms[roomId]) {
            clearInterval(this.rooms[roomId].interval);
            delete this.rooms[roomId];
            console.log(`Room ${roomId} closed`);
        }
    }
}

module.exports = RoomManager;
