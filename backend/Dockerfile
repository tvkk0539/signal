# Stage 1: Build
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install robust build dependencies (including ffmpeg and networking tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    gcc \
    libffi-dev \
    fuse3 \
    build-essential \
    zlib1g-dev \
    wget \
    cmake \
    pkg-config \
    libssl-dev \
    unzip \
    zip \
    libxml2 \
    libxslt1.1 \
    curl \
    sudo \
    git \
    net-tools \
    iputils-ping \
    tar \
    make \
    automake \
    autoconf \
    libtool \
    ca-certificates \
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

# Install modern Go directly (to satisfy 1.23.1+ module requirements)
ENV GO_VERSION=1.24.0 \
    PATH="/usr/local/go/bin:$PATH"

RUN ARCH=$(uname -m) && \
    case "$ARCH" in \
        x86_64) GO_ARCH="amd64" ;; \
        aarch64) GO_ARCH="arm64" ;; \
        armv7l) GO_ARCH="armv6l" ;; \
        i686) GO_ARCH="386" ;; \
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;; \
    esac && \
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-${GO_ARCH}.tar.gz" -O /tmp/go.tar.gz && \
    tar -C /usr/local -xzf /tmp/go.tar.gz && \
    rm /tmp/go.tar.gz

# Stage 2: Production Run
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install robust runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libxml2 \
    libxslt1.1 \
    gcc \
    file \
    unzip \
    curl \
    wget \
    fuse3 \
    git \
    tar \
    net-tools \
    iputils-ping \
    zip \
    nano \
    ca-certificates \
    sudo \
    && rm -rf /var/lib/apt/lists/* \
    && curl https://rclone.org/install.sh | bash

# Copy modern Go from builder
COPY --from=builder /usr/local/go /usr/local/go

# Set production environment variables
ENV NODE_ENV=production \
    PATH="/usr/local/go/bin:$PATH"

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