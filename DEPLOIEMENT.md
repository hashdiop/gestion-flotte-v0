# Déploiement sur le NAS (Ubuntu + Docker)

Trois conteneurs, décrits dans `docker-compose.yml` :

| Conteneur | Rôle | Joignable depuis |
| --- | --- | --- |
| `app` | L'application (Next.js, mode production) | Réseau local : `http://IP-DU-NAS:3000` |
| `mongo` | La base MongoDB 7, données dans un volume Docker | L'application seulement (aucun port ouvert) |
| `tunnel` | Tunnel Cloudflare : accès Internet en HTTPS | Internet : `https://flotte.votre-domaine.com` |

Le tunnel évite d'ouvrir des ports sur la box : c'est le NAS qui se connecte à Cloudflare.
Il marche aussi quand le fournisseur d'accès ne donne pas d'adresse IP publique.

---

## 1. Installer Docker sur le NAS (une fois)

Dans un terminal sur le NAS :

```bash
sudo apt update && sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # utiliser docker sans sudo
```

Se déconnecter puis se reconnecter (ou redémarrer), puis vérifier :

```bash
docker compose version
```

### Ordinateur portable utilisé comme NAS : empêcher la mise en veille

Sinon l'application s'arrête dès que le portable se met en veille ou qu'on rabat l'écran.

```bash
# Plus jamais de veille ni d'hibernation
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
# Écran rabattu : ne rien faire
sudo sed -i 's/^#\?HandleLidSwitch=.*/HandleLidSwitch=ignore/; s/^#\?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind
```

Le laisser branché sur secteur, de préférence en Ethernet plutôt qu'en Wi-Fi. Fixer son adresse IP sur le réseau
(réservation DHCP dans la box) pour que `http://IP-DU-NAS:3000` ne change pas.

## 2. Récupérer le projet depuis GitHub

Le circuit : on développe sur le PC, on pousse sur GitHub, le NAS clone puis récupère les mises à jour avec `git pull`.

Le dépôt est privé. Le plus simple est une **clé de déploiement** en lecture seule, propre au NAS :

```bash
ssh-keygen -t ed25519 -C "nas-flotte" -f ~/.ssh/github_flotte -N ""
cat ~/.ssh/github_flotte.pub
```

Copier la clé affichée dans GitHub : dépôt > Settings > Deploy keys > Add deploy key (sans cocher « Allow write access »).
Puis :

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-flotte
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_flotte
EOF

sudo mkdir -p /opt/flotte && sudo chown $USER /opt/flotte
git clone git@github-flotte:hashdiop/gestion-flotte-v0.git /opt/flotte
cd /opt/flotte
```

Le NAS peut ainsi lire le dépôt, mais pas le modifier ; la clé se révoque depuis GitHub si besoin.

## 3. Régler l'environnement

```bash
cp .env.production.example .env
nano .env
```

- `MONGO_ROOT_PASSWORD` : un mot de passe long.
- `AUTH_SECRET` : générer avec `openssl rand -hex 32`.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` : le compte admin initial (étape 5).
- `COOKIE_SECURE` : laisser `true` si l'on se connecte par le nom de domaine en HTTPS (recommandé, y compris depuis le bureau).
  Mettre `false` seulement pour se connecter aussi par `http://IP-DU-NAS:3000`.
- `CLOUDFLARE_TUNNEL_TOKEN` : voir l'étape 6.

Protéger le fichier : `chmod 600 .env`.

## 4. Construire et démarrer

```bash
docker compose up -d --build
docker compose ps          # « app » et « mongo » doivent être « healthy »
```

La première construction prend quelques minutes. L'application répond ensuite sur `http://IP-DU-NAS:3000`
(adresse du NAS : `hostname -I`).

## 5. Créer le premier admin (une fois)

```bash
docker compose exec app node scripts/create-admin.js
```

Puis, comme prévu :

1. Se connecter avec ce compte, ouvrir « Comptes », créer un admin nominatif.
2. Cet admin se connecte, change son mot de passe provisoire et crée les autres comptes.
3. Désactiver le compte initial depuis « Comptes ».
4. Vider `ADMIN_PASSWORD` dans `.env`.

Ne pas lancer le seed en production : il remplacerait les données par la démo.

## 6. Accès Internet par le tunnel Cloudflare

Prérequis : un nom de domaine dont les DNS sont gérés par Cloudflare (compte gratuit).

1. Sur https://one.dash.cloudflare.com : Networks > Tunnels > Create a tunnel > Cloudflared.
2. Nommer le tunnel (ex. `nas-flotte`), choisir Docker, copier le jeton (la longue chaîne après `--token`).
3. Le coller dans `.env` : `CLOUDFLARE_TUNNEL_TOKEN=...`
4. Dans « Public Hostname » : sous-domaine `flotte`, domaine `votre-domaine.com`,
   service **HTTP** et URL **`app:3000`** (le nom du conteneur, pas localhost).
5. Démarrer le tunnel :

```bash
docker compose --profile tunnel up -d
```

L'application est alors en ligne sur `https://flotte.votre-domaine.com`, avec le HTTPS géré par Cloudflare.

Recommandé : garder `APP_PORT` uniquement pour le réseau local, et vérifier que le pare-feu du NAS ne l'expose pas
vers Internet (`sudo ufw allow from 192.168.0.0/16 to any port 3000`, adapter à votre réseau).

## 7. Sauvegardes

Sauvegarde manuelle :

```bash
./scripts/backup.sh          # crée backups/bt_flotte_AAAA-MM-JJ_HHMM.archive.gz
```

Sauvegarde automatique chaque nuit à 3 h (garde 30 jours) :

```bash
crontab -e
# ajouter la ligne :
0 3 * * * /opt/flotte/scripts/backup.sh >> /opt/flotte/backups/backup.log 2>&1
```

Copier régulièrement le dossier `backups/` ailleurs que sur le NAS (disque externe, cloud) :
une sauvegarde sur le même disque ne protège pas d'une panne de ce disque.

Restaurer (remplace la base actuelle, demande confirmation) :

```bash
./scripts/restore.sh backups/bt_flotte_2026-10-30_0300.archive.gz
```

## 8. Mettre à jour l'application

```bash
cd /opt/flotte
./scripts/backup.sh               # toujours sauvegarder avant
git pull
docker compose up -d --build      # reconstruit l'image, redémarre l'application ; la base est conservée
```

## 9. Au quotidien

| Besoin | Commande |
| --- | --- |
| État des conteneurs | `docker compose ps` |
| Journaux de l'application | `docker compose logs -f app` |
| Redémarrer l'application | `docker compose restart app` |
| Tout arrêter (données conservées) | `docker compose down` |
| Place prise par Docker | `docker system df` |

Les conteneurs redémarrent seuls après une coupure de courant ou un redémarrage du NAS (`restart: unless-stopped`).

À ne jamais faire : `docker compose down -v` (le `-v` efface le volume, donc **toute la base**).

## Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| La connexion revient toujours à la page de connexion | Accès en `http://` alors que `COOKIE_SECURE=true` | Passer par l'adresse HTTPS, ou mettre `COOKIE_SECURE=false` puis `docker compose up -d` |
| `app` reste « unhealthy » | La base ne répond pas ou mauvais mot de passe Mongo | `docker compose logs app mongo` ; vérifier `.env` |
| Le tunnel ne répond pas (erreur 502) | Mauvaise URL de service dans Cloudflare | Service HTTP, URL `app:3000` |
| `permission denied` sur docker | Utilisateur pas dans le groupe docker | `sudo usermod -aG docker $USER`, puis se reconnecter |
