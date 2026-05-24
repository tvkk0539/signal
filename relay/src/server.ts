import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSockets } from './sockets';

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
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