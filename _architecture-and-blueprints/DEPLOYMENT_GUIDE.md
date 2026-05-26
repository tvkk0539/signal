# Master Deployment Guide (Step-by-Step)

Welcome to the comprehensive deployment guide for the Distributed Swarm Command Center. Because this project uses a highly engineered, decoupled monorepo architecture, deploying it requires an understanding of how the pieces talk to each other.

This guide is written to be foolproof. Whether you are an advanced DevOps engineer or a beginner deploying your first app to a Virtual Private Server (VPS), follow these instructions carefully.

---

## 🗺️ 1. The Architecture Map (Who Talks to Who?)

Before deploying, you must understand the network flow:

1.  **The Relay Server (Port 3001):** This is the heart of the system. It sits in the middle. It must be accessible via a public IP address or Domain Name.
2.  **The Backend Worker:** This is the muscle. It runs hidden in the background. It reaches *outward* to connect to the Relay Server via WebSockets.
3.  **The Frontend UI:** This is the dashboard in the user's browser. It reaches *outward* to connect to the Relay Server via WebSockets and REST APIs.

---

## 🔐 2. Environment Variables (.env) Explained

For security and flexibility, the codebase does not hardcode passwords or server URLs. You must provide these via Environment Variables.

### For the Relay Server (`relay/.env`)
*   `PORT=3001` (The port the server listens on).
*   `JWT_SECRET=your_super_secret_random_string` (Used to encrypt user login sessions. Make this long and random!).
*   `WORKER_SECRET=secure_worker_auth_key` (The password the Backend Worker must provide to prove it belongs to your swarm).
*   `DB_TYPE=MONGODB` (Tells the Relay which database plugin to use).
*   `MONGO_URI=mongodb://localhost:27017/swarm` (The connection string to your MongoDB database).

### For the Backend Worker (`backend/.env`)
*   `RELAY_URL=http://your-server-ip:3001` (Exactly where the Relay server lives so the worker can connect).
*   `WORKER_SECRET=secure_worker_auth_key` (Must exactly match the Relay Server's `WORKER_SECRET`).

### For the Frontend UI (`frontend/.env`)
*   `VITE_RELAY_URL=http://your-server-ip:3001` (Because the UI runs in the user's browser, the browser needs to know where the Relay API lives).

---

## 🚀 3. Automated Bare-Metal Deployment (VPS / Ubuntu)

If you purchased a standard Linux Virtual Private Server (like a $5 DigitalOcean Droplet or AWS EC2), follow these exact steps. We provide a highly automated bash script (`deploy.sh`) to do the heavy lifting for you.

### Step 3.1: Server Prep
SSH into your server and clone the code:
```bash
git clone https://github.com/your-username/distributed-swarm-monorepo.git
cd distributed-swarm-monorepo
```

### Step 3.2: Configure Environment Variables
Before running the deployment script, we must set up the `.env` files.

**Create the Relay Server .env:**
Create a file named `relay/.env` and add:
```env
PORT=3001
JWT_SECRET=change_me_to_a_random_string
WORKER_SECRET=my_swarm_password_123
DB_TYPE=MONGODB
MONGO_URI=mongodb://localhost:27017/swarm
```

**Create the Backend Worker .env:**
Create a file named `backend/.env` and add (use your server's public IP!):
```env
RELAY_URL=http://YOUR_SERVER_PUBLIC_IP:3001
WORKER_SECRET=my_swarm_password_123
```

**Create the Frontend .env:**
Create a file named `frontend/.env` and add:
```env
VITE_RELAY_URL=http://YOUR_SERVER_PUBLIC_IP:3001
```

### Step 3.3: Execute the Automated Setup
Now that the configuration is ready, run our automated `deploy.sh` script.

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

### What the `deploy.sh` script does:
1.  Installs **Node.js v20**, **rclone**, **ffmpeg**, and **PM2** (Process Manager).
2.  Installs NPM dependencies and builds the `/shared`, `/relay`, and `/backend` workspaces.
3.  Starts the `/relay` server and a local `/backend` worker as daemonized background processes using PM2.
4.  Configures PM2 to automatically restart the swarm if the server reboots.

### Step 3.4: Serving the Frontend UI via Nginx
The `deploy.sh` script started the Relay and Backend, and it compiled your Frontend React code into static HTML/CSS files located at `/frontend/dist`.
To serve these files to the internet on port 80, install Nginx:
```bash
sudo apt install nginx -y
```
Create a configuration file at `/etc/nginx/sites-available/swarm`:
```nginx
server {
    listen 80;
    server_name your_domain.com OR_YOUR_SERVER_IP;

    root /path/to/repo/distributed-swarm-monorepo/frontend/dist;
    index index.html;

    # This ensures React Router handles URLs correctly
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/swarm /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```
You can now visit your server's IP address in a web browser, log in, and command your swarm!

---

## 🐳 4. Docker / Containerized Deployment (Enterprise)

For massive scale, deploying via Docker Compose is recommended. The GitHub Actions CI/CD pipeline automatically builds these images.

Create a `docker-compose.yml` file anywhere on your server:

```yaml
version: '3.8'

services:
  # 1. The Central Nervous System
  relay-server:
    image: ghcr.io/your-username/distributed-swarm-monorepo-relay:latest
    ports:
      - "3001:3001"
    environment:
      - JWT_SECRET=your_super_secret_key
      - WORKER_SECRET=my_swarm_password_123
      - DB_TYPE=MONGODB
      - MONGO_URI=mongodb://mongo:27017/swarm
    depends_on:
      - mongo

  # 2. The Command Center UI
  frontend-ui:
    image: ghcr.io/your-username/distributed-swarm-monorepo-frontend:latest
    ports:
      - "80:80"
    environment:
      # Inject the Relay URL at build/runtime
      - VITE_RELAY_URL=http://YOUR_SERVER_PUBLIC_IP:3001

  # 3. The Backend Worker (Scale this up as needed)
  backend-worker:
    image: ghcr.io/your-username/distributed-swarm-monorepo-worker:latest
    environment:
      - RELAY_URL=http://relay-server:3001
      - WORKER_SECRET=my_swarm_password_123
    depends_on:
      - relay-server

  # 4. The Database
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

Start the entire swarm:
```bash
docker-compose up -d
```

### Scaling the Swarm
If you need more compute power, simply scale the backend worker using Docker:
```bash
docker-compose up -d --scale backend-worker=5
```
This instantly spins up 5 isolated workers, all securely connected to your single Relay Server.
