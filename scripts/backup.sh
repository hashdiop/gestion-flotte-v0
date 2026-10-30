#!/usr/bin/env bash
# Sauvegarde de la base MongoDB du conteneur dans ./backups (archive compressée),
# en gardant les 30 derniers jours. À lancer depuis le NAS ; planifié chaque nuit par cron (DEPLOIEMENT.md).
set -euo pipefail
cd "$(dirname "$0")/.."

# Réglages lus dans .env (sans exécuter le fichier)
get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
USER_=$(get MONGO_ROOT_USER)
PASS_=$(get MONGO_ROOT_PASSWORD)
DB_=$(get MONGO_DB)

mkdir -p backups
FILE="backups/${DB_}_$(date +%Y-%m-%d_%H%M).archive.gz"

docker compose exec -T mongo mongodump \
  --username "$USER_" --password "$PASS_" --authenticationDatabase admin \
  --db "$DB_" --archive --gzip --quiet > "$FILE"

# Une sauvegarde vide signale un problème : on la retire et on échoue
if [ ! -s "$FILE" ]; then rm -f "$FILE"; echo "Échec de la sauvegarde" >&2; exit 1; fi

find backups -name '*.archive.gz' -mtime +30 -delete
echo "Sauvegarde : $FILE ($(du -h "$FILE" | cut -f1))"
