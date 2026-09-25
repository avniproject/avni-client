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

`OperatingIndividualScopeAwareRepository.addSyncStrategyPredicates` scopes a sync on four axes,
and three of them are per-user:

| Line | Axis | Scope |
|---|---|---|
| 108 | `isShouldSyncByLocation` → `addressLevels` | catchment |
| 126 | `isDirectlyAssignable` → `userSubjectAssignment.user` | **per-user** |
| 148 | `Subject.User` → `userSubjects.user` | **per-user** |
| 157 | `syncConcept1Value` / `syncConcept2Value` | **per-user** |

That repository is not the only narrowing, though. `SyncDetailsService` gates every syncable item
on `groupPrivileges.hasPrivilege(ViewSubject, subjectType, …)`, so two users in one catchment who
belong to different groups sync different entity types outright. Privileges were the **first**
thing the 2026-06-26 decisions-log entry named when it closed avni-client#956.

Keying per-user only on sync attributes would leave two users in one catchment sharing a dump
when they differ by direct assignment, by a User-type subject type, or by privilege — the #956
breach reached by three different routes. The predicate therefore covers all four:

```
perUser(user) = organisationFiltersRowsPerUser()
             || userHasANonBaselineGroup(user)
```

The first three terms are **organisation** properties; the fourth is a fact about the individual
user, and the split is deliberate:

| Term | Means | Scope |
|---|---|---|
| `orgHasUserSubjectType` | some non-voided `SubjectType` has `type == Subject.User` | org |
| `orgHasDirectlyAssignableSubjectType` | some non-voided `SubjectType` has `isDirectlyAssignable == true` | org |
| `orgHasSyncRegistrationConcept` | some non-voided `SubjectType` has `isAnySyncRegistrationConceptUsable()` | org |
| `userHasANonBaselineGroup` | the user holds a non-voided membership beyond `Everyone` + `SQLite Migration` | **per user** |

The first three are org-level because they narrow sync at **row** level: when such a subject type
exists, every user's sync for it is filtered by their own rows, so two users in one catchment differ
whether or not either is narrowed today.

The fourth is per-user because privileges narrow sync at **entity-type** level and differ between
individuals in the same organisation. It must not be org-level, and an earlier implementation that
made it so had a reachable privilege breach: it asked whether the org had a group that was not one
of the defaults, but `Group.isOneOfTheDefaultGroups()` covers **Administrators**, and
`OrganisationService:1190` gives Administrators `hasAllPrivileges`, which
`GroupPrivilegeService:249` short-circuits to every privilege. An org with only default groups was
therefore judged uniform while an admin in it saw strictly more than a field worker — so an admin's
upload could hand a field worker subjects they hold no `ViewSubject` on. That is #956, reached
through the axis the term was added to close.

The per-user form closes it and is also less destructive. `Everyone` is a universal baseline:
`UserService.addToDefaultUserGroup` attaches it to every non-super-admin user and `UserService:117`
never lets it be detached, and `SQLite Migration` only marks the migration. So a user holding
nothing else has exactly the baseline privilege set that their catchment peers hold, and
`getAllAllowedPrivilegesForUser` unions allow-rows across a user's groups, making two such users
privilege-identical. Admins, Metabase users and custom-group members each get their own per-user
key; ordinary field workers keep the shared dump. One admin in an organisation no longer costs
everyone else the catchment tier.

**Baseline groups are matched by id and uuid, never by name.** `groups` is unique on
`(uuid, organisation_id)` only, and `GroupsController.updateGroup` blocks renaming a group that *is*
default without blocking a rename *to* a default name — so a custom differentiating group could be
renamed into a baseline name and vanish from the test. `Everyone` is resolved once by id;
`SQLite Migration` is matched on `Group.SQLITE_MIGRATION_UUID`. A missing `Everyone` group throws
rather than degrading to the shared key: this predicate fails closed. `isDirectlyAssignable` is a property of the subject type, and when
one exists, *every* user's sync for it is filtered by their own `userSubjectAssignment` rows — so
two users in the same catchment get different data whether or not either holds an assignment
today. A shared catchment dump is therefore wrong for everyone in such an organisation, not just
for the users who happen to be narrowed right now.

**The sync-attribute term is org-level for a second reason: the per-user form does not work.**
An earlier draft of this spec said the term meant "this user's `syncSettings` yield a value for
`syncAttribute1`/`syncAttribute2`", and the first implementation read those as top-level keys of
`users.sync_settings`. They are not keys. `JsonObjectUtil.getUserSyncSettings` shows the persisted
object carries exactly one top-level key, `subjectTypeSyncSettings`, holding a list of
`UserSyncSettings`; `syncAttribute1`/`syncAttribute2` are `SyncSettingKeys` selectors passed *into*
`getSyncAttributeValuesBySubjectTypeUUID` to pick a field of a nested entry. A top-level lookup
always returns null, so the term never fired. Reading the nested list would fix the lookup, but the
org-level test subsumes it — a user can only hold sync-attribute values for a subject type that
declares sync concepts — and errs toward privacy, so that is the form the predicate uses.

`Group.isOneOfTheDefaultGroups()` excludes Administrators, Everyone, Metabase and **SQLite
Migration**. That last exclusion is load-bearing: membership of the migration group must not by
itself push every migrated user onto a per-user key, or the catchment tier could never apply to
anyone this feature serves.

Consequence worth stating plainly: in an organisation with any of the three row-level properties,
**no user is eligible for key 2** and the catchment tier is unavailable there; where only the
privilege term fires, it is unavailable to that user alone. That is the correct outcome —
it is the same organisation shape that made the Realm catchment dump a privilege breach — but it
leaves key 2 serving only organisations that are location-scoped, privilege-flat, single-group,
with no sync concepts and no directly-assignable or User subject type. Whether that population is
large enough to justify the tier is an open question, recorded below.

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

**The key is always derived from `UserContextHolder`, never from a request parameter.**
`mobileDatabaseBackupFile()` and `sqliteSnapshotRelativeKey()` already work this way, and it is
what stops these three routes from ever handing one user another user's artifact.

An earlier draft called this "unreadable by anyone but its owner by construction". That was
overstated, and the correction matters. `/media/signedUrl?url=…` takes a caller-supplied URL and
`AWSS3Service.generateMediaDownloadUrl` authorises it by checking only that the key sits under the
caller's **organisation** directory — it never inspects the username segment. So an authenticated
user who knows a colleague's username can sign a GET for `fastsync/<colleague>/fastsync.db`.
Cross-organisation access is blocked; within an organisation it is not.

This is pre-existing and applies equally to key 4, `snapshots/<username>/snapshot.db`, which
snapshot-server has been writing all along. This design does not widen it, and closing it is a
separate change to `/media/signedUrl`. It is recorded here so the per-user key is understood as
org-isolated and obscure, not access-controlled.

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
  preference-order routes, and branch on the tier the server reports: assert identity for
  `perUser` and `snapshot`, overwrite it for `catchment`, mirroring
  `BackupRestoreRealmService._restoreSettings` / `._restoreUserInfo`.

## The catchment tier restores by correcting identity, not by asserting it

Key 2 is the direct successor to Realm's `MobileDbBackup-<catchmentUuid>`, which has worked since
17.3. It must keep working. The SQLite restore path currently breaks it, and the reason is a
misapplied check rather than anything wrong with the tier.

`BackupRestoreSqliteService.restore()` reads `user_info.username` out of the downloaded database
and throws unless it equals `settingsService.getSettings().userId`. That check was written for
snapshot-server artifacts (key 4), which are generated per user — there, a username mismatch
really does mean a mis-keyed file, and throwing is right. A catchment dump is uploaded by one user
and restored by another, so the same check rejects it every time. Key 2 is unreachable today not
because sharing is wrong but because a per-user assertion was applied to a shared artifact.

**Realm never asserts identity on a restored dump; it overwrites it.**
`BackupRestoreRealmService.restore()` captures the restoring user's own identity *before* the swap:

```js
const prevSettings = this.getPreviousSettings(settingsService);
const prevUserInfo = UserInfo.fromResource({username: prevSettings.userId, …});
```

and after the downloaded file is in place it writes that identity back over the uploader's:

```js
this._restoreSettings(prevSettings);   // :279
this._restoreUserInfo(prevUserInfo);   // :292
```

The SQLite path adopts the same shape, chosen by tier:

| Tier | Artifact is | Restore behaviour |
|---|---|---|
| 3 `fastsync/<username>/` | this user's own upload | assert `user_info.username == settings.userId`; a mismatch is a mis-keyed artifact |
| 4 `snapshots/<username>/` | generated for this user | assert, as today |
| 2 `MobileDbBackupSqlite-<catchment>` | a catchment peer's upload | **do not assert.** Overwrite `user_info` and the settings rows with the restoring user's identity, as Realm does |

### Why overwriting is safe here when it was not in 17.3

In 17.3 the overwrite *was* the #956 privilege breach: the catchment dump was shared with no test
of whether the sharers legitimately saw the same data, so a lower-privilege user could inherit rows
they were not permitted. The four-term predicate above is what closes that. Key 2 is now reached
only by organisations that are location-scoped, privilege-flat, single-group, with no usable sync
registration concepts and no directly-assignable or User subject type — precisely the shape in
which every user in a catchment does see the same data. So the tier keeps 17.3's working behaviour
without 17.3's breach, and the predicate is what earns it.

Consequence: the predicate is not merely a key-selection optimisation, it is the safety argument
for the overwrite. Weakening a term later re-opens #956.

### The server must report which tier won

The client cannot choose the restore behaviour if it does not know what it received, and today
`/media/fastSyncDownload` returns a bare signed URL. It must also report the tier. Nothing consumes
the route yet, so the response becomes an object:

```json
{"url": "https://…", "tier": "perUser" | "catchment" | "snapshot"}
```

The tier is derived on the server from the key that won the preference walk — never from a request
parameter, for the same reason the key itself is not. The client maps `catchment` to the overwrite
path and the other two to the assert path. Inferring the tier from the shape of the signed URL
would also work, but it couples the client to S3 key spelling and would silently pick the wrong
branch if a key were ever renamed.

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

Assert the **format**, not the identity. The two are separable and only the first belongs on every
path.

A mis-keyed artifact — a Realm file served where SQLite was expected, or the reverse — must fail
loudly instead of being written over the live database. `BackupRestoreSqliteService.restore()` gets
this for free today: it opens the downloaded file as SQLite read-only before the swap, so a Realm
file fails there. The Realm path has no equivalent and should get one, which is what
avni-server#1059 makes unnecessary in the common case but not impossible.

Identity is the tier-dependent part, covered above: assert it for keys 3 and 4, overwrite it for
key 2. An earlier draft of this spec said "both restore paths should assert", conflating the two
and prescribing exactly the check that makes the catchment tier unreachable.

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

**Client unit (restore semantics)**
- A `catchment` tier response does NOT throw on a username mismatch, and the restored database's
  `user_info.username` equals `settings.userId` afterwards.
- A `perUser` or `snapshot` tier response still throws on a username mismatch.
- A non-SQLite file fails the read-only open before the live database is touched.

**Device**
- Two users in one catchment: A uploads, B restores, B ends up with B's identity and can sync.
  This is the case that is broken today and the one the tier exists for.
- Upload from a SQLite device with per-user scoping; confirm the artifact lands on key 3.
- Upload from a SQLite device without per-user scoping; confirm key 2, and that key 1 is untouched.
- Restore as the same user; then confirm a different user in the same catchment cannot read key 3.
- Remove a user from the migration group, sync, and confirm they receive key 1 or a full sync and
  never a SQLite artifact.

## Out of scope

- Retiring snapshot-server (#1919). Key 4 keeps its own producer and namespace.
- Moving the error reason into `sync_telemetry` as a column.
- Any change to sync retry or timeout behaviour.
