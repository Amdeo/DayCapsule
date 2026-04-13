# Shared Nginx Deploy

这个目录用于在服务器上部署一个供多个服务共用的 nginx 容器。

## 文件

- `docker-compose.yml`
- `.env.example`
- `conf.d/`
- `certs/`
- `html/`
- `logs/`

## 快速开始

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 创建外部网络：

```bash
docker network create shared-proxy
```

3. 准备目录：

```bash
mkdir -p conf.d certs html logs
```

4. 把各个服务的站点配置文件放进 `conf.d/`。

例如后端发布包里的 `deploy/backend/daycapsule.conf` 可以复制到：

```bash
cp /path/to/daycapsule-backend/deploy/backend/daycapsule.conf ./conf.d/daycapsule.conf
```

5. 启动 nginx：

```bash
docker compose up -d
```

6. 每次修改 `conf.d/*.conf` 后执行：

```bash
docker exec shared-nginx nginx -t
docker exec shared-nginx nginx -s reload
```

## 说明

- `conf.d/`：站点配置目录
- `certs/`：证书目录，给 TLS 站点使用
- `html/`：静态文件目录，可用于 ACME challenge 或静态站点
- `logs/`：nginx 日志目录

默认使用 nginx 镜像自带的主配置文件，因此这里只需要维护 `conf.d/*.conf`。
