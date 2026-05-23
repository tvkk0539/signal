import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for MVP
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.send({ status: 'ok', message: 'Backend is running' });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // MVP: Job streaming mock
  socket.on('start-job', (data) => {
    console.log('Received start-job command', data);
    let progress = 0;

    // Simulate progress updates for the MVP
    const interval = setInterval(() => {
      progress += 10;
      socket.emit('job-progress', { progress, message: `Processing... ${progress}%` });

      if (progress >= 100) {
        clearInterval(interval);
        socket.emit('job-complete', { message: 'Job finished successfully' });
      }
    }, 1000);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
