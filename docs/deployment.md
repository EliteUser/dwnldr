# Deployment

Pushing to `master` (or running the workflow manually) checks the project, builds the image, pushes it to the
GitHub Container Registry, and deploys it to the VPS with Docker Compose.

## How it runs

`compose.yaml` starts two containers:

- **caddy** listens on ports 80 and 443. It gets a Let's Encrypt certificate for the server's IP address
  (IP certificates use the short-lived profile, about six days, and Caddy renews them on its own), asks for the
  password (basic auth), and forwards requests to the app.
- **app** is the Node server. It publishes no port, so it is reachable only through Caddy.

Data lives in two named volumes: `dwnldr-state` (temp downloads, yt-dlp cache) and `dwnldr-caddy-data`
(certificates). The `Caddyfile` is the whole proxy configuration.

## GitHub Actions secrets

| Secret                 | Value                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| `DWNLDR_DEPLOY_HOST`   | SSH host of the VPS                                                      |
| `DWNLDR_DEPLOY_KEY`    | Private SSH key for `root` on the VPS                                    |
| `DWNLDR_KNOWN_HOSTS`   | The VPS host key line(s), from `ssh-keyscan <host>` run once and checked |
| `DWNLDR_AUTH_HTPASSWD` | `owner:<bcrypt hash>`, the password for the site                         |
| `DWNLDR_PUBLIC_IP`     | Public IPv4 for HTTPS, if it differs from `DWNLDR_DEPLOY_HOST`           |

`DWNLDR_KNOWN_HOSTS` pins the server's identity. Get it once from a trusted network and compare the fingerprint
with the one shown by your hosting provider or on the server (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`).

To create the password hash, run `htpasswd -nB owner`, or with Docker:
`docker run --rm -it httpd:2.4-alpine htpasswd -nB -C 12 owner`. Paste the whole `owner:$2y$...` line as the secret.
Use a long random password: there is no rate limiting, so its strength is what stops guessing.

## VPS commands

```bash
cd /opt/dwnldr
docker compose ps
docker compose logs --tail 100 app
docker compose logs --tail 100 caddy
docker compose exec app yt-dlp --version
```

## Rolling back

Put the previous image tag into `IMAGE_REF` in `/opt/dwnldr/.env` and run `docker compose up -d`.

## If the IP certificate cannot be issued

Let's Encrypt only issues IP certificates through the short-lived profile, and Caddy's support for it is recent.
If `docker compose logs caddy` shows issuance errors, use a hostname instead: either your own domain, or
`<ip-with-dashes>.sslip.io` (for example `203-0-113-10.sslip.io`), set it as `DWNLDR_PUBLIC_IP`, and remove the
`tls { ... }` block from the `Caddyfile`.
