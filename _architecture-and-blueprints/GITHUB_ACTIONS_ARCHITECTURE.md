# GitHub Actions & Tunneling Architecture

This document outlines a highly specialized architectural pattern. It explains the networking constraints of ephemeral CI/CD runners (like GitHub Actions) and details the engineering solutions required to host a persistent WebSocket backend on them for short-term, compute-heavy tasks.

---

## 1. The Networking Challenge: Inbound vs. Outbound Traffic

To understand how to host a backend on GitHub Actions, we must understand why standard web architectures fail in this environment, but tools like Telegram bots succeed.

### Why Telegram Bots Work on GitHub Actions (Outbound / Polling)
When running a Telegram bot on a GitHub Action, the bot acts as a **client**, not a server.
1.  **The Outbound Loop:** The bot process continuously reaches *out* to the public internet (specifically `api.telegram.org`) to ask for new updates.
2.  **The Middleman:** Telegram acts as a massive relay server. When a user presses a button on their phone, the phone talks to Telegram.
3.  **Firewall Bypass:** GitHub Actions allow unlimited *outbound* connections. Because the bot is reaching out to fetch commands (and then reaching out to execute rclone cloud-to-cloud transfers), it never needs to open a port. The firewall is bypassed.

### Why Standard Web Apps Fail (Inbound / Listening)
A standard React + Node.js application uses a direct connection.
1.  **The Server:** The Node.js backend must "listen" on a specific port (e.g., `3000`) for incoming WebSocket connections.
2.  **The Firewall:** GitHub Actions runners do not have public IP addresses, and they are protected by strict firewalls that block 100% of *inbound* traffic.
3.  **The Result:** A web browser running a React app cannot find or connect to the Node.js server inside the Action. There is no middleman.

---

## 2. Highly Engineered Solutions for GitHub Actions

To run our Node.js + `rclone rcd` backend on a GitHub Action for temporary (e.g., 1-hour) sessions and control it via a React UI, we must artificially recreate the "middleman" architecture that Telegram uses. We do this via Reverse Tunneling.

### Option A: Cloudflare Tunnels (Recommended Hack)
This is the most robust way to expose a local server running inside a CI/CD runner to the public internet securely.

1.  **Workflow Start:** The user triggers the GitHub Action manually (`workflow_dispatch`).
2.  **Backend Initialization:** The Action installs Node.js, `rclone`, and starts the backend process listening on `localhost:3000`.
3.  **Tunnel Creation:** The Action runs the `cloudflared` daemon. This daemon connects *outbound* to Cloudflare's edge network and links it to `localhost:3000`.
4.  **The Public Endpoint:** Cloudflare assigns a temporary public URL (e.g., `wss://ephemeral-runner-xyz.trycloudflare.com`).
5.  **UI Connection:** The Action prints this URL to the logs (or sends it via a webhook). The user pastes this URL into their React Frontend. The frontend connects to Cloudflare, and Cloudflare passes the WebSocket traffic down the tunnel to the GitHub Action.

### Option B: Custom Relay Server (The Advanced Approach)
If we want absolute control and a permanent URL for the frontend, we build a micro-relay.

1.  **The Relay:** We host a tiny, $2/month relay server. Its only job is to accept WebSocket connections and pass them back and forth.
2.  **The Frontend:** The React app hardcodes a connection to the Relay Server.
3.  **The Action:** When the GitHub Action starts, it connects *outbound* to the Relay Server.
4.  **The Bridge:** When the user clicks a file in the UI, the message goes: `UI -> Relay Server -> GitHub Action (Node.js/rclone)`.

## 3. Required GitHub Secrets
To utilize the Dual-State Database and the Relay architecture effectively, you must configure the following secrets in your GitHub repository before triggering the `run-worker.yml` workflow:

*   `RELAY_URL`: The public URL of your Node.js Relay Server (e.g., `wss://relay.yourdomain.com`).
*   `WORKER_SECRET`: The cryptographic API key used by the Zero-Trust Gatekeeper to allow the worker to join the swarm.
*   `RCLONE_CONF_TEXT`: (Optional) Paste your raw ephemeral `rclone.conf` here. It will be injected dynamically into the worker at boot.
*   `GITHUB_EPHEMERAL_MONGODB_URI`: (Optional) The connection string for the `VFS_EPHEMERAL` schema. If provided, the worker will cache its `fast-list` tree searches here, and the Relay Server will instantly wipe this database the moment the GitHub Action finishes/dies to prevent state bloat.
*   `GRPC_PUBLIC_IP` / `GRPC_PORT`: (Optional) Used for Dual-Mode Swarm routing if workers need to talk to each other directly bypassing the Relay.

## 4. Summary & Viability
Running high-compute, short-term tasks (like massive rclone cloud-to-cloud copies) inside GitHub Actions is a clever use of free compute. By utilizing **Cloudflare Tunnels**, we can bridge the gap between a sleek React UI and a locked-down CI/CD runner, achieving the exact same networking magic that makes Telegram bots work.