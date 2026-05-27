#!/bin/sh
# This script runs right before Nginx starts.
# It replaces the hardcoded __VITE_RELAY_URL_PLACEHOLDER__ in the compiled JS files
# with the actual $VITE_RELAY_URL environment variable provided at runtime.

if [ -n "$VITE_RELAY_URL" ]; then
  echo "Replacing placeholder with VITE_RELAY_URL: $VITE_RELAY_URL"
  find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|__VITE_RELAY_URL_PLACEHOLDER__|$VITE_RELAY_URL|g" {} +
else
  echo "Warning: VITE_RELAY_URL environment variable is not set!"
fi
