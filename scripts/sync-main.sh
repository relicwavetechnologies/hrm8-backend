#!/bin/bash
# =============================================================
# HRM8 — Dev → Main DB Sync Script
# =============================================================
# USAGE (from backend-template directory):
#   pnpm prisma:sync-main               (default name "sync")
#   pnpm prisma:sync-main weekly-sync   (custom migration name)
#
# WORKFLOW:
#   Dev:  pnpm prisma:dev:push            (always, no migration files)
#   Main: pnpm prisma:sync-main           (every Friday after git pull origin dev)
#
# WHAT IT DOES:
#   1. Connects to live main DB to check current schema
#   2. Diffs against schema.prisma (your desired dev state)
#   3. If changes → creates timestamped migration file
#   4. Deploys all pending migration files to main DB
# =============================================================

set -e

MIGRATION_NAME="${1:-sync}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="prisma/migrations/${TIMESTAMP}_${MIGRATION_NAME}"

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   HRM8 — Syncing Dev → Main DB               ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ── Guard: must be run from backend-template directory ──
if [ ! -f "./.env.main" ]; then
  echo "❌  Error: .env.main not found."
  echo "    Please run this from the backend-template directory."
  exit 1
fi

if [ ! -f "./prisma/schema.prisma" ]; then
  echo "❌  Error: prisma/schema.prisma not found."
  exit 1
fi

# ── Load main DB URL ──
set -a; . ./.env.main; set +a
MAIN_DB_URL="$DATABASE_URL"

if [ -z "$MAIN_DB_URL" ]; then
  echo "❌  Error: DATABASE_URL not found in .env.main"
  exit 1
fi

echo "📋  Step 1/3 — Checking for schema differences between main DB and schema.prisma..."
echo ""

# Generate diff by comparing LIVE main DB vs schema.prisma
# This does NOT need a shadow database
set +e
DIFF=$(npx prisma migrate diff \
  --from-url "$MAIN_DB_URL" \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script 2>&1)
DIFF_EXIT=$?
set -e

if [ $DIFF_EXIT -ne 0 ]; then
  echo "❌  Failed to connect to main DB or generate diff:"
  echo "$DIFF"
  exit 1
fi

# Strip SQL comments and blank lines to check if there are real changes
MEANINGFUL=$(echo "$DIFF" | grep -v "^--" | grep -v "^[[:space:]]*$" || true)

if [ -z "$MEANINGFUL" ]; then
  echo "✅  No schema changes detected."
  echo "    Main DB is already in sync with schema.prisma."
  echo ""
  exit 0
fi

# ── Create the migration file ──
echo "🔄  Step 2/3 — Creating migration file..."
echo ""
mkdir -p "$MIGRATION_DIR"
echo "$DIFF" > "$MIGRATION_DIR/migration.sql"
echo "    📁  $MIGRATION_DIR/migration.sql"
echo ""
echo "--- Changes to be applied to main DB ---"
echo "$DIFF" | grep "^--" | head -40
echo "----------------------------------------"
echo ""

# ── Deploy to main ──
echo "🚀  Step 3/3 — Deploying to main DB..."
echo ""
npx prisma migrate deploy

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║  ✅  Done! Main DB is synced to schema.prisma ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
