# DayCapsule Backend Deploy Bundle

This bundle deploys backend image `__BACKEND_IMAGE__`.

## Included Files

- `docker-compose.yml`
- `.env.example`
- `nginx.conf`

## Quick Start

1. Login to your Gitea registry if the image is private:

```bash
docker login __REGISTRY_HOST__
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Edit `.env` and set at least:

```env
JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
BASE_URL=http://YOUR_SERVER_IP:8080
```

4. Create persistent directories and start the stack:

```bash
mkdir -p data logs
docker compose up -d
```

## Upgrade

This bundle is pinned to release `__RELEASE_VERSION__`.

To upgrade, download a newer bundle and run:

```bash
docker compose pull
docker compose up -d
```

## Rollback

To roll back, stop the current stack and redeploy an older bundle:

```bash
docker compose down
docker compose up -d
```
