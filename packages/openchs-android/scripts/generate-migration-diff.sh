#!/bin/bash
# Generate a new migration when Realm schemas change.
#
# Usage: npm run migration:diff -- <migration-name>
#   e.g.: npm run migration:diff -- add-new-entity-column
#
# Workflow:
#   1. openchs-models updates a Realm schema
#   2. Run this script
#   3. drizzle-kit generates SQL diff in drizzle-migrations/
#   4. Script bundles the SQL into a JS module for React Native
#   5. Review the generated migration and commit

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PACKAGE_DIR"

MIGRATION_NAME="${1:-auto}"

echo "==> Generating migration: $MIGRATION_NAME"
npx drizzle-kit generate --name "$MIGRATION_NAME"

echo ""
echo "==> Bundling migrations for React Native"
node scripts/bundle-migrations.js

echo ""
echo "Done. Review the changes in:"
echo "  - drizzle-migrations/"
echo "  - src/framework/db/migrations/drizzleMigrations.js"
echo ""
echo "Commit all changed files in drizzle-migrations/ and src/framework/db/migrations/."
