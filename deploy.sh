#!/bin/bash

# ==============================================================================
# Automated Bare-Metal Deployment Script for Swarm Infrastructure
# WARNING: This script is intended for fresh Ubuntu/Debian VMs.
# ==============================================================================

set -e

echo "🚀 Starting Bare-Metal Deployment of Swarm Infrastructure..."

# 1. Install System Requirements
echo "📦 Installing system dependencies (Node.js, PM2, rclone)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs unzip curl ffmpeg fuse

# Install rclone globally
if ! command -v rclone &> /dev/null
then
    curl https://rclone.org/install.sh | sudo bash
fi

# Install PM2 globally for process management
sudo npm install -g pm2

# 2. Setup Monorepo
echo "⚙️ Setting up Monorepo Workspaces..."
npm install

# Build Shared Contracts
echo "🏗️ Building Shared Data Contracts..."
npm run build --workspace=shared

# Build Microservices
echo "🏗️ Building Relay Server and Backend Worker..."
npm run build --workspace=relay
npm run build --workspace=backend

# Build Frontend Web UI
echo "🏗️ Building Frontend React UI..."
npm run build --workspace=frontend

# 3. Spin Up Services using PM2
echo "🔥 Igniting the Swarm Services via PM2..."

# Stop existing processes if this is a redeployment
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start the Central Relay Server
# In production, set JWT_SECRET and MONGO_URI in the environment
pm2 start npm --name "swarm-relay" --workspace=relay -- run start:prod

# Start a local Backend Worker attached to the Relay
# In production, set WORKER_SECRET in the environment
pm2 start npm --name "swarm-worker-1" --workspace=backend -- run start:prod

# 4. Save PM2 configuration to restart on system reboot
pm2 save
pm2 startup

echo "✅ Deployment Complete!"
echo "📡 Relay Server is running on port 3001"
echo "🖥️  Frontend static files are located in ./frontend/dist (Serve via Nginx/Caddy)"
echo "📊 Run 'pm2 logs' to monitor the swarm."