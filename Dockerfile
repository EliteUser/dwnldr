FROM node:24-bullseye-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10.33.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/package.json
COPY packages/server/package.json ./packages/server/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build
RUN pnpm --filter ./packages/server --legacy deploy --prod /prod/server

FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg gettext-base nginx openssl python3 python3-venv util-linux \
    && python3 -m venv /opt/certbot \
    && /opt/certbot/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
    && /opt/certbot/bin/pip install --no-cache-dir "certbot>=5.4,<6" \
    && ln -s /opt/certbot/bin/certbot /usr/local/bin/certbot \
    && rm -rf /var/lib/apt/lists/*

RUN sed -i 's/^worker_processes auto;/worker_processes 2;/' /etc/nginx/nginx.conf

WORKDIR /app/packages/server

COPY --from=builder /prod/server ./
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/client/dist ../client/dist
COPY nginx.conf /etc/nginx/templates/dwnldr.conf.template
COPY scripts/start.sh /app/start.sh

RUN chmod +x /app/start.sh \
    && mkdir -p /var/lib/dwnldr/downloads \
    && chown -R node:node /var/lib/dwnldr/downloads

ENV NODE_ENV=production \
    TEMP_DIR=/var/lib/dwnldr/downloads

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node", "-e", "const port = process.env.PORT ?? '3000'; fetch('http://127.0.0.1:' + port + '/health', { signal: AbortSignal.timeout(4000) }).then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"]

CMD ["/app/start.sh"]
