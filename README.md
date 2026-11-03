# dwnldr

Personal tool for saving tracks from SoundCloud, YouTube and other sites as tagged MP3 files.

- **Likes** lists the liked tracks of a SoundCloud profile and marks the ones already in your music folder.
- **Download** takes a track link, lets you edit the name, album, lyrics and cover, and returns an MP3.
- **Meta** rewrites the tags and cover of an MP3 you already have.

The client is React + Mantine (`packages/client`), the server is Express (`packages/server`), and
`packages/shared` holds the API types both sides use. Audio comes from [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Local development

Requirements: Node.js 24, pnpm 10, and yt-dlp plus ffmpeg on `PATH`. On Windows:

```bash
winget install yt-dlp.yt-dlp
```

This also installs ffmpeg. Open a new terminal afterwards so `PATH` picks them up, then:

```bash
pnpm install
pnpm dev
```

The client runs at http://localhost:5173 and proxies `/api` to the server on port 3000.

`pnpm check` runs lint, formatting, type checks, tests and the build; the pre-push hook runs it too.

### Server environment

| Variable              | Default            | Purpose                            |
| --------------------- | ------------------ | ---------------------------------- |
| `PORT`                | `3000`             | HTTP port                          |
| `HOST`                | `127.0.0.1`        | Bind address (`0.0.0.0` in Docker) |
| `YT_DLP_PATH`         | `yt-dlp`           | yt-dlp executable                  |
| `TEMP_DIR`            | `./tmp/downloads`  | Per-request working folders        |
| `YT_DLP_CACHE_DIR`    | next to `TEMP_DIR` | yt-dlp cache                       |
| `DOWNLOAD_TIMEOUT_MS` | `600000`           | Download deadline                  |
| `LOG_LEVEL`           | `debug` in dev     | pino log level                     |

## Adding a provider

1. Create `packages/server/src/providers/<name>.ts` exporting `{ key, label, hosts }`.
2. Add it to the `providers` array in `packages/server/src/providers/index.ts`.
3. Optionally override `getTrack`, `download`, `getProfile` or `getLikes` (see `providers/types.ts`).
   Without overrides, metadata and downloads go through yt-dlp.

The client picks up the new provider from `/api/providers`; an icon can be added to `PROVIDER_ICONS`
in `packages/client/src/components/download/download.tsx`.

## Updating yt-dlp

Sites change often, so keep yt-dlp current:

- Locally: `winget upgrade yt-dlp.yt-dlp`.
- Docker: set `YT_DLP_VERSION` and `YT_DLP_SHA256` in the `Dockerfile` from the
  [release page](https://github.com/yt-dlp/yt-dlp/releases) (`SHA2-256SUMS`, line for `yt-dlp`), then deploy.

## Deployment

See [docs/deployment.md](docs/deployment.md).
