#!/bin/sh
# Backend container entrypoint (PKG-06).
# 1. Apply committed Prisma migrations (idempotent).
# 2. Optionally seed the database when SEED_ON_BOOT=true (default in compose), so a
#    fresh `docker compose up` lands on a fully populated database.
# 3. Hand off to the container CMD (node dist/main.js).
set -e

echo "[entrypoint] Running database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

if [ "${SEED_ON_BOOT}" = "true" ]; then
  echo "[entrypoint] SEED_ON_BOOT=true → seeding database (SEED_IF_EMPTY)..."
  # SEED_IF_EMPTY makes the seed a no-op when the DB already holds data, so a
  # container restart never truncates a populated database (CICD H-2).
  export SEED_IF_EMPTY=true
  # Use the compiled seed (built into dist-seed) so no dev deps are required.
  if [ -f "dist-seed/prisma/seed.js" ]; then
    node dist-seed/prisma/seed.js
  else
    npx ts-node --transpile-only prisma/seed.ts
  fi
else
  echo "[entrypoint] SEED_ON_BOOT is not 'true' → skipping seed."
fi

echo "[entrypoint] Starting application..."
exec "$@"
