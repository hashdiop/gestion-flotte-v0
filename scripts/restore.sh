#!/usr/bin/env bash
# Restaure une sauvegarde faite par backup.sh. REMPLACE le contenu actuel de la base.
# Usage : ./scripts/restore.sh backups/bt_flotte_2026-10-30_0300.archive.gz
set -euo pipefail
cd "$(dirname "$0")/.."

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage : $0 backups/<fichier>.archive.gz" >&2
  exit 1
fi

get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
USER_=$(get MONGO_ROOT_USER)
PASS_=$(get MONGO_ROOT_PASSWORD)
DB_=$(get MONGO_DB)

read -r -p "La base « $DB_ » va être remplacée par $FILE. Taper OUI pour continuer : " ok
[ "$ok" = "OUI" ] || { echo "Annulé."; exit 1; }

docker compose exec -T mongo mongorestore \
  --username "$USER_" --password "$PASS_" --authenticationDatabase admin \
  --nsInclude "$DB_.*" --drop --archive --gzip < "$FILE"
echo "Restauration terminée."
