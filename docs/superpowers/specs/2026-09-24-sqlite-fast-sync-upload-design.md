# Fast-sync database upload for the SQLite backend

**Date:** 2026-09-24
**Cards:** avni-client#2140 (remaining scope), plus a new avni-server issue
**Status:** design approved in conversation; awaiting spec review

## Problem

`StaticMenuItemFactory.getSyncMenus()` hides the "Setup fast sync" menu item whenever the active
backend is SQLite, so a migrated user cannot set up fast sync at all. #2140 reported this alongside
the missing "Code Schema Version" line; that half shipped in `64ecbc2a2`, this half did not.

The item was hidden deliberately (`e478a6b6c`), and the reason matters. The decisions-log entry of
2026-06-26 (vinayvenu, on avni-client#956) closed the catchment-scoped Realm fast sync as
won't-fix-in-place: one snapshot shared by users with different privileges, sync attributes and
direct assignments causes association errors **and a privilege breach**, where a lower-privilege
user sees data they are not permitted. Per-user, server-generated snapshots were to replace it.

This design restores the upload for SQLite **without** reopening that breach, by keying the
artifact per user whenever the user's data is not purely catchment-shaped.

## Why sync attributes alone are not the test

`OperatingIndividualScopeAwareRepository.addSyncStrategyPredicates` scopes a sync on four axes, and
three of them are per-user:

| Line | Axis | Scope |
|---|---|---|
| 108 | `isShouldSyncByLocation` → `addressLevels` | catchment |
| 126 | `isDirectlyAssignable` → `userSubjectAssignment.user` | **per-user** |
| 148 | `Subject.User` → `userSubjects.user` | **per-user** |
| 157 | `syncConcept1Value` / `syncConcept2Value` | **per-user** |

Keying per-user only on sync attributes would leave two users in one catchment sharing a dump when
they differ by direct assignment or a User-type subject type — the #956 breach, reached by a
different route. The predicate therefore covers all three per-user axes:

```
perUser = hasSyncAttributes
       || orgHasDirectlyAssignableSubjectType
       || orgHasUserSubjectType
```

Each term has to be read precisely, because two of them are **organisation** properties rather than
facts about the individual user:

| Term | Means |
|---|---|
| `hasSyncAttributes` | this user's `syncSettings` yield a value for `syncAttribute1`/`syncAttribute2` for any subject type |
| `orgHasDirectlyAssignableSubjectType` | the organisation has at least one non-voided `SubjectType` with `isDirectlyAssignable == true` |
| `orgHasUserSubjectType` | the organisation has at least one non-voided `SubjectType` whose `type == Subject.User` |

The last two are org-level on purpose. `isDirectlyAssignable` is a property of the subject type, and
when one exists, *every* user's sync for it is filtered by their own `userSubjectAssignment` rows —
so two users in the same catchment get different data whether or not either has sync attributes. A
shared catchment dump is therefore wrong for everyone in such an organisation, not just for users
who happen to hold assignments today.

Consequence worth stating: in an organisation with a directly-assignable or User-type subject type,
**no user is eligible for key 2** and the catchment tier is effectively unavailable there. That is
the correct outcome — it is the same organisation shape that made the Realm catchment dump a
privilege breach.

## Storage keys

Four distinct namespaces. Nothing is shared between formats or between producers.

| # | Key | Format | Producer | Readable by |
|---|---|---|---|---|
| 1 | `MobileDbBackup-<catchmentUuid>` | Realm | Realm device | Realm users |
| 2 | `MobileDbBackupSqlite-<catchmentUuid>` | SQLite | SQLite device, `perUser == false` | SQLite users, `perUser == false` |
| 3 | `fastsync/<username>/fastsync.db` | SQLite | SQLite device, `perUser == true` | that user |
| 4 | `snapshots/<username>/snapshot.db` | SQLite | snapshot-server | that user |

Key 1 is existing and untouched. Key 4 is existing and untouched — snapshot-server keeps sole
ownership of it, so the two producers cannot overwrite each other.

**Key 2 must not reuse key 1.** A SQLite device writing to `MobileDbBackup-<catchmentUuid>` would
replace the Realm dump, and Realm devices would then download a SQLite file into `default.realm`.

## Download preference

The server walks the order; the client does not choose.

| User | Order |
|---|---|
| SQLite, `perUser == true` | key 3 → key 4 → full sync |
| SQLite, `perUser == false` | key 2 → key 4 → full sync |
| Realm (incl. removed from the migration group) | key 1 → full sync |

A per-user-scoped user is **never** offered key 2. Falling back to a shared catchment dump because
their own upload does not exist yet would reopen #956; they fall to snapshot-server or to a full
sync instead.

A Realm user is never offered keys 2, 3 or 4, and a SQLite user is never offered key 1.

## avni-server changes (new issue)

| Route | Behaviour |
|---|---|
| `GET /media/fastSyncUpload` | derives the key from the caller — key 3 when `perUser`, else key 2 — and returns a signed PUT |
| `GET /media/fastSyncDownload/exists` | walks the preference order, returns `true`/`false` |
| `GET /media/fastSyncDownload` | returns a signed GET for the winning artifact |

All three gated on membership of the "SQLite Migration" group, mirroring
`mobileDatabaseSqliteSnapshotUrl`. A user outside the group gets `false` from `exists` and falls
through to the Realm path, which is what makes the "removed from the group" case work.

**The key is always derived from `UserContextHolder`, never from a request parameter.** This is the
security property: a per-user artifact is unreadable by anyone but its owner by construction rather
than by a check that could later be removed. `mobileDatabaseBackupFile()` and
`sqliteSnapshotRelativeKey()` already work this way.

### Prerequisite: avni-server#1059

`/media/mobileDatabaseBackupUrl/exists` has no migration-group check, so a SQLite user can be served
the Realm dump today. `LoginActions.restoreDump()` falls through to `restoreRealmDump()` whenever no
SQLite artifact exists, so this is reachable. Today it wastes a download; once SQLite devices upload,
it is a format mismatch written into `default.realm`.

This was previously filed as cheap and adjacent. It is a **hard prerequisite** of this work.

## avni-client changes (#2140)

- `StaticMenuItemFactory.getSyncMenus()` — stop hiding `uploadCatchmentDatabase` on SQLite. Keep
  hiding it under DB encryption, unchanged.
- `BackupRestoreSqliteService.backup(cb)` — new, mirroring `BackupRestoreRealmService.backup()`.
- `MediaQueueService.getDumpUploadUrl` — a dump type for the new upload route.
- `MenuView.uploadCatchmentDatabase()` — select the service by active backend.
- `BackupRestoreSqliteService.restore()` — move from `mobileDatabaseSqliteSnapshotUrl` to the
  preference-order routes.

### The dump is already producible

`SqliteProxy.writeCopyTo(config)` exists and states that it "mirrors Realm's `writeCopyTo`
contract": it runs `PRAGMA wal_checkpoint(TRUNCATE)`, disables FK enforcement for the copy, and
honours `config.encryptionKey`. `BackupRestoreRealmService.backup()` calls
`this.db.writeCopyTo({path: destFile})`, and the same call works against `SqliteProxy`. No new
checkpoint or copy logic is needed.

### Reuse the existing guard

#2141 added `catchmentUploadBlockers` in `utility/CatchmentUploadGuard.js`, covering an unfinished
sync, unsynced local data and pending resets. The SQLite path uses the same guard rather than
growing its own copy.

### Format assertion at the boundary

`BackupRestoreSqliteService.restore()` already opens the downloaded `.db` read-only and compares
`user_info.username` against `Settings.userId`, rejecting a mismatch. The Realm path has no
equivalent. Both restore paths should assert the artifact is the format they expect before replacing
the live database, so a mis-keyed artifact fails loudly instead of corrupting it.

## Decisions recorded

**The menu label needs no retitle.** `translations/en.json` maps
`"uploadCatchmentDatabase": "Setup fast sync"` — the user-visible string is already
backend-neutral and says nothing about catchments. Only the internal key mentions one, and renaming
that key would break platform translations organisations have already synced. Leave both as they
are.

**No reset-sync dependency.** #2057 is closed (8 Sep 2026); `2ec9c3624` and `9825af472` fixed the
backend-switch path in `SyncService.js` and are both in HEAD. An earlier draft of this spec listed a
restore-path reset defect as a prerequisite, citing that number. That was wrong on both counts: the
issue is closed, and it covered the migration dialog rather than the restore path.

The restore-then-reset interaction is worth one check during implementation rather than a blocking
dependency. A restored dump carries the uploader's already-migrated `ResetSync` rows, so the only
window is a reset created *after* the dump was produced — in which case applying it is correct
behaviour, not data loss. Confirm that empirically on the device test for key 2, where the dump is
shared and therefore oldest.

## Testing

**Server unit**
- `perUser` is true for each of the three per-user axes independently, and false for a purely
  location-scoped user.
- Key derivation ignores request input entirely.
- `exists` returns false for a user outside the migration group.
- The preference order is walked correctly, and key 2 is never returned to a `perUser` user.

**Client unit**
- Service selection follows the active backend.
- The SQLite path is blocked by the same `catchmentUploadBlockers` conditions as Realm.
- The upload is still suppressed under DB encryption.

**Device**
- Upload from a SQLite device with per-user scoping; confirm the artifact lands on key 3.
- Upload from a SQLite device without per-user scoping; confirm key 2, and that key 1 is untouched.
- Restore as the same user; then confirm a different user in the same catchment cannot read key 3.
- Remove a user from the migration group, sync, and confirm they receive key 1 or a full sync and
  never a SQLite artifact.

## Out of scope

- Retiring snapshot-server (#1919). Key 4 keeps its own producer and namespace.
- Moving the error reason into `sync_telemetry` as a column.
- Any change to sync retry or timeout behaviour.
