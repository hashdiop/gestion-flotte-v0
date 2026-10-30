# Image de production de l'application (Next.js en mode « standalone »).
# Construite par docker compose : voir docker-compose.yml et DEPLOIEMENT.md.

# 1. Build (dépendances mises en cache tant que package-lock.json ne change pas)
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 2. Exécution : seulement le serveur compilé, les fichiers statiques et les scripts d'administration
FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=UTC

# Utilisateur sans privilèges
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
# Scripts d'administration (compte admin initial) et les modules qu'ils importent.
# Mongoose est déjà dans les node_modules du build standalone : pas besoin de toutes les dépendances.
COPY --chown=app:app scripts ./scripts
COPY --chown=app:app src/models ./src/models
COPY --chown=app:app src/lib ./src/lib

USER app
EXPOSE 3000

# Docker vérifie que l'application et la base répondent
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
