#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Optional local env (non-secret keys and zone name can be stored here).
if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1090
  set -a
  . "$ROOT_DIR/.env"
  set +a
fi

ZONE="${BUNNY_STORAGE_ZONE:-villacarmen}"
KEY="${BUNNY_STORAGE_ACCESS_KEY:-}"
PULL_BASE="${BUNNY_PULL_BASE_URL:-https://villacarmenmedia.b-cdn.net}"

check_pull_zone() {
  local ratio="$1"
  local file
  local url
  local ctype

  printf '%s\n' "  Pull zone: $PULL_BASE/videos/herosection/$ratio/"

  for idx in {1..10}; do
    file="herosection${ratio}_${idx}.mp4"
    url="$PULL_BASE/videos/herosection/$ratio/$file"
    ctype="$(curl -sI "$url" | awk 'BEGIN{IGNORECASE=1} /^content-type:/{print $2}' | tr -d '\r')"
    case "$ctype" in
      video/mp4* )
        printf '    [ok] %s\n' "$file"
        ;;
      text/html* )
        printf '    [skip] %s (bunny html fallback)\n' "$file"
        ;;
      "" )
        :
        ;;
      * )
        printf '    [warn] %s -> %s\n' "$file" "$ctype"
        ;;
    esac
  done
}

check_storage_zone() {
  local ratio="$1"
  local endpoint="https://storage.bunnycdn.com/${ZONE}/videos/herosection/${ratio}/"
  local raw

  if [[ -z "$KEY" ]]; then
    echo "  Storage API: no BUNNY_STORAGE_ACCESS_KEY configured"
    return
  fi

  if ! raw="$(curl -sSf -H "AccessKey: $KEY" "$endpoint")"; then
    echo "  Storage API: access failed for $endpoint"
    return
  fi

  echo "  Storage API listing (raw):"
  echo "$raw" | sed -n '1,120p'
}

for ratio in "16:9" "9:16"; do
  echo "=== Ratio $ratio ==="
  check_storage_zone "$ratio"
  check_pull_zone "$ratio"
  echo
done
