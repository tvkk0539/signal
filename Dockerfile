# ==============================================================================
# Swarm Command Center - Monolithic Appliance Build
# ==============================================================================
# This Dockerfile packs the React Frontend, Node Relay Server, and Node Backend Worker
# (along with all heavy media tools like Go, Rclone, Bento4) into a SINGLE image.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Everything
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install robust build dependencies
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
    git \
    tar \
    make \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration
COPY package.json package-lock.json tsconfig.base.json ./

# Copy all source code
COPY shared ./shared
COPY relay ./relay
COPY backend ./backend
COPY frontend ./frontend

# Install dependencies for all workspaces
RUN npm ci

# Build Shared Contracts
RUN npm run build --workspace=shared

# Build Relay Server
RUN npm run build --workspace=relay

# Build Backend Worker
RUN npm run build --workspace=backend

# Build Frontend
# Inject a specific placeholder that our entrypoint.sh will replace dynamically
ENV VITE_RELAY_URL=__VITE_RELAY_URL_PLACEHOLDER__
RUN npm run build --workspace=frontend

# Install modern Go directly for Ripper dependencies
ENV GO_VERSION=1.24.0
RUN ARCH=$(uname -m) && \
    case "$ARCH" in \
        x86_64) GO_ARCH="amd64" ;; \
        aarch64) GO_ARCH="arm64" ;; \
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;; \
    esac && \
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-${GO_ARCH}.tar.gz" -O /tmp/go.tar.gz && \
    tar -C /usr/local -xzf /tmp/go.tar.gz && \
    rm /tmp/go.tar.gz

# Install Bento4
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        BENTO4_URL="https://github.com/kishorkumartv000/amd-bootstrap-for-test/raw/refs/heads/main/Bento4-SDK-1-6-0-641.x86_64-unknown-linux.zip"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        BENTO4_URL="https://github.com/axiomatic-systems/Bento4/releases/download/v1.6.0-639/Bento4-SDK-1.6.0-639.aarch64-unknown-linux.zip"; \
    fi && \
    mkdir -p /tmp/Bento4 && \
    cd /tmp/Bento4 && \
    wget -q "$BENTO4_URL" -O bento4.zip && \
    unzip -o -q bento4.zip && \
    cd Bento4-SDK-* && \
    mkdir -p /usr/local/bin/Bento4 && \
    find bin/ -maxdepth 1 -type f -executable -exec cp {} /usr/local/bin/Bento4/ \; && \
    cp -r include /usr/local/include/Bento4 && \
    cp -r lib /usr/local/lib/Bento4 && \
    rm -rf /tmp/Bento4

# Build GPAC (MP4Box)
RUN mkdir -p /tmp/gpac && \
    cd /tmp/gpac && \
    git clone https://github.com/gpac/gpac.git && \
    cd gpac && \
    ./configure --static-bin && \
    make -j"$(nproc)" && \
    make install && \
    chmod +x /usr/local/bin/MP4Box && \
    rm -rf /tmp/gpac

# Install N_m3u8DL-RE
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        RE_URL="https://github.com/nilaoda/N_m3u8DL-RE/releases/download/v0.3.0-beta/N_m3u8DL-RE_v0.3.0-beta_linux-x64_20241203.tar.gz"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        RE_URL="https://github.com/nilaoda/N_m3u8DL-RE/releases/download/v0.3.0-beta/N_m3u8DL-RE_v0.3.0-beta_linux-arm64_20241203.tar.gz"; \
    fi && \
    mkdir -p /tmp/N_m3u8DL-RE && \
    cd /tmp/N_m3u8DL-RE && \
    wget -q "$RE_URL" -O re.tar.gz && \
    tar -xzf re.tar.gz && \
    find . -type f -name "N_m3u8DL-RE" -exec cp {} /usr/local/bin/N_m3u8DL-RE \; && \
    chmod +x /usr/local/bin/N_m3u8DL-RE && \
    rm -rf /tmp/N_m3u8DL-RE

# ------------------------------------------------------------------------------
# Stage 2: Production Appliance
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install Nginx, Rclone, and backend runtime requirements
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    ffmpeg \
    libxml2 \
    libxslt1.1 \
    gcc \
    libc6-dev \
    build-essential \
    file \
    unzip \
    curl \
    wget \
    fuse3 \
    git \
    tar \
    net-tools \
    iputils-ping \
    procps \
    psmisc \
    zip \
    ca-certificates \
    sudo \
    && rm -rf /var/lib/apt/lists/* \
    && curl https://rclone.org/install.sh | bash

# Configure Nginx
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
# A basic configuration allowing SPA routing
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

# Copy Media Tools from builder
COPY --from=builder /usr/local/go /usr/local/go
COPY --from=builder /usr/local/bin/Bento4 /usr/local/bin/Bento4
COPY --from=builder /usr/local/bin/MP4Box /usr/local/bin/MP4Box
COPY --from=builder /usr/local/bin/N_m3u8DL-RE /usr/local/bin/N_m3u8DL-RE
COPY --from=builder /usr/local/lib/Bento4 /usr/local/lib/Bento4
COPY --from=builder /usr/local/include/Bento4 /usr/local/include/Bento4

ENV NODE_ENV=production \
    PATH="/usr/local/go/bin:/usr/local/bin/Bento4:$PATH"

# Copy built Monorepo workspaces
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/relay ./relay
COPY --from=builder /app/backend ./backend

# Copy the monolithic entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose Nginx (80) and Relay WebSockets (3001)
EXPOSE 80 3001

CMD ["/app/entrypoint.sh"]