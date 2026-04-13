# DayCapsule Backend Deploy Bundle

This bundle deploys backend image `__BACKEND_IMAGE__`.

## Included Files

- `docker-compose.yml`
- `docker-compose.shared-nginx.yml`
- `.env.example`
- `deploy/backend/daycapsule.host-nginx.conf`
- `deploy/backend/daycapsule.conf`

## Mode A: Host Nginx On The Server

This is the default mode in `docker-compose.yml`. The backend binds to `127.0.0.1:${HOST_PORT:-3000}` and the server's local nginx reverse-proxies to it.

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
BASE_URL=https://api.example.com
```

4. Create persistent directories and start the backend container:

```bash
mkdir -p data logs
docker compose up -d
```

5. Copy `deploy/backend/daycapsule.host-nginx.conf` into your server nginx site config directory, then edit:

- `server_name` to your real domain
- `proxy_pass` target only if you changed `HOST_PORT`

6. Test and reload the server nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Mode B: Shared Nginx Container

Use `docker-compose.shared-nginx.yml` if the server already has a shared nginx container that joins the same Docker network as the backend service.

1. Create the shared Docker network if it does not exist yet:

```bash
docker network create shared-proxy
```

2. Make sure your shared nginx container is attached to the same network (`shared-proxy` by default).

3. Copy `deploy/backend/daycapsule.conf` into the shared nginx `conf.d/` directory, then edit:

- `server_name` to your real domain
- `proxy_pass` target only if you changed the `daycapsule-api` alias or internal port

4. Start the backend with:

```bash
mkdir -p data logs
docker compose -f docker-compose.shared-nginx.yml up -d
```

5. Reload the shared nginx container after the config file is in place.

## Upgrade

This bundle is pinned to release `__RELEASE_VERSION__`.

To upgrade, download a newer bundle and run:

```bash
docker compose pull
docker compose up -d
```

If you use shared nginx mode, replace the command with:

```bash
docker compose -f docker-compose.shared-nginx.yml pull
docker compose -f docker-compose.shared-nginx.yml up -d
```

## Rollback

To roll back, stop the current stack and redeploy an older bundle:

```bash
docker compose down
docker compose up -d
```

If you use shared nginx mode, replace the command with:

```bash
docker compose -f docker-compose.shared-nginx.yml down
docker compose -f docker-compose.shared-nginx.yml up -d
```
