# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install OS dependencies required for rclone and potential ffmpeg encoding
RUN apk add --no-cache curl unzip bash ffmpeg

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
FROM node:20-alpine AS runner

WORKDIR /app

# Install rclone, git, and go in the final runner image for JIT Chimera Worker support
RUN apk add --no-cache curl unzip bash ffmpeg fuse git go \
    && curl https://rclone.org/install.sh | bash

# Setup Widevine Decryption Wrapper Environment
# Based on system architecture, download the appropriate wrapper and set up the `/app` ecosystem
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        WRAPPER_URL="https://github.com/zhaarey/wrapper/releases/download/linux.V2/wrapper.x86_64.tar.gz"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        WRAPPER_URL="https://github.com/zhaarey/wrapper/releases/download/arm64/wrapper.arm64.tar.gz"; \
    else \
        echo "Unsupported architecture for decryption wrapper: $ARCH" && exit 1; \
    fi && \
    mkdir -p /app/wrapper && \
    mkdir -p /app/rootfs/data && \
    curl -sL "$WRAPPER_URL" -o /app/wrapper/wrapper.tar.gz && \
    tar -xzf /app/wrapper/wrapper.tar.gz -C /app/wrapper && \
    rm /app/wrapper/wrapper.tar.gz && \
    chmod +x /app/wrapper/wrapper && \
    chmod -R 777 /app/rootfs/data

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