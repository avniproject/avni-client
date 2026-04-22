# Organisation Migration Testing Checklist

Use this checklist when migrating an organisation's users from Realm to SQLite. Each item should be verified **before** and **after** migration.

## Tooling Reference

All commands run from the repo root with Node 20 active (`source ~/.nvm/nvm.sh && nvm use 20`). See [`CLAUDE.md`](../CLAUDE.md) for the full list of make targets.

### Pulling and pushing databases

| Command | Purpose |
|---|---|
| `make get_db_force` | Pull Realm DB from device to `../db/default.realm` |
| `make get_sqlite_db` | Pull SQLite DB (+ WAL checkpoint) from device to `../db/avni_sqlite.db` |
| `make put_db` | Push `../db/default.realm` back to the device |
| `make put_sqlite_db` | Push `../db/avni_sqlite.db` back to the device |

### Comparison scripts

| Script | Compares | Typical use |
|---|---|---|
| `packages/openchs-android/src/utility/compareRealmAndSqlite.js` | A Realm DB against a SQLite DB (row counts per entity, sync status, missing rows, embedded observations) | Post-migration — diff the SQLite DB against the pre-migration Realm baseline |
| `packages/openchs-android/src/utility/compareRealmDatabases.js` | Two Realm DBs (schema version, object types, row counts including embedded objects, property differences) | Post-rollback — diff the restored Realm DB against the pre-migration baseline |

Example invocations:

```
node packages/openchs-android/src/utility/compareRealmAndSqlite.js \
    ../db/baseline.realm ../db/avni_sqlite.db

node packages/openchs-android/src/utility/compareRealmDatabases.js \
    ../db/baseline.realm ../db/default.realm
```

Redirect output to a file (`> ../db/compare.txt 2>&1`) when attaching to a bug report.

## Pre-Migration (on Realm)

- [ ] Confirm the org's current sync works without errors
- [ ] Note the total entity counts (Individuals, ProgramEnrolments, ProgramEncounters, Encounters) for comparison after migration
- [ ] Ensure no pending uploads (`EntityQueue` should be empty after a sync)
- [ ] Note the current dashboard card counts for comparison
- [ ] Capture the Realm baseline from the device and archive it for later comparison:
  ```
  make get_db_force                       # pulls to ../db/default.realm
  cp ../db/default.realm ../db/baseline.realm
  ```

## Migration Trigger

- [ ] Add the test user to the "SQLite Migration" group via the webapp UserGroups admin UI
- [ ] Verify the group appears correctly and the delete button is disabled

## During Migration Sync

- [ ] User triggers sync on device
- [ ] Sync progress bar shows continuously (no OK button flash between regular sync and migration)
- [ ] "Switching backend" message appears after reference data sync
- [ ] Reference data re-syncs on SQLite
- [ ] Transactional data syncs on SQLite (single sync, not double)
- [ ] "Sync Complete" dialog appears at the end
- [ ] User clicks OK — dashboard loads correctly

## Post-Migration Functional Tests

### Sync & Data
- [ ] Pull the post-migration SQLite DB from the device:
  ```
  make get_sqlite_db                      # pulls to ../db/avni_sqlite.db
  ```
- [ ] Compare entity counts and sync status against the pre-migration Realm baseline:
  ```
  node packages/openchs-android/src/utility/compareRealmAndSqlite.js \
      ../db/baseline.realm ../db/avni_sqlite.db
  ```
  Expect matching row counts for Individuals, ProgramEnrolments, ProgramEncounters, Encounters, and embedded observations.
- [ ] Incremental sync works (make a change on server, sync, verify it appears)
- [ ] Sync telemetry reports `activeBackend: "sqlite"` on the server

### Registration
- [ ] Open registration form — all form element groups and form elements render
- [ ] Navigate through all pages (Next/Previous)
- [ ] Fill in all fields and save — individual appears in search
- [ ] Re-open the saved individual — all data is present

### Search
- [ ] Search by name — results appear
- [ ] Search with filters (gender, address, program) — results are correct

### Enrolment
- [ ] Enrol the registered individual in a program
- [ ] Verify enrolment appears in the subject dashboard
- [ ] Check program-specific observations save correctly

### Encounters
- [ ] Create a scheduled encounter — verify it appears in the visit list
- [ ] Complete the encounter — fill observations, save
- [ ] Re-open the completed encounter — all observations are present
- [ ] Cancel an encounter — verify it shows as cancelled

### Dashboard
- [ ] Primary dashboard loads with card counts
- [ ] Custom dashboard loads (if configured)
- [ ] Report card counts match Realm baseline (allow for delta from new registrations)
- [ ] Clicking a card shows the entity list
- [ ] Tapping an entity in the list navigates to the subject profile

### Subject Profile
- [ ] Open an individual's profile — name, age, gender, address render correctly
- [ ] Enrolments list shows enrolled programs
- [ ] Encounter history shows past visits
- [ ] Observations are readable (coded answers resolve to display names)

### Offline
- [ ] Put device in airplane mode
- [ ] Register a new individual — saves locally
- [ ] Complete an encounter — saves locally
- [ ] Restore network, sync — local changes upload successfully

### Rules (if org has custom rules)
- [ ] Form rules execute (fields show/hide based on conditions)
- [ ] Validation rules trigger (error messages appear on invalid input)
- [ ] Visit schedule rules create correct scheduled encounters
- [ ] Report card rules return correct counts (compare with Realm baseline)
- [ ] Decision rules produce correct outcomes

## Rollback Test

- [ ] Remove the user from the "SQLite Migration" group via webapp
- [ ] Trigger sync on device — migration reverses to Realm
- [ ] Verify Realm data is intact and functional after rollback
- [ ] Pull the post-rollback Realm DB and diff against the pre-migration baseline:
  ```
  make get_db_force                       # pulls to ../db/default.realm
  node packages/openchs-android/src/utility/compareRealmDatabases.js \
      ../db/baseline.realm ../db/default.realm
  ```
  Expect schema version, object types, and row counts to match the baseline (allowing for any new data created during migration testing).

### Reproducing a State on Another Device

Use the push targets to restore a captured DB to the connected device for further testing or bug reproduction:

```
make put_db                              # pushes ../db/default.realm to the device
make put_sqlite_db                       # pushes ../db/avni_sqlite.db to the device
```

## Post-Migration Monitoring (first 48 hours)

- [ ] Check Bugsnag for any new errors from this user
- [ ] Verify sync telemetry shows no FK violations (`foreign_key_check`)
- [ ] Confirm sync times are comparable to Realm (within 1.2x)
- [ ] No ANR (Application Not Responding) reports


