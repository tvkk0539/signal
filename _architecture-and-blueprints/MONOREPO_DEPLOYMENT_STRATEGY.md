# Monorepo Deployment Strategy

This document outlines the advanced Monorepo strategy designed for this project. It explains how we can develop multiple distinct applications within a single repository while deploying them in complete isolation across vastly different infrastructure environments.

## 1. The Monorepo Concept

A Monorepo (Monolithic Repository) is an architectural pattern where multiple, independent projects are housed inside a single Git repository.

For our highly engineered architecture, our single repository will contain four distinct, top-level directories:

1.  **`/frontend`**: The React (Vite) User Interface.
2.  **`/backend`**: The Heavy Worker (Node.js + `rclone`), designed for high-compute, ephemeral environments like GitHub Actions.
3.  **`/relay`**: The Lightweight Traffic Cop (WebSocket / Signaling server).
4.  **`/shared`**: Universal data contracts and TypeScript definitions.

## 2. Independent Deployment Architecture

The core rule of our Monorepo is **Decoupled Deployment**. Even though the code lives together, the applications do not rely on each other's runtime environments.

### A. Deploying the `/frontend` (Vercel / Netlify)
*   **The Process:** Platforms like Vercel connect to the Git repository. We configure the "Root Directory" setting to strictly `/frontend`.
*   **The Result:** Vercel completely ignores the heavy backend and relay code. It builds the React UI into static HTML/JS and deploys it to a global CDN. It costs nearly nothing to host.

### B. Deploying the `/relay` (Dedicated VM)
*   **The Process:** On an inexpensive, permanent VM (e.g., $2/month DigitalOcean droplet), the repository is cloned. The deployment command executed is `cd relay && npm run start`.
*   **The Result:** Only the lightweight WebSocket server boots up. It binds to the VM's public IP address and listens on a specific port, acting as the permanent "Matchmaker" for the system.

### C. Deploying the `/backend` (GitHub Actions Worker)
*   **The Process:** When a GitHub Action workflow triggers, it checks out the repository. The workflow script executes `cd backend && npm run start`.
*   **The Result:** The ephemeral worker spins up the heavy `rclone` daemon, connects *outbound* to the public `/relay`, and begins waiting for tasks.

## 3. The Superpower: The `/shared` Package

The most significant engineering advantage of building these three distinct apps in one Monorepo is the `/shared` folder.

In a traditional multi-repo setup, if the Relay Server expects a WebSocket message structured as `{ "workerId": 1 }`, but the Frontend sends `{ "id": 1 }`, the app breaks at runtime.

In our Monorepo:
1.  We define an interface in `/shared/types/WebSocketMessages.ts`.
2.  The `/frontend`, `/relay`, and `/backend` all import this exact same file.
3.  If a developer renames a property in the `/shared` folder, the TypeScript compiler will immediately throw a red error in all three applications during development, ensuring that the React UI, the Relay, and the Worker are **mathematically proven** to speak the exact same language before deployment.

This architecture prevents thousands of potential bugs in complex, distributed real-time systems.