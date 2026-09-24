# Fast-sync upload: avni-server contract — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the server contract that lets a SQLite device upload a fast-sync database, keyed per user whenever the user's data is not purely catchment-shaped, and serve the right artifact back in preference order.

**Architecture:** Three new routes on the existing `MediaController`, plus a key-derivation helper. The key is always computed from `UserContextHolder` and never from request input, so a per-user artifact is unreadable by anyone but its owner by construction. A fourth change closes avni-server#1059, which would otherwise hand a Realm dump to a SQLite device.

**Tech Stack:** Java 17, Spring Boot, JPA, AWS SDK v1 (`com.amazonaws.HttpMethod`), JUnit 4, Mockito.

**Spec:** `docs/superpowers/specs/2026-09-24-sqlite-fast-sync-upload-design.md` (in the avni-client repo)

**Before starting:** file the avni-server issue and substitute its number for `<server-issue>` in
the commit messages below. Task 4 already carries its real number, #1059.

**Repo:** avni-server. This plan lives in avni-client only because avni-server has no `docs/superpowers` directory; move it if one is created.

## Global Constraints

- Storage keys, verbatim from the spec:
  - Realm catchment: `MobileDbBackup-<catchmentUuid>` — **existing, must not be written by any new route**
  - SQLite catchment: `MobileDbBackupSqlite-<catchmentUuid>`
  - SQLite per-user: `fastsync/<username>/fastsync.db`
  - snapshot-server: `snapshots/<username>/snapshot.db` — **existing, must not be written by any new route**
- `perUser = hasSyncAttributes || orgHasDirectlyAssignableSubjectType || orgHasUserSubjectType`
- Every new route is gated on membership of the `SQLITE_MIGRATION_GROUP`, via the existing `currentUserIsInSqliteMigrationGroup()`.
- Keys are derived from `UserContextHolder` only. No route accepts a username, catchment or key as a parameter.
- Download preference: per-user users get key 3 → key 4 → none. Catchment users get key 2 → key 4 → none. A `perUser` user is never offered key 2.
- Follow the existing file's conventions: `@RequestMapping`, `@PreAuthorize(value = "hasAnyAuthority('user')")`, `@Transactional(readOnly = true)`, and `ResponseEntity<String>` returns.

## Review Focus

Five conditions the spec implies that no task's happy path exercises. Each has a test in the task that owns the code.

1. **A user with no catchment.** `mobileDatabaseBackupFile()` throws `ValidationException("NoCatchmentFound")`. A catchment-keyed upload must fail the same recognisable way rather than producing `MobileDbBackupSqlite-null`. → Task 2.
2. **A username containing a path separator or `..`.** Keys are interpolated into an S3 path; a username like `a/../b` would escape the prefix. → Task 1.
3. **An organisation with a directly-assignable subject type but a user with no assignments.** Must still be `perUser` — the org-level shape is the test, not the user's row count. → Task 1.
4. **A user outside the migration group calling the download routes.** Must get `false`/404 rather than someone else's artifact, so the client falls through to the Realm path. → Task 3.
5. **Both per-user and catchment artifacts absent.** `exists` must return `false` cleanly rather than 500, so the client proceeds to a full sync. → Task 3.

---

### Task 1: The `perUser` predicate

**Files:**
- Create: `avni-server-api/src/main/java/org/avni/server/service/FastSyncKeyService.java`
- Test: `avni-server-api/src/test/java/org/avni/server/service/FastSyncKeyServiceTest.java`

**Interfaces:**
- Consumes: `SubjectTypeRepository.findAllByIsVoidedFalseAndIsDirectlyAssignableTrue()`, `SubjectTypeRepository.findByTypeAndIsVoidedFalse(Subject)`, `User.getSyncSettings()`, `User.SyncSettingKeys`.
- Produces: `FastSyncKeyService.isPerUser(User user)` → `boolean`; `FastSyncKeyService.perUserKey(User user)` → `String`.

- [ ] **Step 1: Write the failing test**

```java
package org.avni.server.service;

import org.avni.server.dao.SubjectTypeRepository;
import org.avni.server.domain.JsonObject;
import org.avni.server.domain.Subject;
import org.avni.server.domain.SubjectType;
import org.avni.server.domain.User;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;

import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.when;
import static org.mockito.MockitoAnnotations.initMocks;

public class FastSyncKeyServiceTest {
    @Mock
    private SubjectTypeRepository subjectTypeRepository;
    private FastSyncKeyService service;

    @Before
    public void setUp() {
        initMocks(this);
        service = new FastSyncKeyService(subjectTypeRepository);
        when(subjectTypeRepository.findAllByIsVoidedFalseAndIsDirectlyAssignableTrue())
                .thenReturn(Collections.emptyList());
        when(subjectTypeRepository.findByTypeAndIsVoidedFalse(Subject.User)).thenReturn(null);
    }

    private User userWithSyncSettings(JsonObject syncSettings) {
        User user = new User();
        user.setUsername("aw@org");
        user.setSyncSettings(syncSettings);
        return user;
    }

    @Test
    public void plainLocationScopedUserIsNotPerUser() {
        assertFalse(service.isPerUser(userWithSyncSettings(new JsonObject())));
    }

    @Test
    public void userWithASyncAttributeIsPerUser() {
        JsonObject syncSettings = new JsonObject()
                .with(User.SyncSettingKeys.syncAttribute1.name(), "abc-concept-uuid");
        assertTrue(service.isPerUser(userWithSyncSettings(syncSettings)));
    }

    @Test
    public void orgWithADirectlyAssignableSubjectTypeMakesEveryUserPerUser() {
        // Review Focus 3. Org shape is the test, not whether this user holds assignments today.
        when(subjectTypeRepository.findAllByIsVoidedFalseAndIsDirectlyAssignableTrue())
                .thenReturn(List.of(new SubjectType()));
        assertTrue(service.isPerUser(userWithSyncSettings(new JsonObject())));
    }

    @Test
    public void orgWithAUserSubjectTypeMakesEveryUserPerUser() {
        when(subjectTypeRepository.findByTypeAndIsVoidedFalse(Subject.User)).thenReturn(new SubjectType());
        assertTrue(service.isPerUser(userWithSyncSettings(new JsonObject())));
    }

    @Test
    public void perUserKeyIsNamespacedByUsername() {
        assertEquals("fastsync/aw@org/fastsync.db", service.perUserKey(userWithSyncSettings(new JsonObject())));
    }

    @Test
    public void rejectsAUsernameThatCouldEscapeThePrefix() {
        // Review Focus 2. The segment is interpolated into an S3 key.
        User user = new User();
        user.setUsername("a/../b");
        assertThrows(IllegalArgumentException.class, () -> service.perUserKey(user));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.service.FastSyncKeyServiceTest"`
Expected: FAIL — `FastSyncKeyService` does not exist (compilation error).

- [ ] **Step 3: Write minimal implementation**

```java
package org.avni.server.service;

import org.avni.server.dao.SubjectTypeRepository;
import org.avni.server.domain.Subject;
import org.avni.server.domain.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import static java.lang.String.format;

@Service
public class FastSyncKeyService {
    private final SubjectTypeRepository subjectTypeRepository;

    @Autowired
    public FastSyncKeyService(SubjectTypeRepository subjectTypeRepository) {
        this.subjectTypeRepository = subjectTypeRepository;
    }

    /**
     * Whether this user's sync is narrowed by anything other than their catchment. Three of the
     * four axes in OperatingIndividualScopeAwareRepository.addSyncStrategyPredicates are per-user,
     * and two of those are organisation properties: when a directly-assignable or User-type subject
     * type exists, every user's sync for it is filtered by their own rows, whether or not they hold
     * any today. A shared catchment dump is wrong for the whole organisation in that case.
     */
    public boolean isPerUser(User user) {
        return hasSyncAttributes(user)
                || !subjectTypeRepository.findAllByIsVoidedFalseAndIsDirectlyAssignableTrue().isEmpty()
                || subjectTypeRepository.findByTypeAndIsVoidedFalse(Subject.User) != null;
    }

    private boolean hasSyncAttributes(User user) {
        if (user.getSyncSettings() == null) return false;
        return user.getSyncSettings().get(User.SyncSettingKeys.syncAttribute1.name()) != null
                || user.getSyncSettings().get(User.SyncSettingKeys.syncAttribute2.name()) != null;
    }

    public String perUserKey(User user) {
        return format("fastsync/%s/fastsync.db", safeSegment(user.getUsername()));
    }

    // Usernames are interpolated into an S3 key. A separator or traversal segment would place the
    // object outside the caller's prefix, which is the whole protection here.
    private String safeSegment(String username) {
        if (username == null || username.isEmpty()
                || username.contains("/") || username.contains("\\") || username.contains("..")) {
            throw new IllegalArgumentException("Username is not usable as a storage key segment");
        }
        return username;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.service.FastSyncKeyServiceTest"`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add avni-server-api/src/main/java/org/avni/server/service/FastSyncKeyService.java \
        avni-server-api/src/test/java/org/avni/server/service/FastSyncKeyServiceTest.java
git commit -m "#<server-issue> | Derive the fast-sync storage key from the user's sync scope"
```

---

### Task 2: Upload route

**Files:**
- Modify: `avni-server-api/src/main/java/org/avni/server/web/MediaController.java`
- Test: `avni-server-api/src/test/java/org/avni/server/web/MediaControllerFastSyncTest.java`

**Interfaces:**
- Consumes: `FastSyncKeyService.isPerUser(User)`, `FastSyncKeyService.perUserKey(User)` from Task 1; the file's existing `currentUserIsInSqliteMigrationGroup()`, `getFileUrlResponse(String, HttpMethod)` and `mobileDatabaseBackupFile()`.
- Produces: `GET /media/fastSyncUpload` returning a signed PUT URL as `ResponseEntity<String>`; private `String sqliteCatchmentKey()`; private `String fastSyncUploadKey()`.

- [ ] **Step 1: Write the failing test**

```java
package org.avni.server.web;

import org.avni.server.domain.User;
import org.avni.server.service.FastSyncKeyService;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.when;
import static org.mockito.MockitoAnnotations.initMocks;

public class MediaControllerFastSyncTest {
    @Mock
    private FastSyncKeyService fastSyncKeyService;

    @Before
    public void setUp() {
        initMocks(this);
    }

    @Test
    public void perUserUserUploadsToTheirOwnKey() {
        User user = new User();
        user.setUsername("aw@org");
        when(fastSyncKeyService.isPerUser(user)).thenReturn(true);
        when(fastSyncKeyService.perUserKey(user)).thenReturn("fastsync/aw@org/fastsync.db");

        assertEquals("fastsync/aw@org/fastsync.db", MediaController.fastSyncUploadKeyFor(user, "cat-uuid", fastSyncKeyService));
    }

    @Test
    public void locationScopedUserUploadsToTheSqliteCatchmentKey() {
        User user = new User();
        user.setUsername("aw@org");
        when(fastSyncKeyService.isPerUser(user)).thenReturn(false);

        assertEquals("MobileDbBackupSqlite-cat-uuid",
                MediaController.fastSyncUploadKeyFor(user, "cat-uuid", fastSyncKeyService));
    }

    @Test
    public void theSqliteCatchmentKeyIsNeverTheRealmOne() {
        User user = new User();
        user.setUsername("aw@org");
        when(fastSyncKeyService.isPerUser(user)).thenReturn(false);

        String key = MediaController.fastSyncUploadKeyFor(user, "cat-uuid", fastSyncKeyService);
        assertEquals("MobileDbBackupSqlite-cat-uuid", key);
        // A SQLite device writing the Realm key would replace the Realm dump and Realm devices
        // would then load a SQLite file into default.realm.
        org.junit.Assert.assertNotEquals("MobileDbBackup-cat-uuid", key);
    }

    @Test
    public void aCatchmentKeyedUploadWithNoCatchmentIsRejected() {
        // Review Focus 1. Without this the key becomes "MobileDbBackupSqlite-null" and every
        // catchmentless user in the organisation shares one object. Same failure the Realm
        // route already produces.
        User user = new User();
        user.setUsername("aw@org");
        when(fastSyncKeyService.isPerUser(user)).thenReturn(false);

        org.avni.server.util.BadRequestError e = org.junit.Assert.assertThrows(
                org.avni.server.util.BadRequestError.class,
                () -> MediaController.fastSyncUploadKeyFor(user, null, fastSyncKeyService));
        assertTrue(e.getMessage().contains("NoCatchmentFound"));
    }

    @Test
    public void aPerUserUserWithNoCatchmentIsFineBecauseTheKeyDoesNotUseIt() {
        User user = new User();
        user.setUsername("aw@org");
        when(fastSyncKeyService.isPerUser(user)).thenReturn(true);
        when(fastSyncKeyService.perUserKey(user)).thenReturn("fastsync/aw@org/fastsync.db");

        assertEquals("fastsync/aw@org/fastsync.db",
                MediaController.fastSyncUploadKeyFor(user, null, fastSyncKeyService));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.web.MediaControllerFastSyncTest"`
Expected: FAIL — `fastSyncUploadKeyFor` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add to `MediaController`, after `sqliteSnapshotRelativeKey()` (around line 214). Inject `FastSyncKeyService` by adding a `private final FastSyncKeyService fastSyncKeyService;` field, a constructor parameter, and the assignment.

```java
    // Static and parameterised so the key decision is testable without a Spring context or a
    // UserContextHolder. The route below supplies the authenticated user and their catchment.
    // Throws BadRequestError rather than ValidationException because the latter is checked, which
    // a static helper cannot raise without forcing a throws clause on every caller.
    static String fastSyncUploadKeyFor(User user, String catchmentUuid, FastSyncKeyService keyService) {
        if (keyService.isPerUser(user)) {
            return keyService.perUserKey(user);
        }
        // Only the catchment branch needs it, so a per-user user with no catchment is still fine.
        if (catchmentUuid == null) {
            throw new BadRequestError("NoCatchmentFound");
        }
        return format("MobileDbBackupSqlite-%s", catchmentUuid);
    }

    private String fastSyncUploadKey() {
        User user = UserContextHolder.getUserContext().getUser();
        String catchmentUuid = user.getCatchment() == null ? null : user.getCatchment().getUuid();
        return fastSyncUploadKeyFor(user, catchmentUuid, fastSyncKeyService);
    }

    @RequestMapping(value = "/media/fastSyncUpload", method = RequestMethod.GET)
    @PreAuthorize(value = "hasAnyAuthority('user')")
    @Transactional(readOnly = true)
    public ResponseEntity<String> generateFastSyncUploadUrl() {
        logger.info("getting fast sync upload url");
        try {
            if (!currentUserIsInSqliteMigrationGroup()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("NotInSqliteMigrationGroup");
            }
            return getFileUrlResponse(fastSyncUploadKey(), HttpMethod.PUT);
        } catch (BadRequestError e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (ValidationException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }
```

Two things this shape buys, both Review Focus item 1: a catchment-keyed upload by a user with no
catchment fails recognisably instead of writing `MobileDbBackupSqlite-null` — which every
catchmentless user in the organisation would then share — and a **per-user** user with no catchment
still succeeds, because their key never uses it.

`getFileUrlResponse` already declares `throws ValidationException`, so that catch stays.

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.web.MediaControllerFastSyncTest"`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add avni-server-api/src/main/java/org/avni/server/web/MediaController.java \
        avni-server-api/src/test/java/org/avni/server/web/MediaControllerFastSyncTest.java
git commit -m "#<server-issue> | Add the fast-sync upload route, keyed per user or per catchment"
```

---

### Task 3: Download routes with the preference order

**Files:**
- Modify: `avni-server-api/src/main/java/org/avni/server/web/MediaController.java`
- Test: `avni-server-api/src/test/java/org/avni/server/web/MediaControllerFastSyncTest.java` (extend)

**Interfaces:**
- Consumes: `FastSyncKeyService` from Task 1; `fastSyncUploadKeyFor` from Task 2; `s3Service.fileExists(String)`; `s3Service.generateMediaUploadUrl(String, HttpMethod)`.
- Produces: `GET /media/fastSyncDownload/exists` → `"true"`/`"false"`; `GET /media/fastSyncDownload` → signed GET URL; `static Optional<String> fastSyncDownloadKeyFor(User, String, FastSyncKeyService, Predicate<String>)`.

- [ ] **Step 1: Write the failing test**

Append to `MediaControllerFastSyncTest`:

```java
    private java.util.Optional<String> resolve(User user, boolean perUser, java.util.Set<String> present) {
        when(fastSyncKeyService.isPerUser(user)).thenReturn(perUser);
        when(fastSyncKeyService.perUserKey(user)).thenReturn("fastsync/aw@org/fastsync.db");
        return MediaController.fastSyncDownloadKeyFor(user, "cat-uuid", fastSyncKeyService, present::contains);
    }

    private User aUser() {
        User user = new User();
        user.setUsername("aw@org");
        return user;
    }

    @Test
    public void perUserUserPrefersTheirOwnUploadOverTheGeneratedSnapshot() {
        java.util.Set<String> present = java.util.Set.of(
                "fastsync/aw@org/fastsync.db", "snapshots/aw@org/snapshot.db");
        assertEquals(java.util.Optional.of("fastsync/aw@org/fastsync.db"), resolve(aUser(), true, present));
    }

    @Test
    public void perUserUserFallsBackToTheGeneratedSnapshot() {
        assertEquals(java.util.Optional.of("snapshots/aw@org/snapshot.db"),
                resolve(aUser(), true, java.util.Set.of("snapshots/aw@org/snapshot.db")));
    }

    @Test
    public void perUserUserIsNeverOfferedTheSharedCatchmentDump() {
        // Falling back to the catchment union would reopen #956 by a different route.
        assertEquals(java.util.Optional.empty(),
                resolve(aUser(), true, java.util.Set.of("MobileDbBackupSqlite-cat-uuid")));
    }

    @Test
    public void locationScopedUserPrefersTheCatchmentDumpOverTheGeneratedSnapshot() {
        java.util.Set<String> present = java.util.Set.of(
                "MobileDbBackupSqlite-cat-uuid", "snapshots/aw@org/snapshot.db");
        assertEquals(java.util.Optional.of("MobileDbBackupSqlite-cat-uuid"), resolve(aUser(), false, present));
    }

    @Test
    public void locationScopedUserFallsBackToTheGeneratedSnapshot() {
        assertEquals(java.util.Optional.of("snapshots/aw@org/snapshot.db"),
                resolve(aUser(), false, java.util.Set.of("snapshots/aw@org/snapshot.db")));
    }

    @Test
    public void nothingPresentResolvesToEmptySoTheClientDoesAFullSync() {
        assertEquals(java.util.Optional.empty(), resolve(aUser(), false, java.util.Set.of()));
    }

    @Test
    public void theRealmDumpIsNeverResolvedForASqliteUser() {
        assertEquals(java.util.Optional.empty(),
                resolve(aUser(), false, java.util.Set.of("MobileDbBackup-cat-uuid")));
    }

    @Test
    public void aUserOutsideTheMigrationGroupIsNotEligibleEvenWhenAnArtifactExists() {
        // Review Focus 4. The group gate is what makes "removed from the SQLite group" work: the
        // client must get false here so it falls through to the Realm path, not someone's SQLite file.
        assertFalse(MediaController.fastSyncEligible(false, java.util.Optional.of("fastsync/aw@org/fastsync.db")));
    }

    @Test
    public void aGroupMemberWithAnArtifactIsEligible() {
        assertTrue(MediaController.fastSyncEligible(true, java.util.Optional.of("fastsync/aw@org/fastsync.db")));
    }

    @Test
    public void aGroupMemberWithNoArtifactIsNotEligible() {
        // Review Focus 5. Must be a clean false so the client proceeds to a full sync.
        assertFalse(MediaController.fastSyncEligible(true, java.util.Optional.empty()));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.web.MediaControllerFastSyncTest"`
Expected: FAIL — `fastSyncDownloadKeyFor` does not exist.

- [ ] **Step 3: Write minimal implementation**

```java
    // The order is the whole contract, so it is expressed once, here, and both routes use it.
    // `present` is injected rather than calling s3Service directly so the ordering is testable
    // without stubbing storage.
    static java.util.Optional<String> fastSyncDownloadKeyFor(User user, String catchmentUuid,
                                                             FastSyncKeyService keyService,
                                                             java.util.function.Predicate<String> present) {
        java.util.List<String> candidates = keyService.isPerUser(user)
                ? java.util.List.of(keyService.perUserKey(user), snapshotKeyFor(user))
                : java.util.List.of(format("MobileDbBackupSqlite-%s", catchmentUuid), snapshotKeyFor(user));
        return candidates.stream().filter(present).findFirst();
    }

    private static String snapshotKeyFor(User user) {
        return format("snapshots/%s/snapshot.db", user.getUsername());
    }

    private java.util.Optional<String> resolveFastSyncDownloadKey() {
        User user = UserContextHolder.getUserContext().getUser();
        String catchmentUuid = user.getCatchment() == null ? null : user.getCatchment().getUuid();
        return fastSyncDownloadKeyFor(user, catchmentUuid, fastSyncKeyService, s3Service::fileExists);
    }

    // Extracted so the group gate is tested independently of storage and UserContextHolder.
    static boolean fastSyncEligible(boolean inSqliteMigrationGroup, java.util.Optional<String> resolvedKey) {
        return inSqliteMigrationGroup && resolvedKey.isPresent();
    }

    @RequestMapping(value = "/media/fastSyncDownload/exists", method = RequestMethod.GET)
    @PreAuthorize(value = "hasAnyAuthority('user')")
    @Transactional(readOnly = true)
    public ResponseEntity<String> fastSyncDownloadExists() {
        logger.info("checking whether a fast sync database exists");
        try {
            boolean eligible = fastSyncEligible(
                    currentUserIsInSqliteMigrationGroup(), resolveFastSyncDownloadKey());
            return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(Boolean.toString(eligible));
        } catch (Exception e) {
            logger.error(e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBodyBuilder.getErrorBody(e));
        }
    }

    @RequestMapping(value = "/media/fastSyncDownload", method = RequestMethod.GET)
    @PreAuthorize(value = "hasAnyAuthority('user')")
    @Transactional(readOnly = true)
    public ResponseEntity<String> generateFastSyncDownloadUrl() {
        logger.info("getting fast sync download url");
        try {
            if (!currentUserIsInSqliteMigrationGroup()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("NotInSqliteMigrationGroup");
            }
            java.util.Optional<String> key = resolveFastSyncDownloadKey();
            if (key.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("NoFastSyncDatabase");
            }
            URL url = s3Service.generateMediaUploadUrl(key.get(), HttpMethod.GET);
            return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(url.toString());
        } catch (AccessDeniedException e) {
            logger.error(e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorBodyBuilder.getErrorMessageBody(e));
        } catch (Exception e) {
            logger.error(e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBodyBuilder.getErrorBody(e));
        }
    }
```

`exists` returning `false` for a non-member and for "nothing present" covers Review Focus items 4 and 5: in both cases the client falls through rather than erroring.

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.web.MediaControllerFastSyncTest"`
Expected: PASS, 15 tests (Task 2's 5 plus these 10 — same file).

- [ ] **Step 5: Commit**

```bash
git add avni-server-api/src/main/java/org/avni/server/web/MediaController.java \
        avni-server-api/src/test/java/org/avni/server/web/MediaControllerFastSyncTest.java
git commit -m "#<server-issue> | Serve the fast-sync database in preference order"
```

---

### Task 4: Close avni-server#1059

**Files:**
- Modify: `avni-server-api/src/main/java/org/avni/server/web/MediaController.java:153-163`
- Test: `avni-server-api/src/test/java/org/avni/server/web/MediaControllerFastSyncTest.java` (extend)

**Interfaces:**
- Consumes: the existing `currentUserIsInSqliteMigrationGroup()`.
- Produces: no new signature; `mobileDatabaseBackupExists()` gains the group check.

The Realm route reports the Realm dump to anyone. `LoginActions.restoreDump()` on the client falls through to `restoreRealmDump()` whenever no SQLite artifact exists, so a migrated user can be handed a Realm file. Today that wastes a download; once Task 2 ships it is a format mismatch written into `default.realm`.

- [ ] **Step 1: Write the failing test**

```java
    @Test
    public void aSqliteUserIsNotOfferedTheRealmDump() {
        // #1059. Reachable via LoginActions.restoreDump falling through to restoreRealmDump.
        assertFalse(MediaController.realmDumpIsOfferable(true));
    }

    @Test
    public void aRealmUserIsStillOfferedTheRealmDump() {
        assertTrue(MediaController.realmDumpIsOfferable(false));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.web.MediaControllerFastSyncTest"`
Expected: FAIL — `realmDumpIsOfferable` does not exist.

- [ ] **Step 3: Write minimal implementation**

```java
    // A migrated user must never be offered the Realm dump: the client's restoreDump falls through
    // to the Realm path whenever no SQLite artifact exists, and the file is the wrong format.
    static boolean realmDumpIsOfferable(boolean inSqliteMigrationGroup) {
        return !inSqliteMigrationGroup;
    }
```

Then change `mobileDatabaseBackupExists()` (line 153-163) so its body reads:

```java
            boolean offerable = realmDumpIsOfferable(currentUserIsInSqliteMigrationGroup())
                    && s3Service.fileExists(mobileDatabaseBackupFile());
            return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(Boolean.toString(offerable));
```

Leave `/download` and `/upload` on that route untouched: a Realm user still needs both, and a SQLite user never reaches `/download` because `exists` now says `false`.

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.web.MediaControllerFastSyncTest"`
Expected: PASS, 17 tests (15 plus these 2 — same file).

- [ ] **Step 5: Run the whole web test package to check nothing regressed**

Run: `./gradlew :avni-server-api:test --tests "org.avni.server.web.*"`
Expected: PASS. `MediaControllerRoutingTest` in particular must still pass.

- [ ] **Step 6: Commit**

```bash
git add avni-server-api/src/main/java/org/avni/server/web/MediaController.java \
        avni-server-api/src/test/java/org/avni/server/web/MediaControllerFastSyncTest.java
git commit -m "#1059 | Stop offering the Realm dump to a migrated user"
```

---

## Manual verification before the client work starts

The client plan is written against these routes, so confirm them on prerelease first.

- [ ] As a user in the SQLite Migration group **with** a sync attribute: `GET /media/fastSyncUpload` returns a signed PUT whose key contains `fastsync/<username>/`.
- [ ] As a user in the group **without** per-user scoping, in an org with no directly-assignable or User subject type: the key is `MobileDbBackupSqlite-<catchment>`.
- [ ] As a user **outside** the group: `GET /media/fastSyncDownload/exists` returns `false`, and `/media/mobileDatabaseBackupUrl/exists` still returns the Realm answer.
- [ ] As a user **inside** the group: `/media/mobileDatabaseBackupUrl/exists` now returns `false` even when `MobileDbBackup-<catchment>` exists in the bucket.
- [ ] Confirm `MobileDbBackup-<catchment>` and `snapshots/<username>/snapshot.db` are byte-identical before and after all of the above — no new route writes either.
