require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev, restrict in prod
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

const RoomManager = require('./src/room');

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('create_room', (data) => {
        const userId = typeof data === 'object' ? data.userId : null;
        const roomId = roomManager.createRoom();
        roomManager.joinRoom(socket, roomId, userId);
    });

    socket.on('join_room', (data) => {
        console.log('[SOCKET] Received join_room data:', data);
        const roomId = typeof data === 'object' ? data.roomId : data;
        const userId = typeof data === 'object' ? data.userId : null;
        roomManager.joinRoom(socket, roomId, userId);
    });

    socket.on('player_input', (data) => {
        roomManager.handleInput(socket, data);
    });

    socket.on('start_game', (data) => {
        const roomId = typeof data === 'object' ? data.roomId : data;
        console.log(`[SOCKET] Received start_game for Room: ${roomId}`);
        roomManager.startGameLoop(roomId);
    });

    socket.on('wave_control', (data) => {
        roomManager.handleWaveControl(socket, data);
    });

    socket.on('buy_upgrade', (data) => {
        roomManager.handleBuyUpgrade(socket, data);
    });

    socket.on('disconnect', () => {
        roomManager.handleDisconnect(socket);
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
