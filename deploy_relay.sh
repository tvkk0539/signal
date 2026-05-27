#!/bin/bash

# ==============================================================================
# Distributed Swarm Command Center - Relay Server Automated Deployment Script
# ==============================================================================

set -e

echo "========================================================"
echo "🤖 Booting Relay Server (The Central Nervous System)"
echo "========================================================"
echo ""
echo "This script will deploy the ultra-efficient Relay Server."
echo "Please select your preferred deployment method:"
echo "  1) Bare-Metal (Node.js + PM2) - Best for minimal footprint VMs"
echo "  2) Docker Compose - Best for enterprise scale and isolation"
echo ""
read -p "Enter 1 or 2: " DEPLOY_METHOD

echo ""
echo "--- 🔐 Environment Configuration ---"
read -p "Enter a highly secure JWT_SECRET (for UI logins): " JWT_SECRET
read -p "Enter a highly secure WORKER_SECRET (for Backend auth): " WORKER_SECRET
read -p "Enter your MONGO_URI (or press enter to use a local fallback): " MONGO_URI

if [ -z "$MONGO_URI" ]; then
    MONGO_URI="mongodb://localhost:27017/swarm"
fi

# Write the .env file inside the relay workspace
echo "Writing relay/.env configuration..."
cat <<ENV > relay/.env
PORT=3001
JWT_SECRET=${JWT_SECRET}
WORKER_SECRET=${WORKER_SECRET}
DB_TYPE=MONGODB
MONGO_URI=${MONGO_URI}
ENV

if [ "$DEPLOY_METHOD" == "1" ]; then
    echo ""
    echo "--- 🚀 Starting Bare-Metal Deployment (Node.js + PM2) ---"

    echo "[1/4] Installing Node.js (v20)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    echo "[2/4] Installing PM2 globally..."
    sudo npm install -g pm2

    echo "[3/4] Installing Monorepo Dependencies and Compiling Contracts..."
    npm install
    npm run build --workspaces

    echo "[4/4] Starting Relay Server daemon..."
    cd relay
    pm2 start dist/server.js --name "swarm-relay"
    pm2 save
    pm2 startup

    echo "========================================================"
    echo "✅ Relay Server successfully deployed via Bare-Metal!"
    echo "The server is running in the background on Port 3001."
    echo "Use 'pm2 logs swarm-relay' to view live traffic."

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

    echo "[2/2] Generating standalone docker-compose.yml for Relay..."
    if [ -z "$GHCR_IMAGE" ]; then
        cat <<DOCKER > docker-compose-relay.yml
version: '3.8'

services:
  relay-server:
    build:
      context: .
      dockerfile: relay/Dockerfile
    ports:
      - "3001:3001"
    env_file:
      - relay/.env
    restart: unless-stopped
DOCKER
    else
        cat <<DOCKER > docker-compose-relay.yml
version: '3.8'

services:
  relay-server:
    image: ${GHCR_IMAGE}
    ports:
      - "3001:3001"
    env_file:
      - relay/.env
    restart: unless-stopped
DOCKER
    fi

    docker compose -f docker-compose-relay.yml up -d $( [ -z "$GHCR_IMAGE" ] && echo "--build" )

    echo "========================================================"
    echo "✅ Relay Server successfully deployed via Docker!"
    echo "The container is running on Port 3001."
    echo "Use 'docker logs -f \$(docker compose -f docker-compose-relay.yml ps -q relay-server)' to view live traffic."

else
    echo "❌ Invalid selection."
fi

echo ""
echo "⚠️  CRITICAL CLOUD FIREWALL INSTRUCTIONS ⚠️"
echo "If you are hosting this on Google Cloud Platform (GCP), AWS, or Azure:"
echo "1. Go to your Cloud Console -> VPC Network -> Firewall Rules."
echo "2. Create a new rule allowing INGRESS TCP traffic on Port 3001."
echo "3. If you do not do this, the UI and Workers will timeout trying to connect!"
echo ""
echo "🌐 If you DO NOT have a domain name:"
echo "Your Frontend and Backend MUST connect using: ws://YOUR_SERVER_PUBLIC_IP:3001"
echo "(Note: Browsers block 'ws://' if the UI is hosted on an 'https://' website. You must host the UI on plain 'http://' to test without a domain)."
echo "========================================================"
