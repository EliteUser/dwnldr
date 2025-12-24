FROM node:22-bullseye-slim AS builder

WORKDIR /app/client

# Copy client package files
COPY client/package.json client/package-lock.json* ./

# Install client dependencies
RUN npm install

# Copy the rest of the client code
COPY client/ .

# Build the Vite app (outputs to /app/client/dist)
RUN npm run build:client

# Stage 2: Set up the server and copy built client files
FROM node:22-bullseye-slim

# Install Nginx and OpenSSL (for self-signed cert)
RUN apt-get update && apt-get install -y nginx openssl python3 ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Copy server package files
COPY server/package.json server/package-lock.json* ./

# Install server dependencies
RUN npm install

# Copy the rest of the server code
COPY server/ .

# Copy the built client files from the builder stage
COPY --from=builder /app/client/dist ../client/dist

# Build server app
RUN npm run build:server

# Copy Nginx config and startup script
COPY nginx.conf /etc/nginx/sites-available/default
COPY start.sh /app/start.sh

# Make startup script executable
RUN chmod +x /app/start.sh

# Set NODE_ENV to production
ENV NODE_ENV=production

# Expose ports for HTTP (redirect) and HTTPS
EXPOSE 80 443

# Use the startup script to run both Node.js and Nginx
CMD ["/app/start.sh"]