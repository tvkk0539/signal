# 🌐 Relay Server: The "God Node" Deployment Guide

Welcome to the specific deployment documentation for the **Relay Server**.

In the Distributed Swarm Architecture, the Relay Server acts as the central nervous system. It is purposefully designed to be a tiny, ultra-efficient Node.js process. Because it relies heavily on WebSockets and event routing rather than heavy data processing, it can run on extremely cheap cloud infrastructure (like a $4/month GCP Micro instance or AWS `t2.micro`) while controlling hundreds of massive ephemeral workers.

This document details exactly what is required to deploy this "God Node."

---

## 🚀 The 1-Click Deployment Script

We have built a dedicated, interactive deployment script for the Relay Server.

1.  SSH into your chosen cloud provider instance (GCP, AWS, DigitalOcean).
2.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/distributed-swarm-monorepo.git
    cd distributed-swarm-monorepo
    ```
3.  Run the deployment script:
    ```bash
    chmod +x deploy_relay.sh
    sudo ./deploy_relay.sh
    ```

### What the Script Asks For:
The script will prompt you for two things:

1.  **Deployment Method:**
    *   **Option 1 (Bare-Metal/PM2):** Recommended for tiny VMs (under 1GB RAM). It installs Node directly onto the OS and uses PM2 to keep the relay alive forever. It is the most resource-efficient method.
    *   **Option 2 (Docker):** Recommended for enterprise deployments. It builds the Relay container and boots it.
2.  **Environment Variables:**
    *   `JWT_SECRET`: Type a long, random string. The Relay uses this to generate and verify login tokens for the React UI.
    *   `WORKER_SECRET`: Type a secure password. The Relay uses this as the "Gatekeeper." Any backend worker that tries to connect must provide this password, or the Relay instantly drops the connection.

---

## 🔒 Securing WebSockets with Nginx (WSS://)

By default, the Relay Server boots up on `http://YOUR_SERVER_IP:3001`.

However, modern browsers will block the React UI from connecting to an insecure `ws://` WebSocket if the UI itself is hosted on a secure `https://` domain.

To fix this, you must put an **Nginx Reverse Proxy** in front of your Relay Server to handle SSL termination.

### 1. Install Nginx and Certbot (Let's Encrypt)
```bash
sudo apt install nginx -y
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Configure Nginx for WebSockets
Create a new Nginx configuration file at `/etc/nginx/sites-available/relay`.

Paste the following configuration. **Notice the specific WebSocket headers (`Upgrade` and `Connection`)—these are absolutely required for the Relay to work!**

```nginx
server {
    listen 80;
    server_name relay.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # REQUIRED FOR WEBSOCKETS!
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Enable and Secure the Site
Enable the configuration and use Certbot to automatically fetch a free SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/relay /etc/nginx/sites-enabled/
sudo systemctl restart nginx
sudo certbot --nginx -d relay.your-domain.com
```

### 4. Update the Swarm
Now that your Relay Server is securely hosted at `wss://relay.your-domain.com`, you must update the Environment Variables for your Frontend and Backend workers to point to this new secure domain instead of the raw IP address!
