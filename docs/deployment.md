# Deployment

Deployments run automatically when changes are pushed to `master`, or manually from GitHub Actions.

## Requirements

The VPS needs Docker, `docker-compose`, and root SSH access.

Configure these GitHub Actions secrets:

- `DWNLDR_DEPLOY_HOST`
- `DWNLDR_DEPLOY_KEY`

If the SSH host is not the public IPv4 address used for HTTPS, also configure `DWNLDR_PUBLIC_IP`.

The container image remains private in GitHub Container Registry. GitHub Actions logs the VPS into the registry with its
temporary token and logs out after deployment.

## Deploy

```bash
git push origin master
```

## VPS commands

```bash
cd /opt/dwnldr
docker-compose ps
docker-compose logs --tail 100 app
```
