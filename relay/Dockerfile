# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root configurations and workspace definitions
COPY package.json package-lock.json tsconfig.base.json ./

# Copy the specific workspaces needed for the Relay Server
COPY shared ./shared
COPY relay ./relay

# Install dependencies (utilizing npm workspaces)
RUN npm ci

# Build the shared contracts first
RUN npm run build --workspace=shared

# Build the Relay Server
RUN npm run build --workspace=relay

# Stage 2: Production Run
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/relay/package.json ./relay/
COPY --from=builder /app/relay/dist ./relay/dist

# Expose the Relay Port
EXPOSE 3001

# Start the Relay Server
CMD ["npm", "--workspace=relay", "run", "start:prod"]