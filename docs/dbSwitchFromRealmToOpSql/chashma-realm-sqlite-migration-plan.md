# Spec: Chashma pilot — Realm → SQLite migration rollout plan

Plan for migrating the chashma organisation's field users from the Realm backend to SQLite in
production. Chashma is the first production org to go through the per-user dynamic backend
switch.

## Why chashma first

- **Only 2 active field users** — 9815 and 9816. Blast radius of any failure is two devices,
  both individually recoverable.
- **Low org complexity** — small form/report surface compared to other production orgs, so the
  query-translation and report-card paths get exercised without the long tail of exotic queries.
- **Prerelease verification already done (partially)** — checked with `maha@chashma` on
  prerelease: report cards returned correct results after migration. Caveat: not all cases were
  checked (see gaps below).

## Mechanism (what actually happens on the device)

No app-side or server-side code change is needed to roll out — the switch is data-driven:

1. A user is added to the well-known **"SQLite Migration"** group on the server
   (`SqliteMigrationService.js` — group UUID `e6e5e4e3-e2e1-4f00-8000-d0d1d2d3d4d5`).
2. The flag reaches the device through the existing **MyGroups** sync entity; no new server
   contract.
3. `SqliteMigrationService` detects `desiredBackend !== activeBackend` after sync and drives a
   crash-resumable state machine persisted in AsyncStorage:
   `idle → pending_upload → pending_target_sync → completing → idle`.
   Unsynced local data is uploaded **before** the switch (`pending_upload`), then the SQLite DB
   is populated by a fresh pull. Fresh installs switch mid-sync instead, avoiding a double full
   sync.
4. The **Realm DB is left intact** throughout; failures park at the current phase and resume on
   the next sync attempt. Errors go to Bugsnag and the on-device log.
5. The ResetSync ordering fix (`2ec9c3624`) ensures a failure mid-migration cannot trigger a
   spurious reset-sync wipe on the next attempt — ResetSyncs are pulled and marked migrated
   before any reference data lands.

## Parser-card dependencies for this migration

Assessed 27 Aug against the active-cards corpus (`report-card-query-sqlite-migration-scope.md`).
Chashma (org 401) has 8 active custom cards — **all full-table scans**: the rules call
`db.objects()` with no Realm filter and select rows in JS. Zero TRUEPREDICATE, SUBQUERY, or
OR shapes anywhere.

| Card | Needed for chashma? | Why |
|---|---|---|
| #1977 TRUEPREDICATE → window SQL | **Yes — build-level only, already implemented** | Not used by chashma's cards, but framework sync/bookkeeping queries (PrivilegeService, EntityQueueService, EntitySyncStatusService, …) hit this shape on every sync. Requirement reduces to: migrate on a build containing it. |
| #1978 SUBQUERY families B/C/D | **No** | No SUBQUERY of any kind in chashma's cards. |
| #2076 top-level OR split | **No for custom cards** | No OR predicates in the rules. Residual check: the app composes this shape itself for *standard-type* cards scoped to programs + encounter types (`ReportCardQueryBuilder.js:72`) — verify during the report-card sweep whether chashma's dashboards use such standard cards. |

The chashma-specific dashboard risk is not parser coverage but **scan cost**: all 8 cards
hydrate whole tables per dashboard load on SQLite. Fine at chashma's data size; measure
card-load time on a real device during the sweep, and if any card is slow the fix is an
org-side rule rewrite to `execReport` (`docs/RuleSqlMigrationGuide.md`) — not a parser card.

## Pre-rollout checklist

Gaps to close before touching production users:

- [ ] **Report-card sweep on prerelease** — the maha@chashma check covered some cards, not all.
      Enumerate chashma's active report cards and verify each returns the same count/rows on
      SQLite as on Realm (see `report-card-query-sqlite-migration-scope.md` for the
      parser-verdict method). Verdicts already computed — see "Parser-card dependencies"
      section above: all 8 custom cards are full-table scans, so this sweep is about
      result parity and card-load *timing*, plus checking whether any standard-type cards
      trigger the app-composed OR shape (#2076).
- [ ] **Unsynced-data path** — on a prerelease device, create a subject + encounter, leave it
      unsynced, add the user to the group, sync. Verify the draft data reaches the server and
      appears in the post-switch SQLite DB.
- [ ] **Mid-migration interruption** — kill the app during the target sync; relaunch and sync
      again; verify resume completes and no reset-sync dialog appears.
- [ ] **DB parity check** — after a prerelease migration, pull both DBs and run:
      `node packages/openchs-android/src/utility/compareRealmAndSqlite.js ../db/default.realm ../db/avni_sqlite.db`
      (from repo root, Node 20). Row counts must match for all synced entity types.
- [ ] **App version** — confirm both production devices are on (or can be updated to) the
      release carrying the migration machinery including `2ec9c3624`.

## Rollout steps (production)

Migrate one user at a time; do not add both users to the group on the same day.

1. **User 9815 first.**
   - Confirm the device has no unsynced data older than a day (ask the user to sync; check
     sync telemetry for a recent `COMPLETE`).
   - Add 9815 to the "SQLite Migration" group in the production web console.
   - Have the user sync. The migration UI runs; expect one extra full-download's worth of time
     and data.
   - Verify (next section). Watch for 2–3 days of normal field use.
2. **User 9816** — same steps, only after 9815 is verified stable.
3. Leave `maha@chashma` (admin/test account) in the group as the canary it already is.

## Post-migration verification (per user)

- Sync telemetry shows a `COMPLETE` sync after the switch, and subsequent syncs stay `COMPLETE`.
- User confirms: dashboards/report cards show expected counts, registers/visits open, a new
  encounter can be saved and synced (verify it lands server-side).
- No Bugsnag events tagged with the migration or the user around the switch window.
- If a device can be inspected: pull both DBs (`make get_db_force`, `make get_sqlite_db`) and
  run the compare script for row-count parity.

## Rollback

- Remove the user from the "SQLite Migration" group. `computeDesiredBackend()` returns `realm`
  on the next sync and the same state machine drives the switch back. The original Realm DB was
  never deleted, and unsynced SQLite-side data goes through the same upload-first phase.
- If a device is wedged mid-migration (state machine not recovering across retries): collect
  logs first, then clear app data and do a fresh sync on the backend the group membership
  currently says — this is the last resort, acceptable here only because pending data is
  uploaded before the switch begins.

## Success criteria (exit)

- Both users on SQLite with ≥1 week of normal field activity: syncs completing, data entered
  and reaching the server, no correctness complaints on report cards.
- No open Bugsnag issues from the two devices attributable to the migration.
- Learnings folded back into this spec (timings, data volumes, anything that surprised) before
  proposing the next, more complex org.

## Open questions

- Exact chashma production data volume per user (affects expected migration sync duration —
  capture the timing from the first production migration for the next org's estimate).
- Whether the prerelease maha@chashma check covered standard-type cards or only custom-query
  cards — list the specific cards checked vs remaining.
