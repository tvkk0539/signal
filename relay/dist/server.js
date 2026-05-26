"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const sockets_1 = require("./sockets");
const auth_1 = __importDefault(require("./auth"));
const db_1 = require("./db");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
// Initialize DB Manager
db_1.dbManager.initialize().catch(err => {
    console.error("Failed to initialize DB Manager. Exiting...");
    process.exit(1);
});
// REST API Routes
app.use('/api/v1/auth', auth_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
(0, sockets_1.setupSockets)(io);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Relay Server is Online' });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`[Relay Server] Started on port ${PORT}`);
    console.log(`[Relay Server] Acting as Central Nervous System`);
});
