#!/bin/bash

# Create SSL directories if they don't exist
mkdir -p /etc/ssl/private
mkdir -p /etc/ssl/certs

# Generate self-signed cert if it doesn't exist (uses SERVER_IP env var for Common Name)
if [ ! -f /etc/ssl/private/selfsigned.key ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/selfsigned.key \
        -out /etc/ssl/certs/selfsigned.crt \
        -subj "/CN=${SERVER_IP:-localhost}"
fi

# Start the Node.js server in the background
node dist/src/main.js &

# Start Nginx in the foreground
nginx -g 'daemon off;'