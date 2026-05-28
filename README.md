# 🌐 Distributed Swarm Command Center

![Architecture Status](https://img.shields.io/badge/Architecture-Highly_Engineered-blue)
![Stack](https://img.shields.io/badge/Stack-TypeScript%20%7C%20React%20%7C%20Node.js-black)
![License](https://img.shields.io/badge/License-MIT-green)

Welcome to the **Distributed Swarm Command Center**. This project represents a bleeding-edge architectural blueprint for managing a massive, distributed computing swarm across highly restricted, ephemeral environments (like GitHub Actions, CI/CD runners, and AWS Spot Instances).

This is not a traditional monolithic web application. It is a **Distributed Intelligence Network** capable of real-time cloud storage management, Peer-to-Peer file streaming, and encrypted messaging.

---

## 🏛️ The Monorepo Architecture

This project is structured as an advanced Monorepo, governed by a strict separation of concerns to allow for completely decoupled, environment-agnostic deployment.

*   **`_architecture-and-blueprints/`**: The master design documents. Read these first.
*   **`/shared`**: The Universal Data Contracts. Strict TypeScript interfaces ensuring the entire swarm speaks the exact same mathematical language.
*   **`/relay`**: The Central Nervous System. A lightweight Node.js/Socket.io server that routes traffic, acts as a Zero-Trust Gatekeeper, and orchestrates the worker swarm.
*   **`/backend`**: The Worker Node. Ephemeral, high-compute applications (utilizing `rclone`) designed to execute heavy tasks and die.
*   **`/frontend`**: The Command Center. A React + Vite UI providing real-time telemetry and control over the swarm.
*   **`/mobile`**: The Headless Client. A React Native application optimized for mobile networks (GraphQL, WebTransport).

---

## 🚀 Extreme Capabilities

This system leverages five major communication protocols to achieve "magic" functionality:

1.  **WebSockets (The Telemetry Pipe):** Provides real-time UI updates (e.g., live progress bars) between the Swarm and the Command Center.
2.  **WebTransport / QUIC (The Mobile Pipe):** Ensures mobile clients never disconnect, even when rapidly switching between Wi-Fi and 4G networks.
3.  **WebRTC (The Media & P2P Pipe):** Utilizes STUN/TURN hole-punching to bypass the Relay Server entirely, allowing users to stream 50GB videos or share massive files Peer-to-Peer with zero central bandwidth cost.
4.  **gRPC (The Swarm Engine):** Allows isolated GitHub Action workers to stream binary data directly to each other, forming a "Virtual Network" for distributed MapReduce tasks.
5.  **REST (The Authentication Gateway):** Secures the entry points utilizing a Database-Agnostic Manager and JSON Web Tokens (JWT).

---

## 🧠 Core Features

*   **Frontend Web Worker Throttling:** Manages massive WebSocket "data firehoses" (e.g., thousands of progress updates per second) using a background thread (`swarm.worker.ts`), preventing the Main UI React thread from freezing while controlling large swarms.
*   **On-The-Fly Memory Streaming:** Uses `rclone` VFS and WebRTC Data Channels to stream massive cloud files (50GB+) through low-resource ephemeral workers (14GB GitHub Actions) without ever writing to the physical hard drive. The UI dynamically detects MIME types via `StreamMetadataMessage`.
*   **Relay Bypass Chat:** An end-to-end encrypted messaging system that intelligently offloads heavy file transfers.
*   **God-Tier Database Architecture:** Features **Polyglot Persistence** and **Zero-Delay Multi-DB Mirroring**. The Relay Server acts as a domain-level switchboard, allowing the UI to hot-swap database engines (MongoDB, Postgres, SQLite, etc.) on the fly and stream writes to multiple async mirror databases without blocking the main event loop.

---

## 🧠 Core Features & Current Phase Status

The Monorepo is being developed in strict, highly-engineered phases. The current codebase supports up to **Phase 6**.

*   **Phase 1 & 2: Rclone Engine & Swarm Orchestration (✅ Active):** The Node.js worker dynamically controls the `rclone rcd` daemon. The React UI displays a live Fleet Sidebar of connected workers and features a global Job Manager that uses Round-Robin load balancing via the Relay.
*   **Phase 3: Chat System & Cloud Handoff (✅ Active):** Users can chat and share files. Online users punch STUN holes to stream P2P. Offline users trigger a Cloud Worker Handoff, where an ephemeral worker accepts the base64 payload and generates a cloud download link.
*   **Phase 4: WebRTC Media Engine (✅ Active):** The worker dynamically `stats` files for metadata, intercepts WebRTC `SDP_OFFER`s, and pipes the VFS HTTP stream from `rclone` directly into the `RTCDataChannel`. The UI dynamically configures the `MediaSource` buffer, achieving true zero-disk memory streaming for any video format.
*   **Phase 5: gRPC Swarm Engine (✅ Active):** Ephemeral workers use the Relay Server as a DNS discovery mechanism to find each other's dynamic gRPC ports. Workers can pipe binary data directly to other workers via protobuf streams, forming a Virtual MapReduce Network.
*   **Phase 6: Advanced Swarm Engineering (✅ Active):**
    *   **Zero-Trust Security:** Workers must authenticate via strict API Keys (`WORKER_SECRET`) before joining the swarm.
    *   **Frontend Web Workers:** `SocketManager` offloads WebSocket heavy-lifting to background threads.
    *   **Polyglot DB Switchboard:** The `DatabaseOperationsCenter` UI allows runtime hot-swapping of individual domains (AUTH, AUDIT, CHAT) to different database engines (e.g., Auth to MongoDB, Audit to Postgres).
    *   **Asynchronous Database Mirrors:** Supports Zero-Delay write-behind mirroring, allowing a single domain to replicate data synchronously to a primary DB and asynchronously to N-mirrors without blocking the Relay Server CPU or user UI.

---

## 🛠️ Quick Start (Development Mode)

The entire monorepo is governed by NPM Workspaces.

### 1. Install Dependencies & Environment Setup
This project requires specific system-level dependencies (like `rclone` for the backend and `playwright` for automated UI testing).

To streamline setup for both **Human Developers** and **AI Coding Agents**, we provide a dedicated setup script.

From the root of the repository, run:
```bash
bash jules_environment_setup.sh
```
*(Note: This script will install NPM packages, download the global `rclone` binary, and install Playwright chromium dependencies).*

**For AI Agents (Jules Workflow):**
To ensure the AI sandbox boots instantly without installing dependencies every session, you must configure the "Environment Snapshot".
1. Open the Jules Environment settings.
2. In the setup script box, enter: `bash jules_environment_setup.sh`
3. Click "Run and snapshot". All future sessions will load this environment instantly.

### 2. Compile Shared Contracts
Before running the services, the shared TypeScript data contracts must be compiled across the workspaces:
```bash
npm run build:all
```

### 3. Boot the Swarm Locally
You must start the "Central Nervous System" first:
```bash
npm run start:relay
```
Then, in a new terminal, boot up a local test worker:
```bash
npm run start:backend
```
Finally, in a third terminal, launch the Command Center UI:
```bash
npm run dev:frontend
```

Open your browser to `http://localhost:5173` to take control of your swarm.

---

> *"Any sufficiently advanced technology is indistinguishable from magic."*
