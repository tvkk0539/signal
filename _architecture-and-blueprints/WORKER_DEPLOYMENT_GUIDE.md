# 🦾 Backend Worker Deployment Guide

Welcome to the specific deployment documentation for the **Backend Worker**.

In the Distributed Swarm Architecture, the Worker is the "muscle." It handles heavy file I/O using `rclone` and streams massive amounts of data.

**The Magic of the Worker:** You can deploy this worker on *any* machine in the world (a cloud VPS, a Raspberry Pi in your closet, or a free GitHub Actions runner). Because it uses WebSockets to reach *outward* to the central Relay Server, **you do not need a public IP address, a domain name, or open firewall ports for the worker.** It naturally bypasses NATs and firewalls.

---

## 🚀 The 1-Click Deployment Script

We have built a dedicated, interactive deployment script for the Backend Worker.

1.  SSH into your chosen machine (or cloud provider instance).
2.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/distributed-swarm-monorepo.git
    cd distributed-swarm-monorepo
    ```
3.  Run the deployment script:
    ```bash
    chmod +x deploy_worker.sh
    sudo ./deploy_worker.sh
    ```

### What the Script Asks For:
The script will prompt you for two things:

1.  **Deployment Method:**
    *   **Option 1 (Bare-Metal/PM2):** This installs Node.js, `rclone`, and PM2 directly onto the OS. It is highly recommended if you are deploying to a standard Linux VPS so `rclone` can interact natively with the host's filesystem.
    *   **Option 2 (Docker):** Builds and runs the isolated Worker container.
2.  **Environment Variables:**
    *   `RELAY_URL`: The exact address of your central Relay Server (e.g., `http://192.168.1.50:3001` or `wss://relay.your-domain.com`).
    *   `WORKER_SECRET`: The secure password that matches the Gatekeeper configuration on your Relay Server.

---

## 🧱 Zero-Config Firewalls

Unlike the Relay Server or the Frontend UI, **you do NOT need to configure any cloud firewalls (GCP/AWS/Azure) or router port-forwarding for the Worker node.**

As long as the machine has outbound internet access (it can ping google.com), it will successfully connect to the Relay and join the swarm. You can instantly spawn 100 of these workers on different cloud providers, and they will all appear in your Command Center UI simultaneously.
