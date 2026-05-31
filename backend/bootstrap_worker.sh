#!/bin/bash
set -e
set -o pipefail

# -----------------------------------------------------------------------------
# JIT (Just-In-Time) Bootstrapper for Distributed Swarm Workers
#
# This script ensures the ephemeral worker possesses the absolute latest
# Apple Music Ripper tools compiled from source before booting Node.js.
# -----------------------------------------------------------------------------

DOWNLOAD_ROOT=${DOWNLOAD_ROOT:-"/tmp/swarm_data"}
APP_DIR="$DOWNLOAD_ROOT/apple_music"
RIPPER_REPO_DIR="$APP_DIR/apple-music-downloader"
WRAPPER_DIR="$APP_DIR/wrapper"
RIPPER_URL="https://github.com/zhaarey/apple-music-downloader"

log_info() {
    echo -e "\e[1;36m[JIT Bootstrap]\e[0m $1"
}

log_error() {
    echo -e "\e[1;31m[ERROR]\e[0m $1"
    exit 1
}

# 1. Setup Base Directories
log_info "Initializing Swarm Worker Environment..."
mkdir -p "$APP_DIR"
mkdir -p "$WRAPPER_DIR"
mkdir -p "$APP_DIR/rootfs/data"
chmod -R 777 "$APP_DIR/rootfs"

# 2. Sync and Compile Ripper Core (Go)
log_info "Synchronizing Ripper Engine repository..."
if [ ! -d "$RIPPER_REPO_DIR" ]; then
    log_info "Cloning fresh repository..."
    git clone "$RIPPER_URL" "$RIPPER_REPO_DIR"
else
    log_info "Repository exists. Pulling latest commits..."
    cd "$RIPPER_REPO_DIR" && git pull || log_error "Failed to pull latest commits."
fi

log_info "Compiling highly-optimized binary executable..."
cd "$RIPPER_REPO_DIR"
if command -v go >/dev/null 2>&1; then
    go build -o "$APP_DIR/am-ripper" main.go || log_error "Go compilation failed."
    log_info "Compilation successful."
else
    log_info "Go compiler not found. Bypassing compilation (Development Mode)."
    # In a pure Docker environment, Go would be installed in the base image.
fi

# 3. Handoff to Node.js
log_info "JIT Bootstrap Complete. Handing off to Node.js Swarm Orchestrator..."

# If running in standard Docker, cd to backend workspace
if [ -d "/app/backend" ]; then
    cd /app/backend
fi

# Execute the Swarm Worker directly, replacing the bash process
if [ "$NODE_ENV" = "production" ]; then
    log_info "Booting Production Mode (dist/worker.js)"
    exec node dist/worker.js
else
    log_info "Booting Development Mode (ts-node)"
    exec npx ts-node src/worker.ts
fi