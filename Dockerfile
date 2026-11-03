# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10.34.7

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/package.json
COPY packages/server/package.json ./packages/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build
RUN pnpm --filter ./packages/server --legacy deploy --prod /prod/server

FROM node:24-bookworm-slim

# Update both values together; checksums are listed in the release's SHA2-256SUMS file.
ARG YT_DLP_VERSION=2026.10.26
ARG YT_DLP_SHA256=e51e69e89489f199530f13d32a4342da3ddb2cf34842f364603a066db05afbf3

# yt-dlp is a Python zipapp and uses ffmpeg to extract MP3 audio and convert thumbnails.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 \
    && rm -rf /var/lib/apt/lists/*

ADD --checksum=sha256:${YT_DLP_SHA256} --chmod=755 \
    https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/yt-dlp /usr/local/bin/yt-dlp
RUN test "$(yt-dlp --version)" = "${YT_DLP_VERSION}"

WORKDIR /app/packages/server

COPY --from=builder /prod/server ./
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/client/dist ../client/dist

RUN mkdir -p /var/lib/dwnldr/downloads /var/lib/dwnldr/yt-dlp-cache && chown -R node:node /var/lib/dwnldr

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    TEMP_DIR=/var/lib/dwnldr/downloads \
    YT_DLP_PATH=/usr/local/bin/yt-dlp \
    YT_DLP_CACHE_DIR=/var/lib/dwnldr/yt-dlp-cache

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "dist/main.js"]
