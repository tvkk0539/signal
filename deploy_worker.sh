#!/bin/bash

# ==============================================================================
# Distributed Swarm Command Center - Backend Worker Automated Deployment Script
# ==============================================================================

set -e

echo "========================================================"
echo "🦾 Booting Backend Worker (The Swarm Muscle)"
echo "========================================================"
echo ""
echo "This script will deploy an ephemeral Backend Worker."
echo "Please select your preferred deployment method:"
echo "  1) Bare-Metal (Node.js + PM2 + rclone) - Best for Linux VMs"
echo "  2) Docker Compose - Best for isolation"
echo ""
read -p "Enter 1 or 2: " DEPLOY_METHOD

echo ""
echo "--- 🔐 Environment Configuration ---"
read -p "Enter the RELAY_URL (e.g., http://your-relay-ip:3001 or wss://relay.domain.com): " RELAY_URL
read -p "Enter the WORKER_SECRET (must match the Relay Server): " WORKER_SECRET

# Write the .env file inside the backend workspace
echo "Writing backend/.env configuration..."
cat <<ENV > backend/.env
RELAY_URL=${RELAY_URL}
WORKER_SECRET=${WORKER_SECRET}
ENV

if [ "$DEPLOY_METHOD" == "1" ]; then
    echo ""
    echo "--- 🚀 Starting Bare-Metal Deployment (Node.js + PM2 + rclone) ---"

    echo "[1/5] Installing Node.js (v20)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E sh -
    sudo apt-get install -y nodejs

    echo "[2/5] Installing PM2 globally..."
    sudo npm install -g pm2

    echo "[3/5] Installing rclone (Required for Cloud Storage)..."
    if ! command -v rclone &> /dev/null; then
        curl -O https://rclone.org/install.sh && chmod +x install.sh && sudo ./install.sh
    else
        echo "rclone already installed."
    fi

    echo "[4/5] Installing Monorepo Dependencies and Compiling Contracts..."
    npm install
    npm run build --workspaces

    echo "[5/5] Starting Backend Worker daemon..."
    cd backend
    pm2 start dist/worker.js --name "swarm-worker"
    pm2 save
    pm2 startup

    echo "========================================================"
    echo "✅ Backend Worker successfully deployed via Bare-Metal!"
    echo "The worker is running in the background and connecting to ${RELAY_URL}."
    echo "Use 'pm2 logs swarm-worker' to view live traffic."
    echo "========================================================"

elif [ "$DEPLOY_METHOD" == "2" ]; then
    echo ""
    echo "--- 🐳 Starting Docker Deployment ---"

    if ! command -v docker &> /dev/null; then
        echo "[1/2] Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
    else
        echo "[1/2] Docker already installed."
    fi

    echo ""
    echo "Do you want to use a pre-built GitHub Container Registry (GHCR) image?"
    echo "If no, the script will build the Docker image locally from source."
    read -p "Enter GHCR Image URL (or press enter to build from source): " GHCR_IMAGE

    echo "[2/2] Generating standalone docker-compose.yml for Worker..."
    if [ -z "$GHCR_IMAGE" ]; then
        cat <<DOCKER > docker-compose-worker.yml
version: '3.8'

services:
  backend-worker:
    build:
      context: .
      dockerfile: backend/Dockerfile
    env_file:
      - backend/.env
    restart: unless-stopped
DOCKER
    else
        cat <<DOCKER > docker-compose-worker.yml
version: '3.8'

services:
  backend-worker:
    image: ${GHCR_IMAGE}
    env_file:
      - backend/.env
    restart: unless-stopped
DOCKER
    fi

    docker compose -f docker-compose-worker.yml up -d $( [ -z "$GHCR_IMAGE" ] && echo "--build" )

    echo "========================================================"
    echo "✅ Backend Worker successfully deployed via Docker!"
    echo "Use 'docker logs -f \$(docker compose -f docker-compose-worker.yml ps -q backend-worker)' to view logs."
    echo "========================================================"

else
    echo "❌ Invalid selection."
fi

echo ""
echo "⚠️  FIREWALL NOTE: YOU DO NOT NEED TO OPEN ANY PORTS! ⚠️"
echo "Because the Worker reaches OUTWARD to the Relay Server, it bypasses all inbound firewalls."
echo "========================================================"
