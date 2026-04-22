FROM node:22-bullseye-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10.33.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/package.json
COPY packages/server/package.json ./packages/server/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build
RUN pnpm --filter ./packages/server --legacy deploy --prod /prod/server

FROM node:22-bookworm-slim

RUN npm install -g pnpm@10.33.0 \
    && apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg nginx openssl python3 python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

WORKDIR /app/packages/server

COPY --from=builder /prod/server ./
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/client/dist ../client/dist
COPY nginx.conf /etc/nginx/sites-available/default
COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh

ENV NODE_ENV=production

EXPOSE 80 443

CMD ["/app/start.sh"]
