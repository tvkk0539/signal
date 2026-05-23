# WebSocket Relay Server Architecture

This document details an advanced, enterprise-grade architectural pattern: the **WebSocket Relay Server**. This pattern is designed to solve the problem of hosting high-compute, ephemeral workers (like GitHub Actions) behind strict firewalls, while maintaining a seamless, permanent connection to a frontend web application.

## 1. The Core Concept: The "Middleman"

In a standard web architecture, the browser (React UI) connects directly to the server doing the heavy lifting (Node.js/rclone). However, when the server is hosted in a locked-down CI/CD environment like GitHub Actions, direct inbound connections are blocked by firewalls.

To bypass this, we introduce a **Relay Server**. This is the exact same technology architecture used in multiplayer video games.

*   **The Relay (The Traffic Cop):** A lightweight, inexpensive server (e.g., a $2/month micro-VPS or free-tier instance) hosted publicly. It does **no heavy processing**. Its only job is to hold WebSocket connections open and route messages between clients. It has a permanent, public IP address.
*   **The Worker (GitHub Actions):** The ephemeral environment where the heavy `rclone` daemon runs. When the Action boots up, it initiates an *outbound* connection to the Relay Server. Because it is outbound, the GitHub firewall allows it.
*   **The User (React UI):** The user's web browser connects to the Relay Server.

## 2. How the Pipeline Works

1.  **Initialization:** The React UI connects to `wss://relay.yourdomain.com`. The GitHub Action also connects to `wss://relay.yourdomain.com`.
2.  **The Bridge:** The Relay recognizes both parties and links them together.
3.  **Execution:**
    *   The user clicks a folder in the React UI.
    *   The UI sends a `[Get Folder]` message to the Relay.
    *   The Relay instantly forwards the message down the outbound pipe to the GitHub Action.
    *   The GitHub Action queries the `rclone` API, retrieves the data, and sends it back up to the Relay.
    *   The Relay forwards the data to the React UI for rendering.

## 3. The Massive Benefits of a Relay Architecture

Why choose this over temporary reverse tunnels (like Cloudflare Tunnels) or relying on third-party platforms like Telegram/Discord?

### A. A Permanent URL (Seamless UX)
With temporary tunnels (Cloudflare/Ngrok), every time the GitHub Action restarts, a new, random URL is generated. The user must manually copy and paste this new URL into the React app.
With a Relay Server, the React frontend is hardcoded to a permanent URL (`wss://relay.yourdomain.com`). When a GitHub Action wakes up, it connects to the Relay, and the React app instantly "sees" it without any user intervention. It is a 100% seamless experience.

### B. Cheap, Heavy Compute
`rclone` operations (like transferring gigabytes of files or hashing data) require significant CPU and RAM. A cheap $2 VPS would crash attempting this.
This architecture decouples the cost: you get the heavy compute for **FREE** by utilizing GitHub Actions, and you only pay $2 for the lightweight Relay server acting as the traffic cop.

### C. Maximum Privacy & Control
Using Telegram, Discord, or Cloudflare Tunnels means your private file names, directory structures, and potentially sensitive data are passing through external corporate servers.
By hosting your own Relay Server, you own the entire pipeline. Data travels securely from the GitHub Action, through your private Relay, directly to the browser.

### D. The "Swarm" Capability (Distributed Computing)
This is the most powerful feature of the Relay architecture. Because the workers (Actions) reach out to the Relay, you are not limited to just one worker.
You can trigger 5, 10, or 20 GitHub Actions simultaneously. They all connect to the central Relay. The React UI can act as a command center, distributing tasks: *"Worker 1, copy folder A. Worker 2, copy folder B."* You effectively build a free, highly scalable, distributed computing network.