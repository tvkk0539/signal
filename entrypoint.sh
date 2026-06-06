#!/bin/sh
# ==============================================================================
# Swarm Command Center - Monolithic Appliance Entrypoint
# ==============================================================================

echo "[Swarm Monolith] Starting System Boot..."

# 1. Inject Dynamic Environment Variables into the pre-built React Frontend
# Vite bakes process.env at build time. We use sed to replace the placeholder dynamically at runtime.
if [ -n "$VITE_RELAY_URL" ]; then
    echo "[Swarm Monolith] Injecting VITE_RELAY_URL ($VITE_RELAY_URL) into frontend assets..."
    find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|__VITE_RELAY_URL_PLACEHOLDER__|$VITE_RELAY_URL|g" {} +
fi

# 2. Start Nginx (Frontend)
echo "[Swarm Monolith] Booting Nginx Server (Port 80)..."
nginx -g "daemon on;"

# 3. Start Relay Server (Central Nervous System)
echo "[Swarm Monolith] Booting Node.js Relay Server (Port 3001)..."
# We run it in the background
npm --workspace=relay run start:prod &
RELAY_PID=$!

# 4. Wait for Relay to bind before starting the Worker
# The worker needs the Relay to be active to establish its WebSocket connection
echo "[Swarm Monolith] Waiting for Relay to bind..."
sleep 5

# 5. Start Backend Worker
echo "[Swarm Monolith] Booting Node.js Backend Worker..."
# We explicitly set RELAY_URL to localhost because they are in the same container
export RELAY_URL="http://127.0.0.1:3001"
bash ./backend/bootstrap_worker.sh &
WORKER_PID=$!

echo "[Swarm Monolith] System is ONLINE. Serving Frontend on Port 80, Relay on Port 3001."

# Keep the container alive and listen to the background processes
wait $RELAY_PID $WORKER_PID