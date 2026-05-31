# Stage 1: Build
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install OS dependencies required for rclone and potential ffmpeg encoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip bash ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy root configurations
COPY package.json package-lock.json tsconfig.base.json ./

# Copy workspaces
COPY shared ./shared
COPY backend ./backend

# Install NPM dependencies
RUN npm ci

# Build shared contracts
RUN npm run build --workspace=shared

# Build backend worker
RUN npm run build --workspace=backend

# Stage 2: Production Run
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install rclone, git, and go in the final runner image for JIT Chimera Worker support
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip bash ffmpeg fuse git golang-go ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl https://rclone.org/install.sh | bash

# Set production environment variable for bootstrap
ENV NODE_ENV=production

# Copy built assets
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/bootstrap_worker.sh ./backend/

# Workers do not need to expose ports, they connect outbound to the Relay.
# We boot using the JIT Bootstrapper to automatically pull and compile Apple Music decrypters dynamically.
CMD ["bash", "./backend/bootstrap_worker.sh"]