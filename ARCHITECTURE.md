# System Architecture

## 1. High-Level Architecture
This project utilizes a decoupled **Client-Server architecture** developed within a **Monorepo** structure.
While the codebase lives in a single repository for development efficiency (allowing shared types and models), the frontend and backend are completely isolated applications designed to be deployed independently.

*   **Frontend (UI):** Hosted on edge networks or static file servers (e.g., Vercel, Netlify, Nginx).
*   **Backend (Worker/Server):** Hosted on separate Virtual Machines or containers (e.g., AWS EC2, DigitalOcean).
*   **Communication:**
    *   REST API (for standard requests like authentication).
    *   WebSockets (via Socket.io) for persistent, real-time, bi-directional data flow.

## 2. Technology Stack
The stack is unified under **Full TypeScript** to ensure end-to-end type safety, preventing common bugs associated with data contract changes between the UI and server.

### Frontend
*   **Framework:** React
*   **Build Tool:** Vite (for rapid development and optimized builds)
*   **Language:** TypeScript
*   **Real-time:** `socket.io-client`

### Backend
*   **Runtime:** Node.js
*   **Framework:** Express
*   **Language:** TypeScript
*   **Real-time:** `socket.io`
*   **External Integration:** `rclone` (executed in daemon mode)

### Database
*   **Primary DB:** MongoDB (chosen for flexibility and high throughput; suitable for storing job histories, user metadata, and caching cloud directory structures).

## 3. Core Subsystems

### 3.1 Real-Time WebSocket Pipeline
The foundation of the application is a robust WebSocket connection.
1.  **Connection Management:** The frontend establishes a persistent connection. The backend handles connection state, ping/pong heartbeats, and automatic reconnections.
2.  **Authentication:** The system is designed to eventually require secure tokens (e.g., JWT) passed during the WebSocket handshake.
3.  **Data Streaming:** The backend can stream updates (like file copy progress) or instant state changes directly to the React UI.

### 3.2 The `rclone` Daemon Integration
To achieve seamless cloud storage browsing:
1.  The backend runs `rclone rcd` (the remote control daemon) as a continuous background process.
2.  The frontend sends requests (e.g., "List contents of `/movies/`") via WebSocket.
3.  The Node.js backend receives this, immediately queries the local `rclone` daemon's API, and receives the JSON response.
4.  The backend forwards this JSON back over the WebSocket to the frontend.
5.  This avoids the overhead of spawning a new `rclone` process for every user action, providing a near-instant, unbroken browsing experience.

## 4. Repository Structure
```
/
├── frontend/      # React application (UI)
│   ├── src/
│   ├── package.json
│   └── ...
│
├── backend/       # Node.js Express/Socket.io server
│   ├── src/
│   ├── package.json
│   └── ...
│
├── README.md
└── ARCHITECTURE.md
```