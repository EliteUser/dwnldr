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

# Set NODE_ENV to production
ENV NODE_ENV=production

# Expose the port your server runs on
EXPOSE 3000

# Start the server
CMD ["node", "dist/src/main.js"]