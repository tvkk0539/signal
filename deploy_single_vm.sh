#!/bin/bash

# ==============================================================================
# Swarm Command Center - Single VM Deployment Bootstrapper
# ==============================================================================
# This script automatically prepares a fresh Debian/Ubuntu VM (e.g. on GCP/AWS),
# installs Docker & Docker Compose, configures the necessary environment variables,
# and deploys the entire Swarm architecture via docker-compose.
# ==============================================================================

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}  Starting Swarm Command Center Deployment...${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Check if running as root or with sudo privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script with sudo or as root.${NC}"
  exit 1
fi

# Clean up any old override files from previous failed runs
rm -f docker-compose.override.yml

# 2. OS Detection (Basic check for Debian/Ubuntu)
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        echo -e "${YELLOW}[WARNING] This script is optimized for Ubuntu/Debian. Your OS ($ID) may not be fully supported, but we'll try to proceed.${NC}"
    else
        echo -e "${GREEN}[OK] OS Detected: $PRETTY_NAME${NC}"
    fi
else
    echo -e "${YELLOW}[WARNING] Could not detect OS. Proceeding with standard Debian/Ubuntu commands...${NC}"
fi

# 3. Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[INFO] Docker not found. Installing Docker...${NC}"

    # Update packages and install prerequisites
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release

    # Add Docker’s official GPG key
    mkdir -m 0755 -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$ID/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up the repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$ID \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine and Compose plugin
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    echo -e "${GREEN}[OK] Docker installed successfully.${NC}"
else
    echo -e "${GREEN}[OK] Docker is already installed.${NC}"
fi

# Start and enable docker service
systemctl enable docker
systemctl start docker

# 4. Interactive Configuration
echo -e "\n${BLUE}--- Configuration ---${NC}"
echo -e "To ensure the Web UI can connect to the Relay Server, we need to configure your Public IP or Domain Name."

# Try to auto-detect public IP via external service
DETECTED_IP=$(curl -s -m 5 https://ifconfig.me || echo "")

if [ -n "$DETECTED_IP" ]; then
    echo -e "Detected Public IP: ${YELLOW}$DETECTED_IP${NC}"
else
    DETECTED_IP=""
fi

read -p "Do you have a Subdomain/Domain pointed to this server? (e.g. swarm.example.com). If not, just press [Enter] to use the IP: " USER_DOMAIN

FINAL_HOST=""
if [ -n "$USER_DOMAIN" ]; then
    FINAL_HOST=$USER_DOMAIN
    # Ask about SSL if using a domain (Cloudflare often provides this free)
    read -p "Does your domain already use HTTPS/SSL (e.g. via Cloudflare)? (y/N): " USE_SSL
    if [[ "$USE_SSL" =~ ^[Yy]$ ]]; then
        PROTOCOL="https"
        HAS_CUSTOM_SSL=true
    else
        PROTOCOL="http"
        HAS_CUSTOM_SSL=false

        # Optional Free SSL via Certbot
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
            docker stop swarm-frontend 2>/dev/null || true

            certbot certonly --standalone -d $FINAL_HOST --non-interactive --agree-tos -m "$USER_EMAIL"

            if [ -d "/etc/letsencrypt/live/${FINAL_HOST}" ]; then
                echo -e "${GREEN}[OK] SSL Certificates generated successfully!${NC}"
                PROTOCOL="https"
                HAS_CUSTOM_SSL=true

                # We need to configure Nginx to use SSL
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
        proxy_pass http://relay:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://relay:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
                # Create a docker-compose override to mount the certs and the new config into the frontend container
                # We do this conditionally to gracefully merge with the MongoDB override if both are triggered.
                if [ ! -f docker-compose.override.yml ]; then
                    echo "version: '3.8'" > docker-compose.override.yml
                    echo "services:" >> docker-compose.override.yml
                fi
                cat <<EOF >> docker-compose.override.yml
  frontend:
    ports:
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./default.conf:/etc/nginx/conf.d/default.conf:ro
EOF
            else
                echo -e "${RED}[ERROR] Certbot failed to generate certificates. Falling back to HTTP.${NC}"
            fi
        fi
    fi
else
    if [ -n "$DETECTED_IP" ]; then
        read -p "No domain provided. Press [Enter] to use IP ($DETECTED_IP), or type a different one: " USER_IP
        if [ -z "$USER_IP" ]; then
            FINAL_HOST=$DETECTED_IP
        else
            FINAL_HOST=$USER_IP
        fi
    else
        read -p "No domain provided. Enter the Public IP of this VM (e.g., 203.0.113.50): " FINAL_HOST
    fi
    PROTOCOL="http"
fi

if [ -z "$FINAL_HOST" ]; then
    echo -e "${RED}[ERROR] A valid IP or Domain is required to configure the UI. Aborting.${NC}"
    exit 1
fi

# Clean up any accidental http:// typed by user
FINAL_HOST=$(echo $FINAL_HOST | sed -e 's|^[^/]*//||' -e 's|/.*$||')

# If using generated SSL via Certbot, we reverse proxy over 443, so drop the :3001 port
if [ "$INSTALL_CERTBOT" == "y" ] || [ "$INSTALL_CERTBOT" == "Y" ]; then
    FINAL_URL="${PROTOCOL}://${FINAL_HOST}"
else
    FINAL_URL="${PROTOCOL}://${FINAL_HOST}:3001"
fi
echo -e "${GREEN}[OK] UI will be configured to connect to Relay at: $FINAL_URL${NC}"

# 5. Database Configuration
echo -e "\n${BLUE}--- Database Configuration ---${NC}"
read -p "Do you have an external MongoDB connection string (e.g. MongoDB Atlas)? If so, paste it here. Otherwise, press [Enter] to install a local database: " USER_MONGO_URI

FINAL_MONGO_URI="mongodb://mongodb:27017/swarm_core"
if [ -n "$USER_MONGO_URI" ]; then
    FINAL_MONGO_URI="$USER_MONGO_URI"
    echo -e "${GREEN}[OK] Using External MongoDB URI.${NC}"

    # Remove the local mongodb block and depends_on from docker-compose.yml to save VM resources
    echo -e "${YELLOW}[INFO] Configuring docker-compose overrides to disable local MongoDB...${NC}"

    # The safest, highly-engineered way to disable a service in Docker Compose without parsing/destroying YAML
    # is to scale it to zero and unset its restart policy via an override file.
    # Note: We append (>>) or create conditionally to avoid overwriting the Nginx/SSL override block.
    if [ ! -f docker-compose.override.yml ]; then
        echo "version: '3.8'" > docker-compose.override.yml
        echo "services:" >> docker-compose.override.yml
    fi
    cat <<EOF >> docker-compose.override.yml
  mongodb:
    deploy:
      replicas: 0
    restart: "no"
EOF
else
    echo -e "${GREEN}[OK] Using Local Dockerized MongoDB.${NC}"
fi

# 6. Environment Variable Setup (.env generation)
echo -e "${YELLOW}[INFO] Generating .env file for docker-compose...${NC}"

cat <<EOF > .env
# Auto-generated by deploy_single_vm.sh
VITE_RELAY_URL=$FINAL_URL
PORT=3001
DB_TYPE=MONGODB
MONGODB_URI=$FINAL_MONGO_URI
WORKER_SECRET=production_secret_key_change_me
EOF

echo -e "${GREEN}[OK] .env file created.${NC}"

# 7. Check docker-compose.yml modification (We use .env variable replacement)
# The docker-compose.yml must be configured to use variables instead of hardcoded strings.

if grep -q "VITE_RELAY_URL=" docker-compose.yml; then
    sed -i 's/VITE_RELAY_URL=.*/VITE_RELAY_URL=${VITE_RELAY_URL}/g' docker-compose.yml
    echo -e "${GREEN}[OK] docker-compose.yml UI endpoints verified.${NC}"
fi

if grep -q "MONGODB_URI=" docker-compose.yml; then
    sed -i 's/MONGODB_URI=.*/MONGODB_URI=${MONGODB_URI}/g' docker-compose.yml
    echo -e "${GREEN}[OK] docker-compose.yml DB endpoints verified.${NC}"
fi

# 8. Deployment
echo -e "\n${BLUE}--- Deploying Swarm ---${NC}"
echo -e "Building containers and starting the architecture. This may take several minutes..."

# Using the modern 'docker compose' command (V2)
docker compose up -d --build

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}  🚀 DEPLOYMENT COMPLETE! 🚀${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "You can now access the Command Center UI at:"
echo -e "  -->  ${YELLOW}${PROTOCOL}://${FINAL_HOST}${NC}"
echo -e ""
echo -e "To view the logs of the Relay server, run:"
echo -e "  docker compose logs -f relay"
echo -e "===================================================="
