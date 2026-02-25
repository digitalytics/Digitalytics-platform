#!/bin/sh
set -e

echo "Pushing Prisma schema to database..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate

# One-time initialisation: seed + initial sync
# Skipped on every subsequent container restart
INIT_FLAG="/app/data/.initialized"

if [ ! -f "$INIT_FLAG" ]; then
  echo "First run detected — seeding database..."
  node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts

  echo "Running initial Retell AI sync..."
  node ./node_modules/tsx/dist/cli.mjs scripts/initial-sync.ts

  touch "$INIT_FLAG"
  echo "Initialisation complete."
else
  echo "Already initialised — skipping seed and sync."
fi

echo "Starting Next.js server..."
exec "$@"
