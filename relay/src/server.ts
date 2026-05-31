import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSockets } from './sockets';
import authRoutes from './auth';
import { dbManager } from './db';

const app = express();
app.use(cors());

const server = http.createServer(app);

// Initialize DB Manager
dbManager.initialize().catch(err => {
  console.error("Failed to initialize DB Manager. Exiting...");
  process.exit(1);
});

// REST API Routes
app.use('/api/v1/auth', authRoutes);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB for Ephemeral State Hydration payloads
});

setupSockets(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Relay Server is Online' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[Relay Server] Started on port ${PORT}`);
  console.log(`[Relay Server] Acting as Central Nervous System`);
});