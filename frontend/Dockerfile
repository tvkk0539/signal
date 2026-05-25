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

# Build frontend static assets via Vite
RUN npm run build --workspace=frontend

# Stage 2: Serve via Nginx
FROM nginx:alpine AS runner

# Remove default Nginx site
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from the builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]