# 🖥️ Frontend UI Deployment Guide

Welcome to the specific deployment documentation for the **Frontend UI**.

In the Distributed Swarm Architecture, the Frontend is a static React Single Page Application (SPA). Unlike the Relay or Backend Worker, the Frontend itself does not run any heavy Node.js server processes. Once built, it is simply a collection of HTML, CSS, and Javascript files served directly to the user's web browser.

---

## 🚀 The 1-Click Deployment Script

We have built a dedicated, interactive deployment script for the Frontend UI.

1.  SSH into your chosen cloud provider instance (GCP, AWS, DigitalOcean).
2.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/distributed-swarm-monorepo.git
    cd distributed-swarm-monorepo
    ```
3.  Run the deployment script:
    ```bash
    chmod +x deploy_frontend.sh
    sudo ./deploy_frontend.sh
    ```

### What the Script Asks For:
The script will prompt you for two things:

1.  **Deployment Method:**
    *   **Option 1 (Bare-Metal/Nginx):** Highly recommended. It installs Node.js to compile the React code, then installs `Nginx` (a blazingly fast web server) to serve the static files on port 80.
    *   **Option 2 (Docker):** Builds a lightweight Nginx container to serve the static files.
2.  **Environment Variables:**
    *   `VITE_RELAY_URL`: **This is critical.** Because the React code executes in the *user's web browser* (not on the server), the code must be compiled with the exact location of the Relay Server. (e.g., `http://192.168.1.50:3001` or `wss://relay.your-domain.com`).

---

## 🧱 Cloud Provider Firewall Configuration (GCP/AWS)

If you are using Google Cloud Platform (GCP), AWS EC2, or Azure, the `deploy_frontend.sh` script will successfully configure Nginx, but **the website will still not load** because cloud providers block web traffic by default.

You must manually open **Port 80 (HTTP)** to the public.

**If using Google Cloud Platform (GCP):**
1. Open the GCP Console and navigate to your Compute Engine instances.
2. Click on the instance where you deployed the Frontend.
3. Click "Edit" at the top of the page.
4. Scroll down to the "Firewalls" section.
5. Check the box that says **"Allow HTTP traffic"**.
6. (Optional) Check "Allow HTTPS traffic" if you plan to configure a domain name and SSL certificate later.
7. Click Save.

You can now open a web browser and type in your server's public IP address to view the Swarm Command Center!

---

## ⚠️ The Mixed-Content Trap (CRITICAL)

When hosting the Frontend, you must be extremely careful about mixing secure and insecure protocols. Modern web browsers (Chrome, Firefox, Safari) enforce strict security rules.

### Scenario A: Testing without a Domain (IP Only)
If you do not own a domain name, you must use raw IP addresses.
*   The Frontend must be hosted on plain `http://YOUR_FRONTEND_IP`.
*   The `VITE_RELAY_URL` must point to an insecure `ws://YOUR_RELAY_IP:3001`.
*   **Result:** This works perfectly for testing.

### Scenario B: Securing the Frontend (The Trap)
If you attach a domain name to your Frontend (e.g., `ui.my-domain.com`) and secure it with an SSL certificate (`https://`), **the browser will instantly block all connections to the Relay Server if the Relay Server is still using an insecure `ws://` IP address.**
*   **Result:** The UI loads, but the connection status will forever say "Disconnected" because the browser killed the WebSocket request to prevent "Mixed Content."

### The Solution
If you secure your Frontend with `https://`, you **MUST** also secure your Relay Server with `wss://` (as detailed in the `RELAY_SERVER_DEPLOYMENT_GUIDE.md`). Both must be secure, or neither can be secure.
