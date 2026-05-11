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

RUN npm install -g pnpm@10.33.0 \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg nginx openssl python3 python3-venv python-is-python3 \
    && python -m venv /opt/certbot \
    && /opt/certbot/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
    && /opt/certbot/bin/pip install --no-cache-dir "certbot>=5.4,<6" \
    && ln -s /opt/certbot/bin/certbot /usr/local/bin/certbot \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

WORKDIR /app/packages/server

COPY --from=builder /prod/server ./
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/client/dist ../client/dist
COPY nginx.conf /etc/nginx/sites-available/default
COPY scripts/start.sh /app/start.sh

RUN chmod +x /app/start.sh

ENV NODE_ENV=production

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "const port = process.env.PORT ?? '3000'; fetch(\`http://127.0.0.1:${port}/health\`).then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["/app/start.sh"]
