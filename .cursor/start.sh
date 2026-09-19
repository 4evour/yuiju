#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$REPO_ROOT/data"
REDIS_DIR="$DATA_DIR/redis"
MONGO_DIR="$DATA_DIR/mongo"

mkdir -p "$REDIS_DIR" "$MONGO_DIR" "$DATA_DIR/memory"

start_redis() {
  if redis-cli ping >/dev/null 2>&1; then
    echo "[start] redis already running"
    return
  fi
  echo "[start] starting redis-server"
  redis-server --dir "$REDIS_DIR" --appendonly yes --daemonize yes \
    --logfile "$REDIS_DIR/redis.log"
  for _ in $(seq 1 30); do
    if redis-cli ping >/dev/null 2>&1; then
      echo "[start] redis is ready"
      return
    fi
    sleep 1
  done
  echo "[start] redis failed to become ready" >&2
  exit 1
}

start_mongo() {
  if mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo "[start] mongodb already running"
    return
  fi
  echo "[start] starting mongod"
  mongod --dbpath "$MONGO_DIR" --bind_ip 127.0.0.1 --port 27017 --fork \
    --logpath "$MONGO_DIR/mongod.log"
  for _ in $(seq 1 30); do
    if mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      echo "[start] mongodb is ready"
      return
    fi
    sleep 1
  done
  echo "[start] mongodb failed to become ready" >&2
  exit 1
}

start_redis
start_mongo
echo "[start] infrastructure services are up"
