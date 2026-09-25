# Fast-sync database upload for the SQLite backend — client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a SQLite-backend device set up fast sync — upload its database to S3 and restore one on a fresh login — with the same reach the Realm backend has had since 17.3.

**Architecture:** Three seams, each already present for Realm and each currently hardcoded to it. The menu item is hidden when the backend is SQLite; the backup dispatch in `MenuActions` names `BackupRestoreRealmService` unconditionally; and the SQLite restore talks to the old single-tier snapshot routes. This plan opens all three, and makes the restore branch on the tier the server now reports.

**Tech Stack:** React Native 0.77.3, Jest, `op-sqlite` via `SqliteProxy`, `react-native-fs`, Realm 12.14.2 (unchanged).

**Spec:** `docs/superpowers/specs/2026-09-24-sqlite-fast-sync-upload-design.md`

## Global Constraints

- The four S3 namespaces are fixed and must not be renamed: `MobileDbBackup-<catchmentUuid>` (Realm), `MobileDbBackupSqlite-<catchmentUuid>` (SQLite catchment), `fastsync/<username>/fastsync.db` (SQLite per-user), `snapshots/<username>/snapshot.db` (snapshot-server).
- The server picks the key and the tier. The client never chooses a key and never sends one.
- The tier wire values are exactly `"perUser"`, `"catchment"`, `"snapshot"`. They are pinned by a server test; treat them as a contract, not as strings to tidy.
- `catchmentUploadBlockers` in `src/utility/CatchmentUploadGuard.js` is the single upload guard. Do not write a second one.
- The upload stays hidden under DB encryption on both backends. That hide is not part of this work.
- Realm behaviour must not change. No edits to `BackupRestoreRealmService.js` beyond what a shared signature forces, and none are expected.
- No verbose method docstrings. Comment only where the *why* is non-obvious. Never reference this card or plan in a comment.
- Use `yarn`, not npm. Tests: `make test` from the repo root, or `yarn jest <path> --selectProjects unit` for one file — the `--selectProjects unit` flag is what the existing SQLite test files document.

## Review Focus

Five things the spec implies, that no task's happy path exercises, most likely to bite first:

1. **A `catchment` artifact restored by a peer must not be rejected.** This is the bug the whole card exists to fix; Task 3's tier branch is the only thing preventing it. Covered in Task 3.
2. **A `perUser` or `snapshot` artifact with a mismatched username must still be rejected.** Relaxing the assert for every tier would be the easy wrong fix. Covered in Task 3.
3. **A malformed or tier-less download response.** An older server, or a proxy that strips the body, yields `undefined` tier; the client must fail closed rather than silently taking the overwrite branch. Covered in Task 3.
4. **The upload must stay blocked when the guard says so, on SQLite exactly as on Realm.** A new dispatch path is an easy place to lose the guard. Covered in Task 2.
5. **The menu item must stay hidden under DB encryption after the SQLite hide is removed.** The two conditions were fused in one boolean. Covered in Task 1.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/views/menu/StaticMenuItemFactory.js` | modify `:43-49` | decide menu visibility; loses the backend condition, keeps encryption |
| `src/service/MediaQueueService.js` | modify `:33-36`, `:111-117` | name the dump types and map each to its upload route |
| `src/service/BackupRestoreSqliteService.js` | add `backup()`, modify `restore()` | produce the SQLite dump; restore one, branching on tier |
| `src/action/MenuActions.js` | modify `:45-49` | pick the backup service by active backend |
| `test/service/BackupRestoreSqliteServiceTest.js` | extend | covers both new behaviours |
| `test/views/menu/StaticMenuItemFactoryTest.js` | create | covers visibility |
| `test/service/MediaQueueServiceTest.js` | create or extend | covers route mapping |

---

### Task 1: Un-hide the fast-sync menu item on SQLite

**Files:**
- Modify: `packages/openchs-android/src/views/menu/StaticMenuItemFactory.js:43-49`
- Test: `packages/openchs-android/test/views/menu/StaticMenuItemFactoryTest.js` (create)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the `uploadCatchmentDatabase` menu item is now reachable on SQLite, which Task 2's dispatch depends on.

Current code, for reference:

```js
static getSyncMenus(context) {
    // Fast-sync setup (catchment DB upload) isn't supported with DB encryption or the SQLite backend.
    const hideUploadCatchmentDatabase = context.getService(OrganisationConfigService).isDbEncryptionEnabled()
        || GlobalContext.getInstance().getActiveBackend() === BACKENDS.SQLITE;
    return SyncMenus.filter(menuItem =>
        !(menuItem.uniqueName === "uploadCatchmentDatabase" && hideUploadCatchmentDatabase));
}
```

- [ ] **Step 1: Write the failing tests**

Create `packages/openchs-android/test/views/menu/StaticMenuItemFactoryTest.js`. Mock `GlobalContext`
the way `test/service/SyncServiceBackgroundNoSwitchTest.js:38-41` does — that is the established
idiom in this suite, and it avoids poking the private `_activeBackend` field, for which there is no
setter.

The mock deliberately **throws**. After this task `getSyncMenus` must not consult the backend at all,
so a throwing stub is a real regression pin: if anyone reintroduces a backend condition, the import
comes back, the stub fires and the test fails loudly. Asserting "present on SQLite" would be vacuous
once the code stops looking.

```js
let mockGlobalContext;

jest.mock('../../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => mockGlobalContext},
}));

const StaticMenuItemFactory = require('../../../src/views/menu/StaticMenuItemFactory').default;
const OrganisationConfigService = require('../../../src/service/OrganisationConfigService').default;

function contextWithEncryption(encrypted) {
    return {
        getService: (type) => {
            if (type === OrganisationConfigService) return {isDbEncryptionEnabled: () => encrypted};
            throw new Error(`unexpected service ${String(type)}`);
        }
    };
}

const names = (context) => StaticMenuItemFactory.getSyncMenus(context).map(item => item.uniqueName);

describe('StaticMenuItemFactory.getSyncMenus', () => {
    beforeEach(() => {
        mockGlobalContext = {
            getActiveBackend: () => {
                throw new Error('getSyncMenus must not depend on the active backend');
            }
        };
    });

    it('offers fast sync setup without consulting the backend', () => {
        expect(names(contextWithEncryption(false))).toContain('uploadCatchmentDatabase');
    });

    it('hides fast sync setup under DB encryption', () => {
        expect(names(contextWithEncryption(true))).not.toContain('uploadCatchmentDatabase');
    });

    it('keeps entitySyncStatus regardless of encryption', () => {
        expect(names(contextWithEncryption(true))).toContain('entitySyncStatus');
        expect(names(contextWithEncryption(false))).toContain('entitySyncStatus');
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn jest test/views/menu/StaticMenuItemFactoryTest.js --selectProjects unit`
Expected: the first test FAILS — the current code calls `getActiveBackend()`, so the throwing stub fires. That failure *is* the proof the condition is still there.

- [ ] **Step 3: Remove the backend condition**

```js
static getSyncMenus(context) {
    const hideUploadCatchmentDatabase = context.getService(OrganisationConfigService).isDbEncryptionEnabled();
    return SyncMenus.filter(menuItem =>
        !(menuItem.uniqueName === "uploadCatchmentDatabase" && hideUploadCatchmentDatabase));
}
```

Delete the stale comment — it now states the opposite of what the code does. Remove the `GlobalContext` and `BACKENDS` imports if nothing else in the file uses them; leave them if something does.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn jest test/views/menu/StaticMenuItemFactoryTest.js --selectProjects unit`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/openchs-android/src/views/menu/StaticMenuItemFactory.js packages/openchs-android/test/views/menu/StaticMenuItemFactoryTest.js
git commit -m "#2140 | Offer fast sync setup on the SQLite backend"
```

---

### Task 2: Produce and upload the SQLite dump

**Files:**
- Modify: `packages/openchs-android/src/service/MediaQueueService.js:33-36` and `:111-117`
- Modify: `packages/openchs-android/src/service/BackupRestoreSqliteService.js` (add `backup`)
- Modify: `packages/openchs-android/src/action/MenuActions.js:45-49`
- Test: `packages/openchs-android/test/service/MediaQueueServiceTest.js`, `packages/openchs-android/test/service/BackupRestoreSqliteServiceTest.js`

**Interfaces:**
- Consumes: the menu item made reachable in Task 1.
- Produces: `MediaQueueService.DumpType.CatchmentSqlite`, and `BackupRestoreSqliteService.backup(dumpType, cb)` with the same `cb(percentDone, message, avniError)` contract as `BackupRestoreRealmService.backup`, emitting `"backupCompleted"` / `"backupFailed"` at 100.

The server route added for this is `GET /media/fastSyncUpload`, which returns a signed PUT URL and derives the key itself. The client sends no key and no catchment.

- [ ] **Step 1: Write the failing route-mapping test**

**Assertion style:** `test/service/BackupRestoreSqliteServiceTest.js` uses Jest `expect`, so every
test below does too. A few files elsewhere in `test/` use chai; do not mix the two inside one file.

In `packages/openchs-android/test/service/MediaQueueServiceTest.js`:

```js
it('sends a SQLite catchment dump to the fast sync upload route', () => {
    const calls = [];
    const service = mediaQueueServiceWithGet(url => calls.push(url));
    service.getDumpUploadUrl(MediaQueueService.DumpType.CatchmentSqlite, 'ignored.db');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/\/media\/fastSyncUpload$/);
});

it('still sends a Realm catchment dump to the realm backup route', () => {
    const calls = [];
    const service = mediaQueueServiceWithGet(url => calls.push(url));
    service.getDumpUploadUrl(MediaQueueService.DumpType.Catchment, 'ignored.realm');
    expect(calls[0]).toMatch(/\/media\/mobileDatabaseBackupUrl\/upload$/);
});
```

`test/service/MediaQueueServiceTest.js` does not exist yet — create it. Stub the module-level helper the way `test/service/BackupRestoreSqliteServiceTest.js` does:
`jest.mock('../../src/framework/http/requests', () => ({get: (...args) => mockGet(...args)}));` with `mockGet` declared as a mutable `let` above the mock, which is the pattern Jest's hoisting requires.

- [ ] **Step 2: Run to verify it fails**

Run: `yarn jest test/service/MediaQueueServiceTest.js --selectProjects unit`
Expected: FAIL — `DumpType.CatchmentSqlite` is undefined, so the call falls through and returns `undefined`.

- [ ] **Step 3: Add the dump type and its route**

```js
static DumpType = {
    Catchment: 'catchment',
    CatchmentSqlite: 'catchmentSqlite',
    Adhoc: 'Adhoc'
}
```

```js
getDumpUploadUrl(dumpType, fileName) {
    const serverUrl = this.getServerUrl();
    if (dumpType === MediaQueueService.DumpType.Catchment)
        return get(`${serverUrl}/media/mobileDatabaseBackupUrl/upload`, false, false);
    else if (dumpType === MediaQueueService.DumpType.CatchmentSqlite)
        return get(`${serverUrl}/media/fastSyncUpload`, false, false);
    else if (dumpType === MediaQueueService.DumpType.Adhoc)
        return get(`${serverUrl}/media/uploadUrl/${fileName}`, false, false);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `yarn jest test/service/MediaQueueServiceTest.js --selectProjects unit`
Expected: PASS.

- [ ] **Step 5: Write the failing backup test**

In `packages/openchs-android/test/service/BackupRestoreSqliteServiceTest.js`:

```js
it('copies the live SQLite database and uploads it as a SQLite catchment dump', async () => {
    const copied = [];
    const uploaded = [];
    const service = serviceWith({
        db: {writeCopyTo: (config) => copied.push(config.path)},
        mediaQueueService: {
            getDumpUploadUrl: (dumpType) => {
                uploaded.push(dumpType);
                return Promise.resolve('https://s3/put');
            },
            uploadToUrl: () => Promise.resolve()
        }
    });

    const messages = [];
    await service.backup(MediaQueueService.DumpType.CatchmentSqlite,
        (percent, message) => messages.push([percent, message]));

    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatch(/\.db$/);
    expect(uploaded).toEqual([MediaQueueService.DumpType.CatchmentSqlite]);
    expect(messages[messages.length - 1]).toEqual([100, 'backupCompleted']);
});

it('reports backupFailed rather than throwing when the copy fails', async () => {
    const service = serviceWith({
        db: {writeCopyTo: () => {throw new Error('disk full');}}
    });
    const messages = [];
    await service.backup(MediaQueueService.DumpType.CatchmentSqlite,
        (percent, message) => messages.push([percent, message]));
    expect(messages[messages.length - 1]).toEqual([100, 'backupFailed']);
});
```

That file already has a full harness at the top — `jest.mock` blocks for `react-native-fs`, `react-native-zip-archive`, `General`, `BaseService`, `SettingsService`, `MediaService` and `EntitySyncStatusService`, plus a `mockGet` indirection. Extend it; do not add a second harness.

**You must add two mocks for this task:** `react-native-zip-archive` is currently mocked as `{unzip}` only, so add `zip`; and `MediaQueueService` needs a mock exposing `getDumpUploadUrl` and `foregroundUpload`. Without the first, `zip` is `undefined` at call time and the failure is reported as a backup failure rather than a missing mock, which is slow to diagnose.

- [ ] **Step 6: Run to verify it fails**

Run: `yarn jest test/service/BackupRestoreSqliteServiceTest.js --selectProjects unit`
Expected: FAIL — `service.backup is not a function`.

- [ ] **Step 7: Implement `backup`**

Add to `BackupRestoreSqliteService`, mirroring `BackupRestoreRealmService.backup` in shape and in its `cb` contract. `SqliteProxy.writeCopyTo` already runs `PRAGMA wal_checkpoint(TRUNCATE)`, disables FK enforcement for the copy and honours `config.encryptionKey`, so no extra checkpoint logic is needed.

These are the helpers `BackupRestoreRealmService._performFullBackup` uses, verbatim: `zip` from
`react-native-zip-archive`, `mediaQueueService.foregroundUpload(url, destZipFile, progressCb)`,
`removeBackupFile`, `FileSystem.getBackupDir()`, and `this._toAvniError(error)` for the failure
callback. Import them the same way that file does. The percentage ramp and the message strings
(`"backupUploading"`, `"backupCompleted"`, `"backupFailed"`) are what `MenuView.startUploadDatabase`
already switches on, so they must match exactly.

```js
backup(dumpType, cb) {
    const fileName = `${General.randomUUID()}.db`;
    const destFile = `${FileSystem.getBackupDir()}/${fileName}`;
    const destZipFile = `${destFile}.zip`;
    const mediaQueueService = this.getService(MediaQueueService);

    return Promise.resolve()
        .then(() => {
            // SqliteProxy.writeCopyTo already checkpoints the WAL and disables FK enforcement for
            // the copy, so the copy is consistent without extra work here.
            this.db.writeCopyTo({path: destFile});
        })
        .then(() => zip(destFile, destZipFile))
        .then(() => cb(10, "backupUploading"))
        .then(() => mediaQueueService.getDumpUploadUrl(dumpType, fileName))
        .then((url) => mediaQueueService.foregroundUpload(url, destZipFile, (written, total) => {
            cb(10 + (97 - 10) * (written / total), "backupUploading");
        }))
        .then(() => removeBackupFile(destFile))
        .then(() => removeBackupFile(destZipFile))
        .then(() => cb(100, "backupCompleted"))
        .catch((error) => {
            General.logError("BackupRestoreSqliteService", error);
            removeBackupFile(destFile).catch(() => {});
            removeBackupFile(destZipFile).catch(() => {});
            cb(100, "backupFailed", this._toAvniError(error));
        });
}
```

`_toAvniError` lives on the Realm service. Either lift it to a shared helper both services import, or
copy the three lines — do not leave `BackupRestoreSqliteService` without it, since
`MenuView.showBackupFailedAlert` calls `avniError.getDisplayMessage()` on whatever arrives.

- [ ] **Step 8: Run to verify it passes**

Run: `yarn jest test/service/BackupRestoreSqliteServiceTest.js --selectProjects unit`
Expected: PASS.

- [ ] **Step 9: Dispatch to the right service by backend**

`src/action/MenuActions.js:45-49` currently always uses the Realm service:

```js
if (action.dumpType === MediaQueueService.DumpType.Adhoc) {
    context.get(AppInfoUploadService).upload(cb);
} else {
    context.get(BackupRestoreRealmService).backup(action.dumpType, cb);
}
```

Replace the `else` branch so the active backend picks both the service and the dump type:

```js
if (action.dumpType === MediaQueueService.DumpType.Adhoc) {
    context.get(AppInfoUploadService).upload(cb);
} else if (GlobalContext.getInstance().getActiveBackend() === BACKENDS.SQLITE) {
    context.get(BackupRestoreSqliteService).backup(MediaQueueService.DumpType.CatchmentSqlite, cb);
} else {
    context.get(BackupRestoreRealmService).backup(action.dumpType, cb);
}
```

`MenuView.uploadCatchmentDatabase()` still passes `DumpType.Catchment` and still calls
`getCatchmentUploadBlockers()` first — leave both alone. The backend substitution happens here, at
one point, so the guard cannot be bypassed by the new path.

**Deviation from the spec, deliberate.** The spec's client section says to select the service in
`MenuView.uploadCatchmentDatabase()`. Doing it there would put the choice above the guard and give
the two upload entry points (`uploadCatchmentDatabase` and `uploadAppInfo`) two different shapes.
`MenuActions.onBackupDump` is where the service is actually resolved today, and it is below the
guard, so the substitution goes here instead. Same outcome, one seam rather than two.

- [ ] **Step 10: Add the guard-parity test**

```js
it('blocks the SQLite upload for the same reasons as the Realm upload', () => {
    const blocked = {lastSyncCompleted: false, hasUnsyncedTxData: false, hasPendingReset: false};
    expect(catchmentUploadBlockers(blocked)).toEqual(['uploadCatchmentDatabaseLocalOneSyncNeeded']);
});
```

This asserts the guard is backend-independent, which is why Step 9 substitutes below it rather than beside it. Put it in the existing `CatchmentUploadGuard` test file if one exists, otherwise alongside the backup tests.

- [ ] **Step 11: Run the full suite**

Run: `make test`
Expected: no new failures.

- [ ] **Step 12: Commit**

```bash
git add packages/openchs-android/src/service/MediaQueueService.js packages/openchs-android/src/service/BackupRestoreSqliteService.js packages/openchs-android/src/action/MenuActions.js packages/openchs-android/test
git commit -m "#2140 | Upload the SQLite database as a fast sync dump"
```

---

### Task 3: Restore by tier — assert identity, or correct it

**Files:**
- Modify: `packages/openchs-android/src/service/BackupRestoreSqliteService.js` (`restore`, `:69` onward, and the identity check at `:109-115`)
- Test: `packages/openchs-android/test/service/BackupRestoreSqliteServiceTest.js`

**Interfaces:**
- Consumes: nothing from Tasks 1-2.
- Produces: no new exports; `restore(cb)` keeps its existing contract, including `cb(100, "restoreNoSqliteDump")` when nothing is available, which `LoginActions.restoreDump` relies on to fall through to Realm.

The server routes replacing `mobileDatabaseSqliteSnapshotUrl`:

| Route | Returns |
|---|---|
| `GET /media/fastSyncDownload/exists` | `"true"` / `"false"` |
| `GET /media/fastSyncDownload` | `{"url": "...", "tier": "perUser" \| "catchment" \| "snapshot"}` |

**Why the tier matters.** `restore()` currently reads `user_info.username` from the downloaded database and throws unless it equals `settings.userId`. That check is correct for `perUser` and `snapshot` artifacts, which are generated for one user — a mismatch there means a mis-keyed file. A `catchment` artifact is uploaded by one user and restored by a peer, so the same check rejects it every time, which is why the catchment tier does not work today. Realm never asserts identity on a restored dump; it captures the restoring user's identity before the swap and writes it back afterwards (`BackupRestoreRealmService.restore` `:198-199`, `:279`, `:292`). The SQLite path takes the same approach for `catchment` only.

- [ ] **Step 1: Write the failing tests**

```js
it('rejects a per-user artifact whose username does not match', async () => {
    const service = serviceWith({
        downloadTier: 'perUser',
        snapshotUsername: 'someone.else',
        settingsUserId: 'aw@org'
    });
    const messages = [];
    await service.restore((p, m, failed) => messages.push([p, m, failed]));
    expect(messages[messages.length - 1].slice(0, 3)).toEqual([100, 'restoreFailed', true]);
});

it('rejects a snapshot artifact whose username does not match', async () => {
    const service = serviceWith({
        downloadTier: 'snapshot',
        snapshotUsername: 'someone.else',
        settingsUserId: 'aw@org'
    });
    const messages = [];
    await service.restore((p, m, failed) => messages.push([p, m, failed]));
    expect(messages[messages.length - 1].slice(0, 3)).toEqual([100, 'restoreFailed', true]);
});

it('accepts a catchment artifact uploaded by a peer and stamps the local identity', async () => {
    const saved = [];
    const service = serviceWith({
        downloadTier: 'catchment',
        snapshotUsername: 'peer.in.same.catchment',
        settingsUserId: 'aw@org',
        userInfoService: {saveOrUpdate: (entity) => saved.push(entity)}
    });
    const messages = [];
    await service.restore((p, m) => messages.push([p, m]));
    expect(messages[messages.length - 1]).toEqual([100, 'restoreComplete']);
    expect(saved).toHaveLength(1);
    expect(saved[0].username).toEqual('aw@org');
});

it('fails closed when the download response carries no tier', async () => {
    const service = serviceWith({
        downloadTier: undefined,
        snapshotUsername: 'peer.in.same.catchment',
        settingsUserId: 'aw@org'
    });
    const messages = [];
    await service.restore((p, m, failed) => messages.push([p, m, failed]));
    expect(messages[messages.length - 1].slice(0, 3)).toEqual([100, 'restoreFailed', true]);
});
```

The fourth test is the important one: an unknown tier must not fall into the overwrite branch.

**Extend the requests mock first.** `test/service/BackupRestoreSqliteServiceTest.js` currently mocks
the module as `({get: (...args) => mockGet(...args)})`. `restore()` is about to call `getJSON`, which
would be `undefined`. Add it alongside `get`, with its own `mockGetJSON` indirection, before writing
the tests above — otherwise every one of them fails with a `TypeError` that looks like a logic bug.

- [ ] **Step 2: Run to verify they fail**

Run: `yarn jest test/service/BackupRestoreSqliteServiceTest.js --selectProjects unit`
Expected: the catchment test FAILS with the existing user-mismatch error; the tier-less test FAILS or passes for the wrong reason.

- [ ] **Step 3: Move to the preference-order routes**

Replace the two `mobileDatabaseSqliteSnapshotUrl` calls at `:86` and `:93`:

```js
const existsResponse = await get(`${serverURL}/media/fastSyncDownload/exists`);
if (existsResponse !== 'true') {
    General.logInfo('BackupRestoreSqliteService', 'No fast sync database available; falling through');
    cb(100, 'restoreNoSqliteDump');
    return;
}

const {url, tier} = await getJSON(`${serverURL}/media/fastSyncDownload`) || {};
if (!url || !TIERS.includes(tier)) {
    throw new Error(`Fast sync download response is not usable: tier='${tier}'`);
}
```

**Use `getJSON`, not `get`.** `src/framework/http/requests.js:158` shows `get` returns text via
`_getText` while `getJSON:162` returns the parsed body. The old snapshot route returned a bare URL
string, which is why `restore()` currently uses `get`; the new download route returns an object.
`BackupRestoreRealmService` already imports both from the same module.

with, at module scope:

```js
const PER_USER_TIER = 'perUser';
const CATCHMENT_TIER = 'catchment';
const SNAPSHOT_TIER = 'snapshot';
const TIERS = [PER_USER_TIER, CATCHMENT_TIER, SNAPSHOT_TIER];
```

- [ ] **Step 4: Branch the identity handling on the tier**

Replace the unconditional check at `:109-115`:

```js
cb(85, 'restoringDb');
const artifactUsername = await this._readSnapshotUsername(dbEntry.path, unzipDir);
const localUsername = settingsService.getSettings().userId;
if (tier !== CATCHMENT_TIER && (!artifactUsername || artifactUsername !== localUsername)) {
    throw new Error(
        `SQLite snapshot user mismatch: snapshot.user_info.username='${artifactUsername}', settings.userId='${localUsername}'`
    );
}
```

A catchment dump is a peer's database by design, so its embedded username proves nothing and is corrected below rather than asserted.

- [ ] **Step 5: Stamp the local identity after the swap**

After the existing `onRestoreCompleted()` block — the point at which the beans are wired to SQLite, which the file already documents — and alongside the existing Settings overlay:

```js
if (tier === CATCHMENT_TIER) {
    this._stampLocalIdentity(localUsername);
}
```

```js
// A catchment dump carries the uploader's user_info row. Realm has always corrected this after
// the swap rather than rejecting the dump (BackupRestoreRealmService._restoreUserInfo); without
// it the device would run as the uploader.
_stampLocalIdentity(username) {
    const userInfoService = this.getService(UserInfoService);
    const existing = userInfoService.getUserInfo();
    userInfoService.saveOrUpdate(UserInfo.fromResource({
        username,
        organisationName: existing ? existing.organisationName : 'dummy',
        name: username
    }));
}
```

`BackupRestoreRealmService:199` builds it as `UserInfo.fromResource({username: prevSettings.userId, organisationName: 'dummy', name: prevSettings.userId})` — it deliberately passes a placeholder organisation name because the restore overwrites the row wholesale and the next sync corrects it. Carrying `existing.organisationName` as above is strictly better than `'dummy'`; keep it, and fall back to `'dummy'` only when there is no existing row.

- [ ] **Step 6: Run to verify they pass**

Run: `yarn jest test/service/BackupRestoreSqliteServiceTest.js --selectProjects unit`
Expected: PASS, including the three pre-existing restore tests.

- [ ] **Step 7: Update the file's header comment**

The block comment at `:25` describes step 4 as an unconditional identity check. Rewrite that one line to say the check applies to per-user and snapshot artifacts and that a catchment artifact has its identity corrected instead. Do not add a new paragraph.

- [ ] **Step 8: Run the full suite**

Run: `make test`
Expected: no new failures.

- [ ] **Step 9: Commit**

```bash
git add packages/openchs-android/src/service/BackupRestoreSqliteService.js packages/openchs-android/test/service/BackupRestoreSqliteServiceTest.js
git commit -m "#2140 | Restore a fast sync database according to its tier"
```

---

## Device testing

Unit tests cannot cover the file swap or the S3 round trip. After Task 3, on a real device (per the project's testing standard — uninstall before reinstall, do not judge from an emulator):

1. **Per-user upload and restore.** A user in an org with a custom group. Set up fast sync; confirm the object lands on `fastsync/<username>/fastsync.db`. Clear app data, log in, confirm the restore succeeds and the app syncs.
2. **Catchment upload, peer restore.** Two users, one catchment, an org with only default groups and no row-level filtering, both in the SQLite Migration group and neither an admin. A uploads; B clears data and logs in; **B must restore successfully and end up as B**. Check `user_info.username` on B's device is B. This is the case that is broken today and the reason for the card.
3. **Realm untouched.** A Realm user uploads and restores; confirm `MobileDbBackup-<catchment>` is written and no SQLite object is.
4. **Removed from the migration group.** Remove a user from SQLite Migration, sync, confirm they get the Realm path or a full sync and never a SQLite artifact.
5. **Blocked upload.** With unsynced local data, confirm the SQLite upload is refused with the same message as Realm.

## Out of scope

- Retiring snapshot-server (#1919). Key 4 keeps its own producer and namespace.
- The two avni-server cards from the review residuals (`removeUserFromGroup` voiding `Everyone`; `GroupsService.saveGroup` omitting `SQLITE_MIGRATION`). Filed after this work.
- Any change to the Realm restore path, including adding a format assertion to it.
- Any change to sync retry or timeout behaviour.
