#!/bin/sh

# ==============================================================================
# Nginx Docker Entrypoint Script
# Injects runtime environment variables into compiled static Vite/React assets.
# ==============================================================================

echo "[nginx-entrypoint] Running environment variable injection..."

# Check if VITE_RELAY_URL is provided as an environment variable
if [ -z "$VITE_RELAY_URL" ]; then
  echo "[nginx-entrypoint] WARNING: VITE_RELAY_URL environment variable is not set!"
  echo "[nginx-entrypoint] The UI will likely fallback to http://localhost:3001"
else
  echo "[nginx-entrypoint] VITE_RELAY_URL is set to: $VITE_RELAY_URL"

  # Search and replace the placeholder in all JS files in the Nginx HTML directory
  # Note: The placeholder in source code is split ('__VITE_RELAY_URL_' + 'PLACEHOLDER__')
  # so Vite compiles it into exactly '__VITE_RELAY_URL_PLACEHOLDER__' in the final bundle.

  find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|__VITE_RELAY_URL_PLACEHOLDER__|$VITE_RELAY_URL|g" {} +

  echo "[nginx-entrypoint] Environment variable injection complete."
fi

# Do NOT include `exec "$@"` here.
# Nginx's official entrypoint script sources files in /docker-entrypoint.d/
# and automatically handles execution of the main CMD.
