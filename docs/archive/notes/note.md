# 笔记

## mem0

mem0/oss 依赖了 sqlite3，使用时会报 binding 错误，需要重写构建一下

```sh
npm rebuild sqlite3
```

## neo4j

```sql
-- 查询可视化
CALL db.schema.visualization();

-- 删除所有节点
MATCH (n)
DETACH DELETE n;

-- 查看 dev 数据
MATCH (n {group_id: 'dev'})
RETURN n

-- 删除 dev 数据
MATCH (n {group_id: 'dev'})
DETACH DELETE n
RETURN count(n) AS deleted_count

```

## Hermes Agent Docker

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v "$HOME/.hermes:/opt/data" \
  -p 8642:8642 \
  -p 9119:9119 \
  -e HERMES_UID="$(id -u)" \
  -e HERMES_GID="$(id -g)" \
  -e API_SERVER_ENABLED=true \
  -e API_SERVER_HOST=0.0.0.0 \
  -e API_SERVER_KEY="$API_SERVER_KEY" \
  -e API_SERVER_CORS_ORIGINS='*' \
  -e HTTP_PROXY="$HTTP_PROXY" \
  -e HTTPS_PROXY="$HTTPS_PROXY" \
  -e ALL_PROXY="$ALL_PROXY" \
  -e NO_PROXY="${NO_PROXY:-localhost,127.0.0.1,::1}" \
  -e MAPILLARY_ACCESS_TOKEN="$MAPILLARY_ACCESS_TOKEN" \
  -e HERMES_DASHBOARD=1 \
  -e HERMES_DASHBOARD_BASIC_AUTH_USERNAME="$DASHBOARD_USER" \
  -e HERMES_DASHBOARD_BASIC_AUTH_PASSWORD="$DASHBOARD_PASS" \
  nousresearch/hermes-agent:latest gateway run
```

## 命令

```sh
rsync -av --delete \
  packages/source/skills/mapillary/ \
  xxx@xxx.xxx.xx.xxx:/home/yixiaojiu/.hermes/skills/mapillary/
```
