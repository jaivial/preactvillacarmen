#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/../villacarmen_backup"
CONTAINER_NAME="${MYSQL_CONTAINER_NAME:-villacarmen-mysql}"
DB_NAME="${MYSQL_DB_NAME:-villacarmen}"
ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"

DUMP_PATH="${1:-}"
if [[ -z "$DUMP_PATH" ]]; then
  DUMP_PATH="$(ls -1 "$BACKUP_DIR"/villacarmen_*.sql.gz 2>/dev/null | sort | tail -n 1 || true)"
fi

if [[ -z "$DUMP_PATH" || ! -f "$DUMP_PATH" ]]; then
  echo "No dump found. Looked in: $BACKUP_DIR"
  exit 1
fi

echo "Importing dump: $DUMP_PATH"
gzip -dc "$DUMP_PATH" | docker exec -i "$CONTAINER_NAME" mysql -uroot -p"$ROOT_PASSWORD" "$DB_NAME"

