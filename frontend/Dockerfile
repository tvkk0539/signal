# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package.json package-lock.json tsconfig.base.json ./

# Copy workspaces
COPY shared ./shared
COPY frontend ./frontend

# Install dependencies
RUN npm ci

# Build shared contracts
RUN npm run build --workspace=shared

# Inject the placeholder so Vite bakes it into the static assets
ENV VITE_RELAY_URL=__VITE_RELAY_URL_PLACEHOLDER__

# Build frontend static assets via Vite
RUN npm run build --workspace=frontend

# Stage 2: Serve via Nginx
FROM nginx:alpine AS runner

# Remove default Nginx site
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from the builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy the custom entrypoint script for env variable injection
# Placing it in /docker-entrypoint.d/ ensures the official nginx entrypoint runs it
COPY frontend/docker-entrypoint.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]