# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# openssl is required by Prisma's engines on Alpine (musl).
RUN apk add --no-cache openssl

# Install dependencies (including dev) using the backend's own lockfile-less
# manifest. Prisma needs the schema present before `prisma generate`.
COPY package.json ./
COPY prisma ./prisma
RUN npm install

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build
# Compile the seed (+ its src imports) so it runs at runtime without dev deps.
RUN npm run build:seed

# Prune dev dependencies for a lean runtime node_modules.
RUN npm prune --omit=dev

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# openssl for Prisma engines (Alpine/musl); tini for signal handling.
RUN apk add --no-cache openssl tini

# Non-root user (PKG-03).
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/dist-seed ./dist-seed
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --chown=nestjs:nodejs package.json ./
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nestjs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
