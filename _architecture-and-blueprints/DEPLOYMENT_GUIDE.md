# Master Deployment Guide

Because of the highly engineered, decoupled monorepo architecture, this project supports multiple deployment paradigms. You can deploy it using modern Docker containerization, or directly onto "bare-metal" Virtual Machines (VPS).

This guide covers both methods.

---

## 1. Automated Bare-Metal Deployment (VPS / Ubuntu)

If you have purchased a standard Linux Virtual Private Server (like a $5 DigitalOcean Droplet or Hetzner VM), you can deploy the entire stack using our automated bash script.

### Prerequisites
*   A fresh Ubuntu/Debian server.
*   SSH access.

### Execution
SSH into your server, clone the repository, and run the deployment script:

```bash
git clone https://github.com/your-username/distributed-swarm-monorepo.git
cd distributed-swarm-monorepo
chmod +x deploy.sh
sudo ./deploy.sh
```

### What the script does:
1.  Installs **Node.js v20**, **rclone**, **ffmpeg**, and **PM2** (Process Manager).
2.  Installs NPM dependencies and builds the `/shared`, `/relay`, and `/backend` workspaces.
3.  Starts the `/relay` server and a local `/backend` worker as daemonized background processes using PM2.
4.  Configures PM2 to automatically restart the swarm if the server reboots.

**Serving the Frontend:**
The script builds the React UI into `frontend/dist`. You must configure a lightweight web server like Nginx or Caddy to serve these static files on port 80/443.

---

## 2. Docker / Containerized Deployment (Enterprise)

For massive scale and high reliability, deploying the pre-built Docker containers is recommended. The GitHub Actions CI/CD pipeline automatically builds these images.

### Prerequisites
*   Docker and Docker Compose installed on your host machine.

### Execution (docker-compose.yml)
Create a `docker-compose.yml` file on your server:

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
      - WORKER_SECRET=secure_worker_auth_key
      - DB_TYPE=MONGODB
      - MONGO_URI=mongodb://mongo:27017/swarm
    depends_on:
      - mongo

  # 2. The Command Center UI
  frontend-ui:
    image: ghcr.io/your-username/distributed-swarm-monorepo-frontend:latest
    ports:
      - "80:80"

  # 3. The Backend Worker (Scale this up as needed)
  backend-worker:
    image: ghcr.io/your-username/distributed-swarm-monorepo-worker:latest
    environment:
      - RELAY_URL=http://relay-server:3001
      - WORKER_SECRET=secure_worker_auth_key
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
This instantly spins up 5 isolated GitHub-Action-style workers, all securely connected to your single Relay Server.