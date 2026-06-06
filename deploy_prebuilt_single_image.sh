#!/bin/bash

# ==============================================================================
# Swarm Command Center - Prebuilt Appliance Deployment
# ==============================================================================
# Run this script ON YOUR CLOUD VM (GCP/AWS).
# It will pull the monolithic "Swarm Appliance" Docker Image built by Github Actions
# and instantly boot the entire platform in a single container.
# ==============================================================================

set -e # Exit on error

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}  Swarm Command Center - Instant Appliance Deploy${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[INFO] Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    echo -e "${GREEN}[OK] Docker installed.${NC}"
fi

# 2. Configuration Prompts
echo -e "\n${BLUE}--- Configuration ---${NC}"

# Ask for the GitHub Container Registry namespace
echo -e "${YELLOW}[INFO] Your image should be hosted at ghcr.io/YOUR_GITHUB_ORG/REPO_NAME-appliance:latest${NC}"
read -p "Enter the full GHCR image URL (e.g. ghcr.io/my-org/swarm-appliance:latest): " IMAGE_NAME
if [ -z "$IMAGE_NAME" ]; then
    echo -e "${RED}[ERROR] Image URL cannot be empty.${NC}"
    exit 1
fi

# Safety check to prevent users from accidentally pulling GitHub Action cache layers
if [[ "$IMAGE_NAME" == *":buildcache"* ]]; then
    echo -e "${RED}[ERROR] You entered a URL ending in ':buildcache'.${NC}"
    echo -e "${YELLOW}Docker cannot run a 'buildcache' because it is just a hidden temporary file used by GitHub Actions, not a real image.${NC}"
    echo -e "${GREEN}Please re-run the script and use the tag ':latest' instead!${NC}"
    exit 1
fi

# Ensure user is authenticated to GHCR if the repo is private
echo -e "${YELLOW}[INFO] If your repository is PRIVATE, you must run 'docker login ghcr.io' first!${NC}"

# Get the URL/IP to configure WebSockets
DETECTED_IP=$(curl -s -m 5 https://ifconfig.me || echo "")
read -p "Enter your Domain or Public IP (Detected: $DETECTED_IP). Leave blank to use detected: " USER_DOMAIN

FINAL_HOST=""
if [ -n "$USER_DOMAIN" ]; then
    FINAL_HOST=$USER_DOMAIN
else
    FINAL_HOST=$DETECTED_IP
fi

read -p "Are you using an SSL Reverse Proxy (like Cloudflare) for this domain? (y/N): " USE_SSL
if [[ "$USE_SSL" =~ ^[Yy]$ ]]; then
    PROTOCOL="https"
    FINAL_URL="${PROTOCOL}://${FINAL_HOST}"
    HAS_CUSTOM_SSL=true
    DOCKER_SSL_ARGS=""
else
    PROTOCOL="http"
    FINAL_URL="${PROTOCOL}://${FINAL_HOST}:3001"
    HAS_CUSTOM_SSL=false
    DOCKER_SSL_ARGS=""

    # Optional Free SSL via Certbot (Only if they actually provided a domain, not just an IP)
    if [[ "$FINAL_HOST" =~ [a-zA-Z] ]]; then
        echo -e "\n${YELLOW}[INFO] You have a domain but no SSL.${NC}"
        read -p "Would you like to automatically install a FREE Let's Encrypt SSL certificate using Certbot? (y/N): " INSTALL_CERTBOT
        if [[ "$INSTALL_CERTBOT" =~ ^[Yy]$ ]]; then
            read -p "Enter your email address (Required by Let's Encrypt for urgent renewal notices): " USER_EMAIL
            if [ -z "$USER_EMAIL" ]; then
                echo -e "${YELLOW}[WARNING] No email provided. Using a dummy email. You won't receive expiry warnings!${NC}"
                USER_EMAIL="admin@${FINAL_HOST}"
            fi

            echo -e "Installing Certbot and generating certificates for ${FINAL_HOST}..."
            apt-get install -y certbot

            # Stop any process listening on Port 80 before running standalone challenge
            systemctl stop nginx 2>/dev/null || true
            docker stop swarm-appliance 2>/dev/null || true

            certbot certonly --standalone -d $FINAL_HOST --non-interactive --agree-tos -m "$USER_EMAIL"

            if [ -d "/etc/letsencrypt/live/${FINAL_HOST}" ]; then
                echo -e "${GREEN}[OK] SSL Certificates generated successfully!${NC}"
                PROTOCOL="https"
                FINAL_URL="${PROTOCOL}://${FINAL_HOST}"
                HAS_CUSTOM_SSL=true

                # We need to configure Nginx to use SSL and route websockets internally
                echo -e "${YELLOW}[INFO] Creating custom Nginx SSL configuration...${NC}"
                cat <<EOF > default.conf
server {
    listen 80;
    server_name $FINAL_HOST;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $FINAL_HOST;

    ssl_certificate /etc/letsencrypt/live/$FINAL_HOST/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$FINAL_HOST/privkey.pem;

    root /usr/share/nginx/html;
    index index.html index.htm;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Reverse proxy for Relay Server WebSockets and API to bypass mixed-content errors
    location /socket.io/ {
        # The relay is running on the same container on port 3001
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

                # Build the extra args required for the docker run command
                DOCKER_SSL_ARGS="-p 443:443 -v /etc/letsencrypt:/etc/letsencrypt:ro -v $(pwd)/default.conf:/etc/nginx/conf.d/default.conf:ro"
            else
                echo -e "${RED}[ERROR] Certbot failed to generate certificates. Falling back to HTTP.${NC}"
            fi
        fi
    fi
fi

# Ask for MongoDB Configuration
read -p "Enter your external MongoDB Connection String (Atlas). Leave blank to run without persistent users: " MONGO_URI
if [ -z "$MONGO_URI" ]; then
    MONGO_URI="mongodb://localhost:27017/swarm_core"
    echo -e "${YELLOW}[WARNING] No MongoDB provided. System will use in-memory MOCK mode. Data will wipe on reboot.${NC}"
fi

# 3. Pull and Run the Appliance
echo -e "\n${BLUE}--- Booting the Monolith ---${NC}"
echo -e "${YELLOW}Pulling image: $IMAGE_NAME ...${NC}"

docker pull $IMAGE_NAME

# Stop any existing container
docker stop swarm-appliance 2>/dev/null || true
docker rm swarm-appliance 2>/dev/null || true

# Run the giant monolithic container
# We must run --privileged to allow Rclone and fuse mounts inside the worker processes if needed
echo -e "${YELLOW}Starting container...${NC}"
docker run -d \
    --name swarm-appliance \
    --restart unless-stopped \
    --privileged \
    -p 80:80 \
    -p 3001:3001 \
    $DOCKER_SSL_ARGS \
    -e VITE_RELAY_URL="$FINAL_URL" \
    -e MONGODB_URI="$MONGO_URI" \
    -e DB_TYPE="MONGODB" \
    -e WORKER_SECRET="production_secret_key_change_me" \
    $IMAGE_NAME

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}  🚀 APPLIANCE DEPLOYMENT COMPLETE! 🚀${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "You can now access the Command Center UI at:"
echo -e "  -->  ${YELLOW}${PROTOCOL}://${FINAL_HOST}${NC}"
echo -e ""
echo -e "To view the combined logs (Nginx, Relay, Worker), run:"
echo -e "  docker logs -f swarm-appliance"
echo -e "===================================================="