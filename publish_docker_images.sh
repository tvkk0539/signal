#!/bin/bash

# ==============================================================================
# Swarm Command Center - Docker Image Publisher
# ==============================================================================
# Run this script ON YOUR LOCAL MACHINE (not the GCP VM).
# It will build the production Docker images and push them to your Docker Hub.
# This allows your Cloud VMs to deploy instantly without compiling Go/Node.js!
# ==============================================================================

set -e # Exit on error

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}  Swarm Command Center - Pre-Built Image Publisher${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker must be installed on your machine to build images.${NC}"
    exit 1
fi

# Ensure user is logged in to Docker Hub
echo -e "${YELLOW}[INFO] Please ensure you are logged into Docker Hub (run 'docker login' if you haven't).${NC}"

read -p "Enter your Docker Hub Username (e.g. johndoe): " DOCKER_USER
if [ -z "$DOCKER_USER" ]; then
    echo -e "${RED}[ERROR] Username cannot be empty.${NC}"
    exit 1
fi

TAG="latest"

echo -e "\n${BLUE}--- Building & Pushing Relay Image ---${NC}"
docker build -t ${DOCKER_USER}/swarm-relay:${TAG} -f relay/Dockerfile .
docker push ${DOCKER_USER}/swarm-relay:${TAG}

echo -e "\n${BLUE}--- Building & Pushing Backend Worker Image ---${NC}"
docker build -t ${DOCKER_USER}/swarm-worker:${TAG} -f backend/Dockerfile .
docker push ${DOCKER_USER}/swarm-worker:${TAG}

echo -e "\n${BLUE}--- Building & Pushing Frontend Image ---${NC}"
docker build -t ${DOCKER_USER}/swarm-frontend:${TAG} -f frontend/Dockerfile .
docker push ${DOCKER_USER}/swarm-frontend:${TAG}

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}  🚀 IMAGES SUCCESSFULLY PUSHED TO DOCKER HUB! 🚀${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "Your images are now public at:"
echo -e "  - ${DOCKER_USER}/swarm-relay:${TAG}"
echo -e "  - ${DOCKER_USER}/swarm-worker:${TAG}"
echo -e "  - ${DOCKER_USER}/swarm-frontend:${TAG}"
echo -e "\nTo deploy instantly on a VM, create a 'docker-compose.prod.yml' on the VM:"
echo -e "Instead of 'build: context: .', use 'image: ${DOCKER_USER}/swarm-relay' etc."

# Generate the fast-deploy compose file
cat <<EOF > docker-compose.fast.yml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: swarm-core-db
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - swarm_mongo_data:/data/db
    networks:
      - swarm-network

  relay:
    image: ${DOCKER_USER}/swarm-relay:${TAG}
    container_name: swarm-relay
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DB_TYPE=MONGODB
      - MONGODB_URI=mongodb://mongodb:27017/swarm_core
    depends_on:
      - mongodb
    networks:
      - swarm-network

  backend-worker:
    image: ${DOCKER_USER}/swarm-worker:${TAG}
    container_name: swarm-worker-1
    restart: unless-stopped
    privileged: true
    environment:
      - RELAY_URL=http://relay:3001
      - WORKER_SECRET=production_secret_key_change_me
    depends_on:
      - relay
    networks:
      - swarm-network

  frontend:
    image: ${DOCKER_USER}/swarm-frontend:${TAG}
    container_name: swarm-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    environment:
      - VITE_RELAY_URL=\${VITE_RELAY_URL:-http://localhost:3001}
    depends_on:
      - relay
    networks:
      - swarm-network

volumes:
  swarm_mongo_data:

networks:
  swarm-network:
    driver: bridge
EOF

echo -e "\n${YELLOW}[INFO] I have generated a 'docker-compose.fast.yml' in this directory.${NC}"
echo -e "You can copy this file to your GCP VM and run: ${BLUE}docker compose -f docker-compose.fast.yml up -d${NC}"
echo -e "This will download your pre-built images instantly without needing the source code!"