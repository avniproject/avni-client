# Avni Client

React Native Android app for the [Avni](https://avni.readme.io/) field data collection platform.

## Prerequisites

- **Node 20** (see `.nvmrc`). The shell default may be older — always ensure Node 20 is active before running commands:
  ```
  source ~/.nvm/nvm.sh && nvm use 20
  ```
- **Java 17**
- **Android SDK** with build-tools 35.0.0, NDK 27.1.12297006

## Project Structure

- Monorepo root: `./`
- Main app package: `packages/openchs-android/`
- Android native code: `packages/openchs-android/android/`
- Patches (patch-package): `packages/openchs-android/patches/`
- Makefile at root includes makefiles from `makefiles/` dir

## Common Make Commands

All commands run from the repo root.

### Development Workflow

| Command | Description |
|---|---|
| `make deps` | Install npm dependencies, apply patches, run prebuild |
| `make run_packager` | Start the Metro bundler |
| `make run-app` | Build debug APK, install on device, and launch (dev environment) |
| `make run-app-prerelease-dev` | Build and install against the prerelease backend |
| `make run-app-staging-dev` | Build and install against the staging backend |
| `make run-app-prod-dev` | Build and install against the production backend |
| `make uninstall-apk` | Uninstall the app from the connected device |
| `make clear_app_data` | Clear app data without uninstalling |
| `make restart-app` | Force-stop and relaunch the app |

### Build

| Command | Description |
|---|---|
| `make build_app` | Run `./gradlew assembleDebug` |
| `make clean_app` | Run `./gradlew clean` |
| `make build` | Full build: install deps + assemble debug APK |
| `make create_apk flavor=X` | Build release APK for a flavor |
| `make create_bundle flavor=X` | Build release AAB for a flavor |

Flavors: `generic`, `lfe`, `sakhi`, `gramin`, `lfeTeachNagaland`, `lfeTeachNagalandSecurity`

### Testing

| Command | Description |
|---|---|
| `make test` | Run Jest unit tests (runs `setup_hosts` + `as_dev` first) |

### Logging

| Command | Description |
|---|---|
| `make log` | Stream React Native logs from device |
| `make log_error_only` | Stream only error-level logs |
| `make log_info` | Stream info-level and above logs |
| `make log_all` | Stream all adb logs |
| `make clear-log` | Clear adb log buffer |

### Database

| Command              | Description |
|----------------------|---|
| `make get_db_force`  | Pull Realm DB from device to `../db/` |
| `make put_db`        | Push Realm DB from `../db/default.realm` to device |
| `make rm_db`         | Remove local copy of the DB |
| `make get_sqlite_db` | Pull SQLite DB (+ WAL/SHM) from device to `../db/avni_sqlite.db` |

#### Compare Realm Databases

Compare two Realm database files for schema and data differences (schema version, object types, row counts including embedded objects, and property differences):

```
source ~/.nvm/nvm.sh && nvm use 20
node packages/openchs-android/src/utility/compareRealmDatabases.js <realmFileA> <realmFileB>
```

Must be run from the repo root so that the `realm` module resolves correctly.

#### Compare Realm and SQLite Databases

Compare a Realm database with a SQLite database for row count differences, sync status, and missing data:

```
source ~/.nvm/nvm.sh && nvm use 20
node packages/openchs-android/src/utility/compareRealmAndSqlite.js <realmFile> <sqliteFile>
```

Example:
```
node packages/openchs-android/src/utility/compareRealmAndSqlite.js ../db/default.realm ../db/avni_sqlite.db
```

To pull both databases from device:
```
make get_db                    # Realm → ../db/default.realm
make get_sqlite_db             # SQLite → ../db/avni_sqlite.db
```

### SQLite Migrations

| Command | Description |
|---|---|
| `make migration_generate name=X` | Generate a new migration after schema changes |
| `make migration_bundle` | Re-bundle drizzle migrations into JS module |
| `make migration_export_schema` | Verify DrizzleSchemaExport table count |
| `make get_sqlite_db` | Pull SQLite DB from device to `../db/` |

### Cleanup

| Command | Description |
|---|---|
| `make clean_env` | Remove node_modules and clean build artifacts |
| `make clean_all` | Full clean: node_modules, packager cache, and bundle |
| `make clean_packager_cache` | Clear Metro/watchman caches |
| `make renew_env` | Full clean + fresh dependency install |

## Workflow

- **Do not commit eagerly.** Wait for the user to test changes on-device and confirm correctness before creating commits. Only commit when explicitly asked.

## Key Technical Details

- React Native 0.77.3, React 18.3.1
- Realm 12.14.2 (exact version — do NOT use ^)
- Hermes JS engine enabled
- AGP 8.7.2, Gradle 8.10.2, Kotlin 2.0.21
- compileSdk/targetSdk 35, minSdk 24
- `postinstall` runs `patch-package && npx jetify`
