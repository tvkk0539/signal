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

# Install Bento4
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        BENTO4_URL="https://github.com/kishorkumartv000/amd-bootstrap-for-test/raw/refs/heads/main/Bento4-SDK-1-6-0-641.x86_64-unknown-linux.zip"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        BENTO4_URL="https://github.com/axiomatic-systems/Bento4/releases/download/v1.6.0-639/Bento4-SDK-1.6.0-639.aarch64-unknown-linux.zip"; \
    else \
        echo "Unsupported architecture: $ARCH"; exit 1; \
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

# Install N_m3u8DL-RE (Architecture aware)
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

# Copy Advanced Media Tools from builder
COPY --from=builder /usr/local/bin/Bento4 /usr/local/bin/Bento4
COPY --from=builder /usr/local/bin/MP4Box /usr/local/bin/MP4Box
COPY --from=builder /usr/local/bin/N_m3u8DL-RE /usr/local/bin/N_m3u8DL-RE
COPY --from=builder /usr/local/lib/Bento4 /usr/local/lib/Bento4
COPY --from=builder /usr/local/include/Bento4 /usr/local/include/Bento4

# Set production environment variables (Add Go and Bento4 to PATH)
ENV NODE_ENV=production \
    PATH="/usr/local/go/bin:/usr/local/bin/Bento4:$PATH"

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