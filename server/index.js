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

const PORT = 3001;

const RoomManager = require('./src/room');

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('create_room', () => {
        const roomId = roomManager.createRoom();
        roomManager.joinRoom(socket, roomId);
    });

    socket.on('join_room', (roomId) => {
        roomManager.joinRoom(socket, roomId);
    });

    socket.on('player_input', (data) => {
        roomManager.handleInput(socket, data);
    });

    socket.on('disconnect', () => {
        roomManager.handleDisconnect(socket);
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
