#!/bin/bash

# ==============================================================================
# Distributed Swarm Command Center - Frontend UI Automated Deployment Script
# ==============================================================================

set -e

echo "========================================================"
echo "🖥️ Booting Frontend UI (The Command Center)"
echo "========================================================"
echo ""
echo "This script will build and serve the React Dashboard."
echo "Please select your preferred deployment method:"
echo "  1) Bare-Metal (Nginx Static Hosting) - Extremely fast and lightweight"
echo "  2) Docker Compose - Best for isolation"
echo ""
read -p "Enter 1 or 2: " DEPLOY_METHOD

echo ""
echo "--- 🔐 Environment Configuration ---"
echo "IMPORTANT: The Frontend runs in the user's web browser."
echo "You MUST provide the exact URL the browser should use to reach the Relay Server."
read -p "Enter the VITE_RELAY_URL (e.g., http://your-relay-ip:3001 or wss://relay.domain.com): " VITE_RELAY_URL

# Write the .env file inside the frontend workspace
echo "Writing frontend/.env configuration..."
cat <<ENV > frontend/.env
VITE_RELAY_URL=${VITE_RELAY_URL}
ENV

if [ "$DEPLOY_METHOD" == "1" ]; then
    echo ""
    echo "--- 🚀 Starting Bare-Metal Deployment (Nginx) ---"

    echo "[1/4] Installing Node.js (v20) and Nginx..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs nginx

    echo "[2/4] Installing Monorepo Dependencies..."
    npm install

    echo "[3/4] Compiling Static React App..."
    npm run build --workspace=shared
    npm run build --workspace=frontend

    echo "[4/4] Configuring Nginx to serve the UI on Port 80..."
    REPO_PATH=$(pwd)

    sudo cat <<NGINX > /etc/nginx/sites-available/swarm-ui
server {
    listen 80;
    server_name _;

    root ${REPO_PATH}/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

    # Enable site, remove default, and restart
    sudo ln -sf /etc/nginx/sites-available/swarm-ui /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo systemctl restart nginx

    echo "========================================================"
    echo "✅ Frontend UI successfully deployed via Nginx!"
    echo "You can now visit this server's public IP address in your browser."
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

    echo "[2/2] Generating standalone docker-compose.yml for Frontend..."
    if [ -z "$GHCR_IMAGE" ]; then
        cat <<DOCKER > docker-compose-frontend.yml
version: '3.8'

services:
  frontend-ui:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    environment:
      - VITE_RELAY_URL=${VITE_RELAY_URL}
    ports:
      - "80:80"
    restart: unless-stopped
DOCKER
    else
        cat <<DOCKER > docker-compose-frontend.yml
version: '3.8'

services:
  frontend-ui:
    image: ${GHCR_IMAGE}
    environment:
      - VITE_RELAY_URL=${VITE_RELAY_URL}
    ports:
      - "80:80"
    restart: unless-stopped
DOCKER
    fi

    docker compose -f docker-compose-frontend.yml up -d $( [ -z "$GHCR_IMAGE" ] && echo "--build" )

    echo "========================================================"
    echo "✅ Frontend UI successfully deployed via Docker!"
    echo "You can now visit this server's public IP address on Port 80."
    echo "========================================================"

else
    echo "❌ Invalid selection."
fi

echo ""
echo "⚠️  CRITICAL CLOUD FIREWALL INSTRUCTIONS ⚠️"
echo "If you are hosting this on Google Cloud Platform (GCP), AWS, or Azure:"
echo "1. Go to your Cloud Console -> VPC Network -> Firewall Rules."
echo "2. Create a new rule allowing INGRESS TCP traffic on Port 80 (HTTP)."
echo "3. If you do not do this, the website will not load in your browser!"
echo ""
echo "🔐 SSL/HTTPS NOTE:"
echo "If you configure an SSL certificate (https://) for this UI server, your VITE_RELAY_URL MUST point to a secure 'wss://' domain, or the browser will block the connection due to 'Mixed Content' security rules."
echo "========================================================"
