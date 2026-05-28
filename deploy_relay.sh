#!/bin/bash

# ==============================================================================
# Distributed Swarm Command Center - Relay Server Automated Deployment Script
# ==============================================================================

set -e

echo "========================================================"
echo "🤖 Booting Relay Server (The Central Nervous System)"
echo "========================================================"
echo ""

echo "--- 💾 System Optimization ---"
echo "If you are deploying on a tiny VM (like GCP e2-micro with 1GB RAM), the build process might crash due to low memory."
read -p "Do you want to create a 1GB Swap File to prevent Out-Of-Memory crashes? (y/n): " SETUP_SWAP
if [[ "$SETUP_SWAP" == "y" || "$SETUP_SWAP" == "Y" ]]; then
    echo "Creating 1GB Swap File..."
    sudo fallocate -l 1G /swapfile || true
    sudo chmod 600 /swapfile || true
    sudo mkswap /swapfile || true
    sudo swapon /swapfile || true
    echo "✅ Swap enabled."
fi

echo ""
echo "This script will deploy the ultra-efficient Relay Server."
echo "Please select your preferred deployment method:"
echo "  1) Bare-Metal (Node.js + PM2) - Best for minimal footprint VMs"
echo "  2) Docker Compose - Best for utilizing pre-built GHCR Images"
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
    cd ..

    echo "✅ Relay Server started via PM2."
    DEPLOY_SUCCESS_MSG="The server is running in the background on Port 3001.\nUse 'pm2 logs swarm-relay' to view live traffic."

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
      - "127.0.0.1:3001:3001"
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
      - "127.0.0.1:3001:3001"
    env_file:
      - relay/.env
    restart: unless-stopped
DOCKER
    fi

    docker compose -f docker-compose-relay.yml up -d $( [ -z "$GHCR_IMAGE" ] && echo "--build" )

    echo "✅ Relay Server started via Docker."
    DEPLOY_SUCCESS_MSG="The container is running internally on Port 3001.\nUse 'docker logs -f \$(docker compose -f docker-compose-relay.yml ps -q relay-server)' to view live traffic."

else
    echo "❌ Invalid selection."
    exit 1
fi

echo ""
echo "--- 🌐 Domain & SSL Configuration ---"
echo "You can securely proxy traffic to Port 3001 using Nginx & Certbot."
read -p "Do you want to configure a Domain Name and get a FREE SSL Certificate? (y/n): " SETUP_SSL

if [[ "$SETUP_SSL" == "y" || "$SETUP_SSL" == "Y" ]]; then
    read -p "Enter your Domain Name (e.g., signalrelay.neonlite.cc): " DOMAIN_NAME
    read -p "Enter an Admin Email (required by Let's Encrypt for renewal notices): " ADMIN_EMAIL

    echo "Installing Nginx and Securing with Let's Encrypt SSL..."
    sudo apt-get install -y nginx certbot python3-certbot-nginx

    sudo cat <<NGINX > /etc/nginx/sites-available/swarm-relay
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

    sudo ln -sf /etc/nginx/sites-available/swarm-relay /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo systemctl restart nginx

    sudo certbot --nginx -d "${DOMAIN_NAME}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect

    echo "========================================================"
    echo "✅ Relay Server Successfully Deployed with SSL!"
    echo "The server is securely running at: https://${DOMAIN_NAME}"
    echo -e "${DEPLOY_SUCCESS_MSG}"
    echo "========================================================"
else
    echo "========================================================"
    echo "✅ Relay Server Successfully Deployed!"
    echo -e "${DEPLOY_SUCCESS_MSG}"
    echo "========================================================"
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
