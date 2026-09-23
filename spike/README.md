# Sync device spike (branch `spike/sync-device-perf`, never merge)

Measures where a first sync spends its time on a real low-end phone, per page and per phase,
and tests one client-side change per run. Server: prerelease, unfixed. User: a jscs user with a
reduced catchment (credentials in `~/.avni-conductor/spike-creds.env`, not in the repo).

## What the branch adds
- `src/framework/spike/SpikeFlags.js` + `config/spike-flags.json` — toggles baked into each build.
- `[SPIKE] {json}` lines on logcat (tag ReactNativeJS): `db_open`, `sync_start`, `backend_switch`,
  `ref_cache`, `page` (entity, rows, networkMs, parseMs, mapMs, writeMs, persistMs, Hermes heap),
  `bulk` (flattenMs, execMs per batch), `idx_drop`/`idx_recreate`, `sync_end`/`sync_error`.
  No record content is ever logged — names, counts and timings only.
- Toggles: `pipeline` (one page fetched ahead), `fkStub` (uuid stub instead of a SELECT per
  transactional parent), `syncNormal` (PRAGMA synchronous=NORMAL), `dropIndexes` (secondary
  indexes off during the sync), `multiRow` (multi-row VALUES chunks), `pageSize`, `timeoutMs`
  (default 300 s so an unfixed server does not abort the run).
- `android/app/build.gradle`: generic release signs with the debug key when no release secrets are set.

## Loop
    spike/build.sh <config>   # configs/<config>.json -> apks/<config>.apk
    spike/run.sh <config>     # install, pm clear, log in, sync, logcat -> results/<config>-<ts>/
    results/summary.csv       # one row per run

Each run is a fresh install and a genuine first sync. Change one flag per run.
