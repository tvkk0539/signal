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

## 🧠 Core Features & Current Phase Status

The Monorepo is being developed in strict, highly-engineered phases. The current codebase supports up to **Phase 5**.

*   **Phase 1 & 2: Rclone Engine & Swarm Orchestration (✅ Active):** The Node.js worker dynamically controls the `rclone rcd` daemon. The React UI displays a live Fleet Sidebar of connected workers and features a global Job Manager that uses Round-Robin load balancing via the Relay.
*   **Phase 3: Chat System & Cloud Handoff (✅ Active):** Users can chat and share files. Online users punch STUN holes to stream P2P. Offline users trigger a Cloud Worker Handoff, where an ephemeral worker accepts the base64 payload and generates a cloud download link.
*   **Phase 4: WebRTC Media Engine (✅ Active):** The worker uses `werift` to intercept WebRTC `SDP_OFFER`s. When a user streams a massive 50GB file, the worker pulls the VFS HTTP stream from `rclone` and pipes it directly into the `RTCDataChannel`, achieving zero-disk memory streaming.
*   **Phase 5: gRPC Swarm Engine (✅ Active):** Ephemeral workers use the Relay Server as a DNS discovery mechanism to find each other's dynamic gRPC ports. Workers can pipe binary data directly to other workers via protobuf streams, forming a Virtual MapReduce Network.
*   **Zero-Trust Security:** Workers must authenticate via strict API Keys (`WORKER_SECRET`) before joining the swarm.
*   **Pluggable Databases:** Built utilizing the Clean Architecture Repository Pattern. Currently configured for MongoDB, but designed to gracefully fallback to an InMemory mock DB during development.

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