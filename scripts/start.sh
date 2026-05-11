#!/bin/bash

set -euo pipefail

CERT_TARGET_PATH=/etc/ssl/certs/server.crt
KEY_TARGET_PATH=/etc/ssl/private/server.key
SELF_SIGNED_CERT_DIR="${SELF_SIGNED_CERT_DIR:-/var/lib/dwnldr/self-signed}"
SELF_SIGNED_CERT_PATH="${SELF_SIGNED_CERT_DIR}/server.crt"
SELF_SIGNED_KEY_PATH="${SELF_SIGNED_CERT_DIR}/server.key"
LETSENCRYPT_WEBROOT="${LETSENCRYPT_WEBROOT:-/var/www/letsencrypt}"
LETSENCRYPT_RENEW_INTERVAL_SECONDS="${LETSENCRYPT_RENEW_INTERVAL_SECONDS:-43200}"
LETSENCRYPT_FAILURE_SLEEP_SECONDS="${LETSENCRYPT_FAILURE_SLEEP_SECONDS:-300}"
TLS_HOST="${SERVER_NAME:-${SERVER_IP:-localhost}}"
LETSENCRYPT_SUBJECT="${SERVER_NAME:-${SERVER_IP:-}}"
NODE_PID=""
NGINX_PID=""
RENEW_PID=""

mkdir -p /etc/ssl/private
mkdir -p /etc/ssl/certs
mkdir -p "${SELF_SIGNED_CERT_DIR}"
mkdir -p "${LETSENCRYPT_WEBROOT}"

is_ip_address() {
    [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ || "$1" == *:* ]]
}

generate_self_signed_certificate() {
    local san_type="DNS"

    if is_ip_address "${TLS_HOST}"; then
        san_type="IP"
    fi

    if [ ! -f "${SELF_SIGNED_CERT_PATH}" ] || [ ! -f "${SELF_SIGNED_KEY_PATH}" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${SELF_SIGNED_KEY_PATH}" \
            -out "${SELF_SIGNED_CERT_PATH}" \
            -subj "/CN=${TLS_HOST}" \
            -addext "subjectAltName=${san_type}:${TLS_HOST}"
    fi

    cp "${SELF_SIGNED_CERT_PATH}" "${CERT_TARGET_PATH}"
    cp "${SELF_SIGNED_KEY_PATH}" "${KEY_TARGET_PATH}"
    chmod 600 "${KEY_TARGET_PATH}"
}

apply_certificate_files() {
    local cert_path="$1"
    local key_path="$2"

    cp "${cert_path}" "${CERT_TARGET_PATH}"
    cp "${key_path}" "${KEY_TARGET_PATH}"
    chmod 600 "${KEY_TARGET_PATH}"
}

apply_letsencrypt_certificate() {
    if [ -z "${LETSENCRYPT_SUBJECT}" ]; then
        return 1
    fi

    local cert_path="/etc/letsencrypt/live/${LETSENCRYPT_SUBJECT}/fullchain.pem"
    local key_path="/etc/letsencrypt/live/${LETSENCRYPT_SUBJECT}/privkey.pem"

    if [ ! -f "${cert_path}" ] || [ ! -f "${key_path}" ]; then
        return 1
    fi

    apply_certificate_files "${cert_path}" "${key_path}"
}

letsencrypt_certificate_exists() {
    if [ -z "${LETSENCRYPT_SUBJECT}" ]; then
        return 1
    fi

    local cert_path="/etc/letsencrypt/live/${LETSENCRYPT_SUBJECT}/fullchain.pem"
    local key_path="/etc/letsencrypt/live/${LETSENCRYPT_SUBJECT}/privkey.pem"

    [ -f "${cert_path}" ] && [ -f "${key_path}" ]
}

renewal_config_matches_environment() {
    local renewal_config_path="/etc/letsencrypt/renewal/${LETSENCRYPT_SUBJECT}.conf"

    if [ ! -f "${renewal_config_path}" ]; then
        return 0
    fi

    if [ "${LETSENCRYPT_STAGING:-false}" = "true" ]; then
        grep -Eq '^server = .*acme-staging' "${renewal_config_path}"
    else
        ! grep -Eq '^server = .*acme-staging' "${renewal_config_path}"
    fi
}

certificate_issuer_matches_environment() {
    local cert_path="/etc/letsencrypt/live/${LETSENCRYPT_SUBJECT}/fullchain.pem"
    local issuer

    if [ ! -f "${cert_path}" ]; then
        return 0
    fi

    issuer="$(openssl x509 -in "${cert_path}" -noout -issuer 2>/dev/null || true)"

    if [ "${LETSENCRYPT_STAGING:-false}" = "true" ]; then
        [[ "${issuer}" == *"STAGING"* || "${issuer}" == *"Fake"* ]]
    else
        [[ "${issuer}" != *"STAGING"* && "${issuer}" != *"Fake"* ]]
    fi
}

letsencrypt_lineage_matches_environment() {
    if [ -z "${LETSENCRYPT_SUBJECT}" ]; then
        return 1
    fi

    renewal_config_matches_environment && certificate_issuer_matches_environment
}

delete_letsencrypt_lineage_if_environment_changed() {
    if ! letsencrypt_certificate_exists; then
        return 0
    fi

    if letsencrypt_lineage_matches_environment; then
        return 0
    fi

    echo "Existing Let's Encrypt lineage for ${LETSENCRYPT_SUBJECT} was created for a different ACME environment. Recreating it."
    certbot delete --non-interactive --cert-name "${LETSENCRYPT_SUBJECT}"
}

install_initial_certificate() {
    if [ -n "${SSL_CERT_PATH:-}" ] && [ -n "${SSL_KEY_PATH:-}" ] && [ -f "${SSL_CERT_PATH}" ] && [ -f "${SSL_KEY_PATH}" ]; then
        apply_certificate_files "${SSL_CERT_PATH}" "${SSL_KEY_PATH}"
    elif [ "${LETSENCRYPT_ENABLED:-false}" = "true" ] && letsencrypt_lineage_matches_environment && apply_letsencrypt_certificate; then
        echo "Using existing Let's Encrypt TLS certificate for ${LETSENCRYPT_SUBJECT}."
    elif [ "${LETSENCRYPT_ENABLED:-false}" = "true" ]; then
        echo "Using a temporary self-signed TLS certificate while requesting Let's Encrypt for ${LETSENCRYPT_SUBJECT}."
        generate_self_signed_certificate
    elif [ -n "${SERVER_NAME:-}" ] && apply_letsencrypt_certificate; then
        echo "Using mounted Let's Encrypt TLS certificate for ${SERVER_NAME}."
    elif [ "${ALLOW_SELF_SIGNED_SSL:-true}" = "true" ]; then
        echo "Using a self-signed TLS certificate. This is not trusted on Android and may block File System Access APIs."
        generate_self_signed_certificate
    else
        echo "No trusted TLS certificate was provided. Configure SSL_CERT_PATH/SSL_KEY_PATH, mount /etc/letsencrypt, or set LETSENCRYPT_ENABLED=true with SERVER_IP or SERVER_NAME."
        exit 1
    fi

    chmod 600 "${SELF_SIGNED_KEY_PATH}" 2>/dev/null || true
}

certbot_account_args() {
    if [ -n "${LETSENCRYPT_EMAIL:-}" ]; then
        printf '%s\n' "--email" "${LETSENCRYPT_EMAIL}"
    else
        printf '%s\n' "--register-unsafely-without-email"
    fi
}

request_letsencrypt_certificate() {
    if [ -z "${LETSENCRYPT_SUBJECT}" ]; then
        echo "LETSENCRYPT_ENABLED=true requires SERVER_IP for IP certificates or SERVER_NAME for domain certificates."
        return 1
    fi

    local certbot_args=(
        certonly
        --non-interactive
        --agree-tos
        --webroot
        --webroot-path "${LETSENCRYPT_WEBROOT}"
    )

    if [ "${LETSENCRYPT_STAGING:-false}" = "true" ]; then
        certbot_args+=(--staging)
    fi

    while IFS= read -r account_arg; do
        certbot_args+=("${account_arg}")
    done < <(certbot_account_args)

    if [ -n "${SERVER_IP:-}" ] && [ "${LETSENCRYPT_SUBJECT}" = "${SERVER_IP}" ] && is_ip_address "${SERVER_IP}"; then
        certbot_args+=(--preferred-profile shortlived --ip-address "${SERVER_IP}")
    else
        certbot_args+=(-d "${LETSENCRYPT_SUBJECT}")
    fi

    certbot "${certbot_args[@]}"
}

reload_nginx_certificate() {
    apply_letsencrypt_certificate
    nginx -s reload
}

ensure_letsencrypt_certificate() {
    if ! command -v certbot >/dev/null 2>&1; then
        echo "Certbot is not installed in the container."
        return 1
    fi

    delete_letsencrypt_lineage_if_environment_changed

    if ! apply_letsencrypt_certificate; then
        request_letsencrypt_certificate
    else
        certbot renew --non-interactive --webroot --webroot-path "${LETSENCRYPT_WEBROOT}"
    fi

    reload_nginx_certificate
}

renew_letsencrypt_forever() {
    while true; do
        sleep "${LETSENCRYPT_RENEW_INTERVAL_SECONDS}"
        if certbot renew --non-interactive --webroot --webroot-path "${LETSENCRYPT_WEBROOT}"; then
            reload_nginx_certificate
        else
            echo "Let's Encrypt renewal attempt failed; will retry on the next interval."
        fi
    done
}

cleanup() {
    kill "${RENEW_PID}" "${NODE_PID}" "${NGINX_PID}" 2>/dev/null || true
    wait "${RENEW_PID}" "${NODE_PID}" "${NGINX_PID}" 2>/dev/null || true
}

fail_after_letsencrypt_error() {
    echo "Let's Encrypt certificate setup failed and self-signed fallback is disabled. Stopping services and sleeping before exit to avoid a tight restart loop."
    cleanup
    sleep "${LETSENCRYPT_FAILURE_SLEEP_SECONDS}"
    exit 1
}

install_initial_certificate

node dist/main.js &
NODE_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

trap cleanup EXIT INT TERM

if [ "${LETSENCRYPT_ENABLED:-false}" = "true" ]; then
    if ensure_letsencrypt_certificate; then
        renew_letsencrypt_forever &
        RENEW_PID=$!
    elif [ "${ALLOW_SELF_SIGNED_SSL:-true}" != "true" ]; then
        fail_after_letsencrypt_error
    else
        echo "Let's Encrypt certificate setup failed; continuing with the self-signed fallback."
    fi
fi

wait -n "${NODE_PID}" "${NGINX_PID}"
STATUS=$?

exit "${STATUS}"
