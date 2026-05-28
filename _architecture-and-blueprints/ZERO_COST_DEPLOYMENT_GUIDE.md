# Zero-Cost Single-Server Deployment Guide

This guide details the exact architecture and step-by-step instructions for deploying the Distributed Swarm Command Center (Frontend + Relay Server) on a single Virtual Machine (like Google Cloud Platform's Free Tier) without paying for a domain name or SSL certificates.

## The Problem: Mobile Browser Security (Mixed Content & CORS)
Modern mobile browsers (Chrome/Safari on iOS and Android) enforce incredibly strict security policies:
1. They will block any login attempt (sending passwords) over plain HTTP (`http://ip-address`).
2. If your Frontend is served over HTTPS, it will instantly block any requests to an HTTP Relay Server (Mixed Content).
3. If your Frontend and Relay Server live on different IPs without proper headers, requests are blocked by CORS.

To solve this, we must use HTTPS.

## The "Zero-Cost" Architecture
You will use exactly one GCP VM.

1.  **Relay Server:** Runs internally on port `3001`.
2.  **Frontend UI (Docker):** Runs internally on port `8080`.
3.  **Host Nginx (Reverse Proxy):** Runs directly on the VM on ports `80` (HTTP) and `443` (HTTPS). This routes public traffic based on the URL path.

---

## Step-by-Step Implementation

### Step 1: Get a Free Domain (DuckDNS)
1. Go to [duckdns.org](https://www.duckdns.org/) and log in (using GitHub/Google).
2. Create a free subdomain (e.g., `tvkk-swarm.duckdns.org`).
3. Point the domain to your GCP instance's public IP address.

### Step 2: Deploy the Relay Server
SSH into your GCP VM and start the Relay Server so it listens on the internal port `3001`.
You can use `deploy_relay.sh` or run it via PM2/Docker, ensuring port `3001` is exposed internally to the VM.

### Step 3: Deploy the Frontend UI
Use the frontend deployment script (`bash deploy_frontend.sh`) and select Docker deployment.
1. When asked for the `VITE_RELAY_URL`, provide your secure DuckDNS domain:
   `VITE_RELAY_URL=https://tvkk-swarm.duckdns.org`
2. **Important:** By default, the Docker compose file maps to port `80`. You must edit the generated `docker-compose-frontend.yml` (or adjust the script) to map it to an internal port like `8080:80` so it doesn't conflict with the Host Nginx we will install next.

### Step 4: Set up Host Nginx (The Magic Router)
Install Nginx directly on the GCP VM:
```bash
sudo apt update
sudo apt install nginx
```

Create a new Nginx configuration file (`/etc/nginx/sites-available/swarm`):
```nginx
server {
    listen 80;
    server_name tvkk-swarm.duckdns.org;

    # Route /api and WebSockets to the Relay Server (Port 3001)
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Route everything else (/) to the Frontend UI (Port 8080)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/swarm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

### Step 5: Get a Free SSL Certificate (Certbot)
Install Certbot and its Nginx plugin:
```bash
sudo apt install certbot python3-certbot-nginx
```

Run Certbot to automatically generate a free SSL certificate and secure your Nginx configuration:
```bash
sudo certbot --nginx -d tvkk-swarm.duckdns.org
```
Follow the prompts. Certbot will handle the verification and automatically modify your Nginx file to listen on port `443` (HTTPS) and set up a redirect from HTTP to HTTPS.

---

## The Result
You now have a fully secure, enterprise-grade architecture using zero dollars.

When you visit `https://tvkk-swarm.duckdns.org` on your phone:
1. The browser sees a valid SSL certificate (via Let's Encrypt/Certbot).
2. The browser allows the login POST request because the site is secure.
3. Your Nginx router magically sends the `/` traffic to the React UI, and the `/api/v1/auth/register` traffic to the backend Relay Server.

The "Failed to fetch" mobile error will be resolved.