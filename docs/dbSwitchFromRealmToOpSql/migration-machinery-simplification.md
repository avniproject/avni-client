# Realm→SQLite switch: simplification of flows and state

Proposal to collapse the migration machinery from three entry points and a four-phase
state machine to a single flow inside sync and a two-field state record. Derived from the
review of the #2006 fixes (avni-client/issues/2006, review findings on the four fix
commits) and the design discussion that followed. 

## Current design

### State (AsyncStorage, per-user key `avni.sqliteMigration.<username>`)

| Field | Meaning |
|---|---|
| `activeBackend` | which DB the app boots/runs (`realm` / `sqlite`) — **written at the switch, before the download** |
| `desiredBackend` | what the server group says (from MyGroups) |
| `phase` | `idle` → `pending_upload` → `pending_target_sync` → `completing` → `idle` |
| `startedAt`, `attemptCount`, `lastError` | diagnostics (Bugsnag context, logs) |

Throughout this doc, **"the state record"** refers to this per-user AsyncStorage record;
"the state record says realm" means its `activeBackend` field is `realm`.

Phase meanings: `pending_upload` = outbox must reach server before switching (still on
Realm); `pending_target_sync` = switched, SQLite active but not fully populated;
`completing` = downloaded, bookkeeping pending.

### Flows

1. **Normal sync** — desired == active, migration machinery dormant.
2. **Mid-sync switch** (`SyncService._checkAndSwitchBackendMidSync`) — flag discovered in
   this sync: push → early MyGroups pull → outbox gate → persist
   `{active: sqlite, phase: pending_target_sync}` → switch → wipe+seed target → re-fetch
   sync details → recompute tx plan post-switch → full pull → blind-window catch-up
   (`_catchUpTxDataAfterMigration`) → finalize.
3. **Mid-sync deferral** — outbox non-empty at the gate: refuse, park at
   `pending_upload`, complete the sync on Realm; a later sync switches.
4. **Post-sync check** (`SyncComponent._runMigrationIfNeeded` → `resume()`) — janitor for
   parked migrations: `pending_upload` (upload then defer), `pending_target_sync` (re-run
   target sync, finalize), `completing` (finalize).
5. **Launch resume** (`resumeIfPending`, GlobalContext) — app always boots on Realm, then
   reconciles to the state record; parked phases are resumed eagerly at launch (a device parked at
   `pending_target_sync` would otherwise run on a half-populated DB).
6. **Fresh install** — nothing to upload; switch happens mid-first-sync trivially.

### Why this shape is fragile

Three mechanisms enforce one set of invariants, and every confirmed bug from the #2006
review lives in a seam between them:

- `resume()`'s catch persists a stale pre-sync state copy, clobbering the phase/backend an
  escalated sync advanced — next launch boots the wrong DB and re-wipes a populated
  SQLite. Possible only because `activeBackend` is written **before** the migration is
  complete, and by more than one writer.
- The outbox gate is check-then-act across await yields — a save landing between the count
  and `switchBackend` is stranded in abandoned Realm.
- The resume-path target sync lacks the catch-up that the mid-sync path has — records
  uploaded <10s before the switch are transiently missing after migration (the server
  serves only data older than 10s: write-timestamps vs commit-visibility).
- A parked `pending_target_sync` completed by an ordinary manual sync is followed by a
  redundant second sync, because `resume()` cannot know the sync that just ran already did
  the work.
- Deferral (flow 3) and catch-up (flow 2) are two divergent mechanisms for the same
  invariant ("don't lose what this sync uploaded").

## Proposed design

### The one invariant

> **`activeBackend` in the state record is written in exactly one place, exactly once per
> migration: after the target pull and catch-up succeed.** Until then the state record says
> `realm`. A migration that hasn't finished has, as far as persisted state is concerned,
> not happened.

### State (two control fields + diagnostics)

| Field | Meaning |
|---|---|
| `activeBackend` | committed backend — only ever the fully-populated one |
| `desiredBackend` | stored target (must be stored, not derived: mid-migration the target DB's MyGroups is empty and would read "not in group") |
| `startedAt`, `attemptCount`, `lastError` | diagnostics, unchanged |

Derived, not stored: *migration needed* ⇔ `desired ≠ active`. No `phase`, no `pending` —
"switched but unfinished" stops being a persisted state because the commit happens at
completion. Direction (rollback = remove user from group → sqlite→realm) falls out of the
same two fields.

### The one flow (every sync)

1. Push outbox (normal sync step).
2. Refresh MyGroups → update stored `desired`.
3. **If `desired ≠ active`: run the migration leg inline.** The leg's safety
   precondition — outbox empty — is guaranteed by ordering: push ran at step 1, a push
   failure fails the sync before the leg, and no data entry is possible during the
   modal-blocked manual sync. (No re-check inside the leg; see Context assumptions.)
   a. switch the **runtime** to the target (state record untouched)
   b. first attempt vs re-entry is read from the target itself: **no `EntitySyncStatus`
      rows in the target ⇒ first attempt** → wipe + seed all checkpoints to `REALLY_OLD`
      (full pull); **checkpoint rows present ⇒ re-entry** → continue from them. The
      checkpoint table is the target's own progress record, crash-consistent with the
      data it describes — no separate first-vs-retry flag, no second writer to the state record.
      Trusting leftovers is safe because `clearData` wipes both backends on user change
      (#2083), so target state can only be this user's own interrupted attempt (and a
      rolled-back user re-migrating later gets a cheap delta pull for free)
   c. compute the sync plan **after** the switch (the #2006 bug becomes unwritable —
      there is no pre-switch plan to go stale) and pull
   d. blind-window catch-up: if the last upload was <10s ago, wait out the shortfall /
      delta-pull before declaring done
   e. **commit**: write `active = target`. Single writer, success path only.
4. Failure anywhere in the leg: switch the runtime back to the state record's backend, persist
   nothing (except diagnostics), fail the sync. Next sync re-enters step 3 and continues
   from checkpoints.

### Boot

Read the state record → open the DB its `activeBackend` names. Nothing else. A crashed migration leaves `active = realm`
and a complete, functional Realm to boot into; the half-populated SQLite sits invisible
on disk until the next sync continues it. **The user never runs on an incomplete
database.**

Implementation note: boot directly on the committed backend, not boot-on-Realm-then-
reconcile. `SessionUsername` in AsyncStorage (#2083) is readable before any service or
DB is up, so the state record can be resolved first and the bean registry initialised on
the right backend immediately (UserInfo fallback only for pre-#2083 installs). This
removes the per-launch Realm open + backend flip that migrated devices pay today, and is
the prerequisite for eventually not opening (and later deleting) the Realm file at all.

Removing launch-time resume is also a UX fix, not just a simplification: today an
interrupted migration triggers a full target sync at app open — unrequested, invisible
(no sync screen), on whatever network the user happens to have, with the backend flipping
under a live UI when it finishes. That eagerness was forced by the early commit (a parked
device would otherwise run on a half-populated DB). Under the single-commit invariant
there is nothing to rescue at launch; migration work happens only inside a user-initiated
sync, where waiting is expected and progress is visible.

### What gets deleted

- The four-phase state machine and its transitions.
- Flow 3 and the outbox gate entirely — the outbox-empty precondition is carried by
  ordering (push before the leg; push failure aborts the sync), valid while all syncs
  are modal-blocked (see Context assumptions).
- Flow 4 entirely: retry = `desired ≠ active` at the next sync; finalize = the in-leg
  commit. `SyncComponent._runMigrationIfNeeded` and its "Switching backend…" episode go.
- Launch-time `resume()` logic (boot reconcile remains).
- The deferral machinery (park/upload/defer), `serverTimeAfterUpload` threading beyond the
  leg, and the redundant post-completion sync.
- The stale-state-clobber bug class: the error path writes no state, and `active` has a
  single writer.

### Crash matrix

| Interrupted at | State record says | Next boot | Recovery |
|---|---|---|---|
| before/during push | realm | Realm, functional | next sync retries everything |
| after push, before runtime switch | realm | Realm, functional | leg re-runs next sync |
| mid-pull | realm | Realm, functional | leg re-enters, pull continues from target checkpoints |
| after pull, before commit write | realm | Realm, functional | leg re-enters; pull is a near-empty delta; commit lands |
| after commit | sqlite | SQLite, complete | done |

Repeated failures degrade to "user stays on working Realm with Bugsnag noise" — strictly
better than today's "user parked on a half-populated SQLite".

### Preserved guards (do not simplify away)

- Outbox-empty **precondition** for the leg, carried by ordering (push first; push
  failure aborts the sync before the leg). There is no in-leg re-check — see Context
  assumptions for when one must be reinstated.
- Stored `desired` while migrating (never derived from the target DB).
- Catch-up / shortfall wait before the commit (server's `now − 10s` watermark:
  write-timestamps become visible only at commit; the 10s stays server-side).
- Commit ordering: finish pull → write the state record. Never the reverse.

## Context assumptions

- Background auto-sync is being disabled for all users; every sync is the manual,
  modal-blocked sync. **The design leans on this**: with no non-blocking sync, nothing
  can enter the outbox between the push (step 1) and the migration leg (step 3), so the
  leg carries no outbox re-check. If background auto-sync — or any non-blocking sync
  path, or a headless task that writes field data — is ever reintroduced, reinstate an
  outbox-count check at the top of the leg (and re-check it after any awaits before the
  runtime switch); without it, a save landing in that window is stranded in the
  abandoned backend.
