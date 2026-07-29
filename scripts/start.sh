#!/bin/bash

set -euo pipefail

CERT_TARGET_PATH="${CERT_TARGET_PATH:-/etc/ssl/certs/server.crt}"
KEY_TARGET_PATH="${KEY_TARGET_PATH:-/etc/ssl/private/server.key}"
SELF_SIGNED_CERT_DIR="${SELF_SIGNED_CERT_DIR:-/var/lib/dwnldr/self-signed}"
SELF_SIGNED_CERT_PATH="${SELF_SIGNED_CERT_DIR}/server.crt"
SELF_SIGNED_KEY_PATH="${SELF_SIGNED_CERT_DIR}/server.key"
LETSENCRYPT_WEBROOT="${LETSENCRYPT_WEBROOT:-/var/www/letsencrypt}"
LETSENCRYPT_CONFIG_DIR="${LETSENCRYPT_CONFIG_DIR:-/etc/letsencrypt}"
LETSENCRYPT_RENEW_INTERVAL_SECONDS="${LETSENCRYPT_RENEW_INTERVAL_SECONDS:-43200}"
LETSENCRYPT_SUBJECT="${SERVER_NAME:-${SERVER_IP:-}}"
TLS_HOST="${SERVER_NAME:-${SERVER_IP:-localhost}}"
NODE_PID=""
NGINX_PID=""
RENEW_PID=""
ACTIVE_CERT_MODE=""

prepare_runtime() {
    if [[ ! "${TLS_HOST}" =~ ^[A-Za-z0-9:.-]+$ ]]; then
        echo "Invalid TLS host value."
        return 1
    fi

    mkdir -p /etc/nginx/sites-available /etc/ssl/certs /etc/ssl/private "${LETSENCRYPT_WEBROOT}" "${SELF_SIGNED_CERT_DIR}"
    mkdir -p "${TEMP_DIR:-/var/lib/dwnldr/downloads}"
    chown -R node:node "${TEMP_DIR:-/var/lib/dwnldr/downloads}"
    export TLS_HOST
    envsubst '${TLS_HOST}' < /etc/nginx/templates/dwnldr.conf.template > /etc/nginx/sites-available/default
}

is_ip_address() {
    [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ || "$1" == *:* ]]
}

certificate_pair_is_valid() {
    local cert_path="$1"
    local key_path="$2"
    local minimum_validity_seconds="${3:-0}"
    local cert_public_key
    local private_public_key

    [ -f "${cert_path}" ] && [ -f "${key_path}" ] || return 1
    openssl x509 -in "${cert_path}" -noout -checkend "${minimum_validity_seconds}" >/dev/null 2>&1 || return 1
    openssl pkey -in "${key_path}" -noout >/dev/null 2>&1 || return 1

    cert_public_key="$(openssl x509 -in "${cert_path}" -pubkey -noout 2>/dev/null | openssl pkey -pubin -outform DER 2>/dev/null | sha256sum | cut -d' ' -f1)"
    private_public_key="$(openssl pkey -in "${key_path}" -pubout -outform DER 2>/dev/null | sha256sum | cut -d' ' -f1)"

    [ -n "${cert_public_key}" ] && [ "${cert_public_key}" = "${private_public_key}" ]
}

log_active_certificate() {
    local mode="$1"
    local subject
    local expiry

    subject="$(openssl x509 -in "${CERT_TARGET_PATH}" -noout -subject 2>/dev/null || true)"
    expiry="$(openssl x509 -in "${CERT_TARGET_PATH}" -noout -enddate 2>/dev/null || true)"
    echo "TLS certificate activated: mode=${mode} ${subject} ${expiry}"
}

apply_certificate_files() {
    local cert_path="$1"
    local key_path="$2"
    local mode="$3"
    local cert_temp="${CERT_TARGET_PATH}.next"
    local key_temp="${KEY_TARGET_PATH}.next"

    certificate_pair_is_valid "${cert_path}" "${key_path}" 0 || return 1
    install -m 644 "${cert_path}" "${cert_temp}" || return 1
    install -m 600 "${key_path}" "${key_temp}" || return 1
    mv -f "${cert_temp}" "${CERT_TARGET_PATH}" || return 1
    mv -f "${key_temp}" "${KEY_TARGET_PATH}" || return 1
    ACTIVE_CERT_MODE="${mode}"
    log_active_certificate "${mode}"
}

generate_self_signed_certificate() {
    local san_type="DNS"
    local cert_temp="${SELF_SIGNED_CERT_PATH}.next"
    local key_temp="${SELF_SIGNED_KEY_PATH}.next"

    if certificate_pair_is_valid "${SELF_SIGNED_CERT_PATH}" "${SELF_SIGNED_KEY_PATH}" 2592000; then
        return 0
    fi

    if is_ip_address "${TLS_HOST}"; then
        san_type="IP"
    fi

    rm -f "${cert_temp}" "${key_temp}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${key_temp}" \
        -out "${cert_temp}" \
        -subj "/CN=${TLS_HOST}" \
        -addext "subjectAltName=${san_type}:${TLS_HOST}" || return 1
    chmod 600 "${key_temp}" || return 1
    mv -f "${cert_temp}" "${SELF_SIGNED_CERT_PATH}" || return 1
    mv -f "${key_temp}" "${SELF_SIGNED_KEY_PATH}" || return 1
}

apply_self_signed_certificate() {
    generate_self_signed_certificate || return 1
    apply_certificate_files "${SELF_SIGNED_CERT_PATH}" "${SELF_SIGNED_KEY_PATH}" self-signed
}

letsencrypt_paths_are_valid() {
    [ -n "${LETSENCRYPT_SUBJECT}" ] || return 1
    certificate_pair_is_valid \
        "${LETSENCRYPT_CONFIG_DIR}/live/${LETSENCRYPT_SUBJECT}/fullchain.pem" \
        "${LETSENCRYPT_CONFIG_DIR}/live/${LETSENCRYPT_SUBJECT}/privkey.pem" \
        "${1:-0}"
}

apply_letsencrypt_certificate() {
    letsencrypt_paths_are_valid 0 || return 1
    apply_certificate_files \
        "${LETSENCRYPT_CONFIG_DIR}/live/${LETSENCRYPT_SUBJECT}/fullchain.pem" \
        "${LETSENCRYPT_CONFIG_DIR}/live/${LETSENCRYPT_SUBJECT}/privkey.pem" \
        letsencrypt
}

request_letsencrypt_certificate() {
    local certbot_args=(
        certonly
        --non-interactive
        --agree-tos
        --config-dir "${LETSENCRYPT_CONFIG_DIR}"
        --cert-name "${LETSENCRYPT_SUBJECT}"
        --webroot
        --webroot-path "${LETSENCRYPT_WEBROOT}"
    )

    [ -n "${LETSENCRYPT_SUBJECT}" ] || return 1

    if [ -n "${LETSENCRYPT_EMAIL:-}" ]; then
        certbot_args+=(--email "${LETSENCRYPT_EMAIL}")
    else
        certbot_args+=(--register-unsafely-without-email)
    fi

    if [ -n "${SERVER_IP:-}" ] && [ "${LETSENCRYPT_SUBJECT}" = "${SERVER_IP}" ] && is_ip_address "${SERVER_IP}"; then
        certbot_args+=(--preferred-profile shortlived --ip-address "${SERVER_IP}")
    else
        certbot_args+=(-d "${LETSENCRYPT_SUBJECT}")
    fi

    certbot "${certbot_args[@]}"
}

reload_nginx() {
    nginx -t || return 1
    nginx -s reload
}

ensure_letsencrypt_certificate() {
    command -v certbot >/dev/null 2>&1 || return 1

    if letsencrypt_paths_are_valid 0; then
        if ! certbot renew --non-interactive --config-dir "${LETSENCRYPT_CONFIG_DIR}" --webroot --webroot-path "${LETSENCRYPT_WEBROOT}"; then
            echo "Let's Encrypt renewal failed; retaining the existing valid certificate and retrying later."
        fi
    else
        request_letsencrypt_certificate || return 1
    fi

    apply_letsencrypt_certificate || return 1
    reload_nginx
}

activate_fallback_certificate() {
    if [ "${ALLOW_SELF_SIGNED_SSL:-true}" != "true" ]; then
        return 1
    fi

    echo "Let's Encrypt is unavailable; activating the persistent self-signed fallback."
    apply_self_signed_certificate || return 1
    reload_nginx
}

renew_certificates_once() {
    if [ "${LETSENCRYPT_ENABLED:-false}" != "true" ]; then
        if apply_self_signed_certificate && reload_nginx; then
            echo "Self-signed certificate check completed successfully."
        else
            echo "Self-signed certificate renewal failed."
        fi
    elif ensure_letsencrypt_certificate; then
        echo "Let's Encrypt certificate check completed successfully."
    elif activate_fallback_certificate; then
        echo "Certificate renewal failed; the self-signed fallback remains active and issuance will be retried."
    else
        echo "Certificate renewal failed and self-signed fallback is disabled."
    fi
}

certificate_renewal_is_enabled() {
    [ "${ACTIVE_CERT_MODE}" = self-signed ] || \
        { [ "${ACTIVE_CERT_MODE}" = letsencrypt ] && [ "${LETSENCRYPT_ENABLED:-false}" = "true" ]; }
}

renew_certificates_forever() {
    while true; do
        sleep "${LETSENCRYPT_RENEW_INTERVAL_SECONDS}"
        renew_certificates_once
    done
}

install_initial_certificate() {
    if [ -n "${SSL_CERT_PATH:-}" ] && [ -n "${SSL_KEY_PATH:-}" ] && \
        apply_certificate_files "${SSL_CERT_PATH}" "${SSL_KEY_PATH}" supplied; then
        return 0
    fi

    if apply_letsencrypt_certificate; then
        return 0
    fi

    if [ "${LETSENCRYPT_ENABLED:-false}" = "true" ]; then
        echo "No existing Let's Encrypt certificate is available; installing a temporary bootstrap certificate."
        apply_self_signed_certificate
        return 0
    fi

    if [ "${ALLOW_SELF_SIGNED_SSL:-true}" = "true" ]; then
        apply_self_signed_certificate
        return 0
    fi

    echo "No valid TLS certificate is available and self-signed fallback is disabled."
    return 1
}

cleanup() {
    kill "${RENEW_PID}" "${NODE_PID}" "${NGINX_PID}" 2>/dev/null || true
    wait "${RENEW_PID}" "${NODE_PID}" "${NGINX_PID}" 2>/dev/null || true
}

main() {
    prepare_runtime
    install_initial_certificate
    nginx -t

    nginx -g 'daemon off;' &
    NGINX_PID=$!

    trap cleanup EXIT INT TERM

    if [ "${LETSENCRYPT_ENABLED:-false}" = "true" ] && [ "${ACTIVE_CERT_MODE}" != supplied ]; then
        if ! ensure_letsencrypt_certificate; then
            activate_fallback_certificate || {
                echo "Let's Encrypt setup failed and self-signed fallback is disabled."
                exit 1
            }
        fi
    fi

    setpriv --reuid=node --regid=node --init-groups node dist/main.js &
    NODE_PID=$!

    if certificate_renewal_is_enabled; then
        renew_certificates_forever &
        RENEW_PID=$!
    fi

    set +e
    wait -n "${NODE_PID}" "${NGINX_PID}"
    STATUS=$?
    set -e
    return "${STATUS}"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
