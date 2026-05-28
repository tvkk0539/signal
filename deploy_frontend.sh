#!/bin/bash

# ==============================================================================
# Distributed Swarm Command Center - Frontend UI Automated Deployment Script
# ==============================================================================

set -e

echo "========================================================"
echo "🖥️ Booting Frontend UI (The Command Center)"
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
echo "This script will build and serve the React Dashboard."
echo "Please select your preferred deployment method:"
echo "  1) Bare-Metal (Node.js Build + Static HTML) - Best for minimal footprint VMs"
echo "  2) Docker Compose - Best for utilizing pre-built GHCR Images"
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

    echo "[4/4] Generating deployment path..."
    REPO_PATH=$(pwd)
    FRONTEND_ROOT="${REPO_PATH}/frontend/dist"

    echo "✅ Frontend static assets built successfully."
    DEPLOY_SUCCESS_MSG="The UI is ready to be served from ${FRONTEND_ROOT}."

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
    # Note: We bind to an internal port (127.0.0.1:8080) so the Host Nginx proxy can take Port 80/443
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
      - "127.0.0.1:8080:80"
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
      - "127.0.0.1:8080:80"
    restart: unless-stopped
DOCKER
    fi

    docker compose -f docker-compose-frontend.yml up -d $( [ -z "$GHCR_IMAGE" ] && echo "--build" )

    echo "✅ Frontend UI successfully deployed via Docker."
    DEPLOY_SUCCESS_MSG="The Docker container is running internally on Port 8080."

else
    echo "❌ Invalid selection."
    exit 1
fi

echo ""
echo "--- 🌐 Domain & SSL Configuration ---"
echo "You can securely serve the Frontend using Nginx & Certbot."
read -p "Do you want to configure a Domain Name and get a FREE SSL Certificate? (y/n): " SETUP_SSL

if [[ "$SETUP_SSL" == "y" || "$SETUP_SSL" == "Y" ]]; then
    read -p "Enter your Domain Name (e.g., signalfrontend.neonlite.cc): " DOMAIN_NAME
    read -p "Enter an Admin Email (required by Let's Encrypt for renewal notices): " ADMIN_EMAIL

    echo "Installing Nginx and Securing with Let's Encrypt SSL..."
    sudo apt-get install -y nginx certbot python3-certbot-nginx

    # Generate the correct Nginx block depending on Bare-Metal (Static) vs Docker (Proxy)
    if [ "$DEPLOY_METHOD" == "1" ]; then
        sudo cat <<NGINX > /etc/nginx/sites-available/swarm-ui
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    root ${FRONTEND_ROOT};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
    elif [ "$DEPLOY_METHOD" == "2" ]; then
        sudo cat <<NGINX > /etc/nginx/sites-available/swarm-ui
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
    fi

    sudo ln -sf /etc/nginx/sites-available/swarm-ui /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo systemctl restart nginx

    sudo certbot --nginx -d "${DOMAIN_NAME}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect

    echo "========================================================"
    echo "✅ Frontend UI Successfully Deployed with SSL!"
    echo "You can securely visit the dashboard at: https://${DOMAIN_NAME}"
    echo -e "${DEPLOY_SUCCESS_MSG}"
    echo "========================================================"
else
    # If no SSL is wanted, but Nginx is needed for Bare-Metal
    if [ "$DEPLOY_METHOD" == "1" ]; then
        sudo apt-get install -y nginx
        sudo cat <<NGINX > /etc/nginx/sites-available/swarm-ui
server {
    listen 80;
    server_name _;

    root ${FRONTEND_ROOT};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
        sudo ln -sf /etc/nginx/sites-available/swarm-ui /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        sudo systemctl restart nginx
    fi

    echo "========================================================"
    echo "✅ Frontend UI Successfully Deployed!"
    echo -e "${DEPLOY_SUCCESS_MSG}"
    echo "========================================================"
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
