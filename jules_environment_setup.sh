#!/bin/bash
echo "Starting Jules Environment Setup..."
cd /app
npm install
curl https://rclone.org/install.sh | sudo bash
npx playwright install --with-deps chromium
echo "Environment Setup Complete."
