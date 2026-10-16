# Deployment

Deployments run automatically when changes are pushed to `master`, or manually from GitHub Actions.

## Requirements

The VPS needs Docker, the Docker Compose plugin, and root SSH access.

Configure these GitHub Actions secrets:

- `DWNLDR_DEPLOY_HOST`
- `DWNLDR_DEPLOY_KEY`
- `DWNLDR_AUTH_HTPASSWD`

If the SSH host is not the public IPv4 address used for HTTPS, also configure `DWNLDR_PUBLIC_IP`.

`DWNLDR_AUTH_HTPASSWD` is one bcrypt htpasswd record for the username `owner`. If `htpasswd` is installed, run:

```bash
htpasswd -nB owner
```

If `htpasswd` is unavailable but Docker is installed, run this in an interactive terminal (including PowerShell):

```powershell
docker run --rm -it httpd:2.4-alpine htpasswd -nB -C 12 owner
```

The interactive password prompt shows no characters or asterisks while you type. Enter the password, press Enter,
then enter it again to confirm.

Use a long, unique password. Enter and confirm it at the prompt, then paste the entire resulting `owner:$2y$...` line into the
repository's **Settings → Secrets and variables → Actions → New repository secret**. Do not add the record or the
plain password to the repository. On each deployment, the workflow installs the hash at
`/opt/dwnldr/auth.htpasswd` and mounts it read-only for nginx. Deployment fails if this secret is missing or
malformed. To rotate the password, replace the secret and rerun the deployment workflow.

The browser asks for `owner` and the password when opening the HTTPS app. Authentication covers the app and API;
the HTTP redirect and certificate challenge remain public. The container uses Linux host networking so nginx sees
client IPs directly, while Express binds only to `127.0.0.1:3000`.

The container image remains private in GitHub Container Registry. GitHub Actions logs the VPS into the registry with its
temporary token and logs out after deployment.

## Deploy

```bash
git push origin master
```

## VPS commands

```bash
cd /opt/dwnldr
docker compose ps
docker compose logs --tail 100 app
```

To inspect the actual yt-dlp binary and its version:

```bash
docker exec dwnldr /usr/local/bin/yt-dlp --version
docker exec dwnldr node -e 'console.log(process.env.YT_DLP_BINARY_PATH, process.env.YT_DLP_VERSION)'
```

The image pins yt-dlp nightly `2026.10.10.233141` in `Dockerfile` and checks the published Linux binary SHA-256
checksum while building. To update it, choose a release from the official
[nightly builds](https://github.com/yt-dlp/yt-dlp-nightly-builds/releases), then change both `YT_DLP_VERSION` and
`YT_DLP_SHA256` in `Dockerfile`. Rebuild and verify real SoundCloud and YouTube downloads before deployment.

## SoundCloud integration

SoundCloud profiles, Likes, and track metadata use a TypeScript adapter over SoundCloud's internal web API.
All of those HTTP requests go through the separate reusable HTTP service in `services/http/`. The adapter owns
client-ID discovery/refresh, response validation, and pagination. The transport service owns HTTP execution,
response parsing, timeouts, and cancellation. Audio downloads use yt-dlp, followed by the shared MP3, ID3, and
artwork processing pipeline. No SoundCloud credentials are required for public profiles.

Settings accepts a public profile URL, such as `https://soundcloud.com/andrey-shcherbakov-931299985`, or its
`/likes` link. Existing installations must enter a profile URL once after upgrading from numeric account IDs;
the migration preserves folder settings, indexed files, and the last sync time.

The user and favorites endpoints require `profileUrl` instead of `userId`:

```text
GET /api/soundcloud/users?profileUrl=<encoded-profile-url>
GET /api/soundcloud/favorites?profileUrl=<encoded-profile-url>&limit=20
```

Omit `limit` to retrieve all available liked tracks. A supplied positive integer limits valid tracks after
filtering and deduplication. A failed later page fails the whole request instead of returning a partial list.
The internal SoundCloud API and its client-ID discovery may change independently of this app; repeated upstream
authorization failures are logged after one automatic client-ID refresh attempt.

`YT_DLP_CACHE_DIR` controls the writable engine cache. It defaults locally to `yt-dlp-cache` beside `TEMP_DIR`,
and to `/var/lib/dwnldr/yt-dlp-cache` in Docker. The entrypoint assigns ownership to `node`; readiness checks that
both the download directory and engine cache are writable. Keep the cache outside `node_modules` and separate
from temporary download folders so cleanup cannot remove it during a download.

For local parity, download the Windows executable for the exact nightly release pinned in `Dockerfile`, verify
its entry in that release's `SHA2-256SUMS`, and set `YT_DLP_BINARY_PATH` to that executable and `YT_DLP_VERSION` to
the pinned version before starting the server. The wrapper's bundled executable can be a different version.

Before deployment, run `pnpm check`, then smoke-test the built image with its normal non-root Node process:

- Confirm `/health` and `/ready` return 200, including the `ytDlpCache` readiness check.
- Starting with an empty engine cache, download `https://soundcloud.com/euanellis/might-be-alright` once and
  verify the MP3 completes on the first request. This exercises the HLS path behind the original failure.
- Verify a second available SoundCloud track, a YouTube track, and JSON and custom-artwork multipart downloads.
- Inspect MP3 duration/tags/artwork and confirm temporary folders are removed after success, failure, and timeout.
- Compare cold and warm Likes latency, ordered track IDs, and metadata against the recorded baseline. Do not
  make external-service timing a CI assertion.

Keep the previous image reference available until these checks pass so the deployment can be rolled back.
