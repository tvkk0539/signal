#!/bin/bash
echo "Starting Jules Environment Setup..."
cd /app
npm install
curl https://rclone.org/install.sh | sudo bash
sudo apt-get update && sudo apt-get install -y procps psmisc
npx playwright install --with-deps chromium
echo "Environment Setup Complete."
