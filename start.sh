#!/bin/bash

set -eu

CERT_TARGET_PATH=/etc/ssl/certs/server.crt
KEY_TARGET_PATH=/etc/ssl/private/server.key
SELF_SIGNED_CERT_DIR="${SELF_SIGNED_CERT_DIR:-/var/lib/dwnldr/self-signed}"
SELF_SIGNED_CERT_PATH="${SELF_SIGNED_CERT_DIR}/server.crt"
SELF_SIGNED_KEY_PATH="${SELF_SIGNED_CERT_DIR}/server.key"
TLS_HOST="${SERVER_NAME:-${SERVER_IP:-localhost}}"

mkdir -p /etc/ssl/private
mkdir -p /etc/ssl/certs
mkdir -p "${SELF_SIGNED_CERT_DIR}"

if [ -n "${SSL_CERT_PATH:-}" ] && [ -n "${SSL_KEY_PATH:-}" ] && [ -f "${SSL_CERT_PATH}" ] && [ -f "${SSL_KEY_PATH}" ]; then
    cp "${SSL_CERT_PATH}" "${CERT_TARGET_PATH}"
    cp "${SSL_KEY_PATH}" "${KEY_TARGET_PATH}"
elif [ -n "${SERVER_NAME:-}" ] && [ -f "/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${SERVER_NAME}/privkey.pem" ]; then
    cp "/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem" "${CERT_TARGET_PATH}"
    cp "/etc/letsencrypt/live/${SERVER_NAME}/privkey.pem" "${KEY_TARGET_PATH}"
elif [ "${ALLOW_SELF_SIGNED_SSL:-true}" = "true" ]; then
    echo "Using a self-signed TLS certificate. This is not trusted on Android and may block File System Access APIs."

    if [ ! -f "${SELF_SIGNED_CERT_PATH}" ] || [ ! -f "${SELF_SIGNED_KEY_PATH}" ]; then
        SAN_TYPE="DNS"
        if [[ "${TLS_HOST}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
            SAN_TYPE="IP"
        fi

        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${SELF_SIGNED_KEY_PATH}" \
            -out "${SELF_SIGNED_CERT_PATH}" \
            -subj "/CN=${TLS_HOST}" \
            -addext "subjectAltName=${SAN_TYPE}:${TLS_HOST}"
    fi

    cp "${SELF_SIGNED_CERT_PATH}" "${CERT_TARGET_PATH}"
    cp "${SELF_SIGNED_KEY_PATH}" "${KEY_TARGET_PATH}"
else
    echo "No trusted TLS certificate was provided. Configure SSL_CERT_PATH/SSL_KEY_PATH or mount /etc/letsencrypt and set SERVER_NAME."
    exit 1
fi

chmod 600 "${KEY_TARGET_PATH}"
chmod 600 "${SELF_SIGNED_KEY_PATH}" 2>/dev/null || true

node dist/main.js &
NODE_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

wait -n "${NODE_PID}" "${NGINX_PID}"
STATUS=$?

kill "${NODE_PID}" "${NGINX_PID}" 2>/dev/null || true
wait "${NODE_PID}" "${NGINX_PID}" 2>/dev/null || true

exit "${STATUS}"
