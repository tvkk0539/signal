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

# Ask for the Docker Hub image namespace
read -p "Enter your Docker Hub Username (where the 'swarm-monolith' image is hosted): " DOCKER_USER
if [ -z "$DOCKER_USER" ]; then
    echo -e "${RED}[ERROR] Docker Username cannot be empty.${NC}"
    exit 1
fi

IMAGE_NAME="${DOCKER_USER}/swarm-monolith:latest"

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
else
    PROTOCOL="http"
    FINAL_URL="${PROTOCOL}://${FINAL_HOST}:3001"
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