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

The image pins the yt-dlp nightly release in `Dockerfile` and checks its published SHA-256 checksum while building.
To update it, change both `YT_DLP_VERSION` and `YT_DLP_SHA256` in `Dockerfile`, rebuild, and verify a real YouTube
download on the VPS.
