# Realm DB EOL Risk Assessment & Migration Plan for avni-client

## Executive Summary

**Decision (February 2026): BEGIN MIGRATION PREPARATION - Abstraction Layer Required**

Migration from Realm should begin with **immediate preparation phase**. The community package hasn't been published in 6 months (already exceeding our trigger threshold), and there's no guaranteed support for future RN/OS updates. While Realm currently works, the **DatabaseInterface abstraction layer is now critical** to avoid being blocked by future incompatibilities.

**References:**
- [realm-js community branch](https://github.com/realm/realm-js/blob/community/packages/realm/README.md)
- [realm npm community version](https://www.npmjs.com/package/realm/v/community)

---

## Current Status

| Aspect | Status |
|--------|--------|
| **Realm Version** | 12.14.2 |
| **React Native** | 0.76.5 |
| **Production Issues** | None |
| **Data per device** | Hundreds to few thousands |
| **Unsynced data** | Typically 5-10 records |

---

## Deferral Rationale

### Why Defer?

| Factor | Migration | Deferral |
|--------|-----------|----------|
| Immediate risk | None (Realm working) | ✅ None |
| Effort | 1,160+ hours | ✅ ~0 hours |
| User disruption | Migration UX required | ✅ None |
| Developer bandwidth | 10+ months consumed | ✅ Available for features |
| Future flexibility | High | Medium (can migrate later) |

### Resource Constraints
- **Team**: 1 developer (with AI assistance)
- **Migration estimate**: 1,160+ hours (~10 months full-time)
- **Stakeholder pressure**: None (prefer stability)
- **Contractor availability**: None

---

## Monitoring & Triggers

### Monitoring Checklist

- [ ] **Monthly**: Check [realm-js GitHub](https://github.com/realm/realm-js) for activity/issues
- [ ] **Quarterly**: Test Realm compatibility with latest RN versions
- [ ] **On RN upgrade**: Verify Realm native modules still work
- [ ] **On security advisory**: Assess if community patch available within 30 days

### Migration Triggers

Revisit migration if **ANY** occur:

| Trigger | Action |
|---------|--------|
| RN 0.78+ breaks Realm native modules | Evaluate migration timeline |
| Critical CVE with no community patch in 30 days | Emergency migration planning |
| realm-js repository archived | Begin migration immediately |
| Apple/Google SDK requirements break Realm | Evaluate migration timeline |
| Performance degradation in production | Investigate and assess |

### 🔴 Community Support Risk (February 2026)

**Current state**: Minimal activity on [realm-js community branch](https://github.com/realm/realm-js/commits/community)
- Last GitHub commits: October 2025 (~3.5 months ago)
- Last npm publish: [August 2025](https://www.npmjs.com/package/realm/v/community) (~6 months ago)
- **Already exceeds 6-month threshold** for migration trigger
- Primary maintainer: Kræn Hansen (former MongoDB employee)
- **No guaranteed support** for RN 0.77+, Android 16, iOS 19

**Critical Risk**: If a major incompatibility arises (RN upgrade, OS update, security CVE), there is **no fallback**. We would be blocked until:
1. Community provides a fix (uncertain timeline), OR
2. We emergency-migrate to another database (10+ months)

**Assessment**: This is a **blocking risk** that requires immediate mitigation planning.

---

## Revised Recommendation

Given the community support risk, the deferral should be **conditional**:

### Immediate Actions (Next 4-6 weeks)

| Task | Effort | Priority | Rationale |
|------|--------|----------|----------|
| Create `DatabaseInterface` abstraction layer | 40-80 hours | **HIGH** | Enables faster migration if needed |
| Document current Realm query patterns | 4-8 hours | Medium | Aids future migration |
| Test Realm with RN 0.77 beta (when available) | 8-16 hours | **HIGH** | Early warning of breakage |
| Pin Realm version in package.json | 5 minutes | Done | |

### Migration Trigger Status

✅ **TRIGGER ACTIVATED**: Community package hasn't been published in 6+ months (last: August 2025)

Additional triggers to monitor:
- RN 0.77/0.78 incompatible with Realm → Begin full migration
- Android 16 or iOS 19 breaks Realm native modules → Begin full migration
- Security CVE with no patch in 14 days → Emergency migration

### Fallback Timeline

With `DatabaseInterface` abstraction in place:
- Migration effort reduces from ~1,160 hours to ~800-900 hours
- Can begin migration within 2 weeks of trigger
- Estimated completion: 6-8 months (vs 10+ months without abstraction)

---

# Appendix: Original Migration Analysis

> **Note**: The analysis below was prepared before clarifying that Realm local SDK remains open-source. Kept for reference if migration becomes necessary in the future.

---

## Original Risk Assessment

> The "CRITICAL" ratings below are overstated for avni-client's use case since we don't use Device Sync.

### 🔴 CRITICAL RISKS

#### 1. Security Vulnerabilities (CRITICAL)
- **No security patches** after Sept 2025 for health data application
- Compliance violations with health data regulations
- Unpatched vulnerabilities could lead to data breaches in field deployments

#### 2. React Native Compatibility (HIGH)
- **Current**: Realm 12.14.2
- React Native 0.75+ (2026) may introduce breaking changes
- New Architecture (Fabric, TurboModules) adoption could conflict
- Risk: Forced to stay on outdated RN versions, unable to use modern features

#### 3. iOS/Android Native SDK Updates (HIGH)
- Android: Android 15-16 API requirements, Kotlin 2.x
- App Store/Play Store may eventually require newer SDK minimums
- **Timeline**: 12-24 months before forced incompatibilities

### 🟡 MEDIUM RISKS

- **Performance/Stability**: Known bugs won't be fixed, memory leaks remain
- **Community Support**: Declining Stack Overflow answers, expertise moving elsewhere
- **Third-party Compatibility**: Modern RN libraries may drop Realm support

---

## Migration Strategy

### Recommended Database: **WatermelonDB** (9/10 fit score)

**Why WatermelonDB:**
- ✅ Built for React Native offline-first apps (matches architecture)
- ✅ Reactive/observable patterns (preserves current reactivity)
- ✅ Proven performance with large datasets (handles 1.4M+ records)
- ✅ Active development, growing community
- ✅ SQLite foundation (stable, won't be deprecated)
- ✅ Documented Realm migration path

**Considered Alternatives:**
- SQLite + react-native-sqlite-storage (6/10): Stable but requires more infrastructure
- RxDB (7/10): Powerful but complex RxJS dependency
- PouchDB (5/10): Would require backend changes

### Migration Approach: **Incremental Migration** (Recommended)

**Why Incremental vs Big Bang:**
- ✅ Lower risk - validate each step
- ✅ Can pause/adjust based on learnings
- ✅ Minimal user disruption
- ✅ Rollback possible at each phase
- ✅ Critical for field workers who can't afford failed migrations

---

## Critical Challenge: Migrating 20k+ Users with Unsynced Offline Data

### The Problem
- **20,000+ active users** across different device types, OS versions, and connectivity situations
- **Different APK versions** in the field (users update at different times)
- **Unsynced data** on devices (field workers may have days/weeks of unsynced observations)
- **Offline-first app** (users may not be online during APK update)
- **Zero data loss tolerance** (health data is critical)

### Migration Strategy for Production Deployment

#### Strategy: **Dual-Database Hybrid Approach with Sync-First Migration**

This approach ensures zero data loss and handles the complexity of rolling updates across 20k+ users.

---

### Phase A: Preparation (In New APK v2.0)

**What the new APK contains:**
```
APK v2.0 Structure:
├── Realm DB Support (KEPT)
│   ├── RealmFactory (still works)
│   ├── All existing Realm code (unchanged)
│   └── Existing sync logic
├── WatermelonDB Support (NEW)
│   ├── DatabaseFactory
│   ├── WatermelonDB adapter
│   └── New sync adapter
└── Migration Orchestrator (NEW)
    ├── Detects which DB is active
    ├── Prioritizes sync before migration
    └── Manages dual-DB period
```

**Key Principle**: New APK can read/write BOTH databases during transition period.

---

### Phase B: Migration Flow (User Experience)

#### Scenario 1: User with Synced Data (80% of users)

**Flow:**
1. User updates to APK v2.0 from Play Store
2. App launches → **MigrationOrchestrator** detects:
   - Realm database exists
   - EntityQueue is empty (no unsynced data)
3. **Automatic background migration** begins:
   ```
   Step 1: Show "Updating database..." screen
   Step 2: Migrate Realm → WatermelonDB (2-5 minutes)
   Step 3: Validate migration (checksums, counts)
   Step 4: Switch app to WatermelonDB mode
   Step 5: Keep Realm DB as backup (30 days)
   ```
4. User continues normal work on WatermelonDB
5. Realm DB archived, deleted after 30 days

**User Impact**: 2-5 minute delay on first launch after update

---

#### Scenario 2: User with Unsynced Data (20% of users) - CRITICAL

**Flow:**
1. User updates to APK v2.0 from Play Store
2. App launches → **MigrationOrchestrator** detects:
   - Realm database exists
   - **EntityQueue has 143 unsynced items**
3. **Sync-first approach**:
   ```
   Step 1: Show "You have unsynced data. Syncing first..." message
   Step 2: KEEP USING REALM (don't migrate yet)
   Step 3: User must connect to internet and sync
   Step 4: Once EntityQueue is empty, prompt user:
           "Ready to update database. This will take 3-5 minutes."
   Step 5: User confirms → migration begins
   Step 6: Migrate Realm → WatermelonDB
   Step 7: Validate and switch to WatermelonDB
   ```
4. If user goes offline again before syncing:
   - App continues using Realm
   - User can collect more data (no disruption)
   - Migration happens when they finally sync and confirm

**User Impact**:
- No data loss
- No forced migration
- User controls when migration happens (after sync)
- Can continue working offline with Realm until ready

---

#### Scenario 3: User Offline for Extended Period (Edge Case)

**Problem**: User hasn't synced for 2 weeks, has 500 unsynced records, now offline for another week

**Solution - Offline Migration with Dual-Database**:
```
Step 1: App detects migration is needed but user is offline
Step 2: Give user choice:
        "Migrate now (3-5 min) or wait until synced?"

Option A: "Wait to sync" (RECOMMENDED)
   → Keep using Realm
   → Show reminder to sync before migrating

Option B: "Migrate offline" (ADVANCED)
   → Migrate Realm → WatermelonDB (including unsynced data)
   → Transfer EntityQueue items to new DB format
   → User can continue working offline
   → When back online, sync from WatermelonDB
```

**Key Safeguard**:
- Unsynced EntityQueue items are migrated WITH their data
- EntitySyncStatus preserved
- Sync logic works identically on WatermelonDB
- No data loss even if never synced before migration

---

### Phase C: APK Version Compatibility Matrix

| APK Version | Database | Can Sync With Server | Can Read Old Data |
|-------------|----------|---------------------|-------------------|
| v1.x (Old) | Realm only | ✅ Yes | ✅ Yes (native) |
| v2.0-2.2 (Hybrid) | Realm OR WatermelonDB | ✅ Yes (both) | ✅ Yes (reads Realm) |
| v2.3+ (New) | WatermelonDB only | ✅ Yes | ✅ Yes (can import Realm backup) |

**Backward Compatibility Period**: 6 months
- APK v2.0-2.2 (Hybrid versions) support both databases
- After 6 months, 99% of users migrated
- APK v2.3+ removes Realm code entirely

---

### Phase D: Rollout Strategy (20k+ Users)

#### Week 1-2: Alpha Testing (0.5% = ~100 users)
- **Target**: Internal staff, pilot users, testers
- **Monitoring**:
  - Migration success rate (target: 100%)
  - Time to migrate (track P50, P95, P99)
  - Data validation (manual checks)
  - Crash reports
- **Rollback**: If issues found, halt rollout, fix, re-deploy

#### Week 3-4: Beta Testing (5% = ~1,000 users)
- **Target**: Willing early adopters across different devices/OS
- **Monitoring**:
  - Migration success rate (target: >99%)
  - User feedback (survey)
  - Unsynced data scenarios
  - Performance metrics
- **Rollback**: Can roll back via Play Store "staged rollout" feature

#### Week 5-6: Phase 1 Rollout (20% = ~4,000 users)
- **Target**: General population, random selection
- **Monitoring**: Same as beta + scale metrics
- **Support**: Dedicated support channel for migration issues

#### Week 7-8: Phase 2 Rollout (50% = ~10,000 users)
- **Target**: Expand to half of user base
- **Confidence**: High confidence from previous phases

#### Week 9-10: Phase 3 Rollout (100% = all users)
- **Target**: All remaining users
- **Forced update**: After week 12, old APK shows "Please update" message

#### Week 11-16: Monitoring & Support (100% deployed)
- **Track**: Remaining stragglers, help with migration issues
- **Archive**: Start removing Realm code after 95%+ migrated

**Total Rollout Time**: 4 months from first alpha to 100% deployment

---

### Phase E: Technical Implementation Details

#### 1. Migration State Machine

```javascript
// MigrationOrchestrator.js
class MigrationOrchestrator {

  async determineMigrationState() {
    const hasRealmDB = await this.checkRealmDBExists();
    const hasWatermelonDB = await this.checkWatermelonDBExists();
    const unsyncedCount = await this.getUnsyncedCount();

    if (!hasRealmDB && hasWatermelonDB) {
      return 'MIGRATED'; // Already on WatermelonDB
    }

    if (hasRealmDB && !hasWatermelonDB) {
      if (unsyncedCount > 0) {
        return 'NEEDS_SYNC_FIRST'; // Sync before migration
      } else {
        return 'READY_TO_MIGRATE'; // Can migrate now
      }
    }

    if (hasRealmDB && hasWatermelonDB) {
      return 'DUAL_MODE'; // Migration in progress
    }

    return 'FRESH_INSTALL'; // New user, use WatermelonDB
  }

  async handleMigrationState(state) {
    switch(state) {
      case 'NEEDS_SYNC_FIRST':
        this.promptUserToSync();
        this.continueUsingRealm();
        break;

      case 'READY_TO_MIGRATE':
        await this.performMigration();
        break;

      case 'DUAL_MODE':
        await this.completeMigration();
        break;

      case 'MIGRATED':
        this.useWatermelonDB();
        break;
    }
  }
}
```

#### 2. Unsynced Data Transfer

```javascript
// EntityQueueMigrator.js
class EntityQueueMigrator {

  async migrateUnsyncedData(realmDB, watermelonDB) {
    // Get all unsynced items from Realm EntityQueue
    const unsyncedItems = realmDB.objects('EntityQueue')
      .filtered('synced = false');

    await watermelonDB.action(async () => {
      for (const item of unsyncedItems) {
        // Reconstruct entity in WatermelonDB
        const entityData = JSON.parse(item.entityData);
        const newEntity = await this.createWatermelonEntity(
          item.entityType,
          entityData
        );

        // Re-add to EntityQueue for WatermelonDB
        await watermelonDB.collections
          .get('entity_queue')
          .create(queue => {
            queue.entityType = item.entityType;
            queue.entityUuid = item.entityUuid;
            queue.synced = false;
            queue.createdAt = item.createdAt;
          });
      }
    });

    // Verify count matches
    const migratedCount = await watermelonDB.collections
      .get('entity_queue')
      .query(Q.where('synced', false))
      .fetchCount();

    if (migratedCount !== unsyncedItems.length) {
      throw new Error('Unsynced data migration count mismatch');
    }
  }
}
```

#### 3. Fallback & Rollback Mechanism

```javascript
// MigrationFailureHandler.js
class MigrationFailureHandler {

  async handleMigrationFailure(error) {
    // Log failure with telemetry
    await this.reportMigrationFailure(error);

    // Keep using Realm
    await this.switchToRealmMode();

    // Show user-friendly message
    this.showMessage({
      title: 'Database update postponed',
      message: 'We\'ll try again later. Your data is safe and you can continue working.',
      action: 'Continue'
    });

    // Schedule retry in 24 hours
    await this.scheduleMigrationRetry(24 * 60 * 60 * 1000);

    // Keep Realm DB as primary
    await AsyncStorage.setItem('active_database', 'realm');
  }

  async rollbackToRealm() {
    // Delete WatermelonDB
    await this.deleteWatermelonDB();

    // Restore Realm as active
    await AsyncStorage.setItem('active_database', 'realm');

    // Clear migration flags
    await AsyncStorage.removeItem('migration_started');
    await AsyncStorage.removeItem('migration_completed');

    // Restart app
    RNRestart.Restart();
  }
}
```

#### 4. Progress Tracking & User Communication

```javascript
// MigrationProgressUI.jsx
const MigrationProgressScreen = ({ totalRecords, onCancel }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  return (
    <View>
      <Text>Updating database structure...</Text>
      <ProgressBar progress={progress} />
      <Text>{stage}</Text>

      {/* Show current stage: */}
      {/* - "Preparing migration..." */}
      {/* - "Migrating individuals (1,243/5,000)..." */}
      {/* - "Migrating observations (450,000/1,400,000)..." */}
      {/* - "Validating data..." */}
      {/* - "Finalizing..." */}

      <Text>Estimated time: {estimatedMinutes} minutes</Text>

      {/* Only allow cancel in first 30 seconds */}
      {progress < 0.05 && (
        <Button onPress={onCancel}>
          Postpone Update
        </Button>
      )}
    </View>
  );
};
```

---

### Phase F: Validation & Safety Checks

#### Pre-Migration Validation
- [x] Realm DB file exists and is not corrupted
- [x] Sufficient storage space (3x current DB size)
- [x] Battery level > 20% (warn if lower)
- [x] App version compatibility check

#### During Migration
- [x] Batch processing (1000 records at a time to avoid memory issues)
- [x] Progress persistence (can resume if interrupted)
- [x] Record count tracking per entity type
- [x] Checksum validation for critical entities

#### Post-Migration Validation
- [x] Total record counts match (Realm vs WatermelonDB)
- [x] Sample deep comparison (100 random records)
- [x] Relationship integrity (all foreign keys valid)
- [x] EntityQueue items preserved
- [x] EntitySyncStatus preserved
- [x] User can perform basic operations (CRUD tests)

#### Failure Scenarios & Handling
| Failure Type | Detection | Handling |
|--------------|-----------|----------|
| Insufficient storage | Pre-migration check | Prompt user to free space, postpone |
| Low battery (<20%) | Pre-migration check | Warn user, allow proceed or postpone |
| Corrupted Realm DB | Pre-migration check | Attempt repair, or prompt user to sync first |
| Migration timeout (>20 min) | During migration | Rollback, schedule retry |
| Data count mismatch | Post-migration validation | Rollback, report error |
| Checksum failure | Post-migration validation | Rollback, report error |
| App crash during migration | Next launch | Resume from last checkpoint |

---

### Phase G: Monitoring & Metrics

**Key Metrics to Track:**

1. **Migration Success Rate** (target: >99.5%)
   - Successful migrations / Total attempts
   - Track by device type, OS version, data volume

2. **Migration Time** (target: P95 < 10 minutes)
   - P50, P95, P99 migration duration
   - Correlation with data volume

3. **Data Loss Incidents** (target: 0)
   - Any reported data loss
   - Unsynced data not preserved

4. **Rollback Rate** (target: <0.5%)
   - Migrations that had to rollback
   - Reasons for rollback

5. **User-Initiated Postponements**
   - Users who chose "wait to sync"
   - Time until they eventually migrate

6. **Support Tickets** (target: <1% of users)
   - Migration-related support requests
   - Common issues

**Dashboard**: Real-time monitoring dashboard showing rollout progress, success rates, and issues.

---

## Implementation Plan

### Phase 1: Infrastructure Setup (2-3 weeks)
**Objective**: Create database abstraction layer

**Tasks:**
- Add WatermelonDB dependencies to package.json
- Create `DatabaseInterface` abstraction layer
- Update `RealmProxy` → `DatabaseProxy` pattern
- Implement schema translator (Realm → WatermelonDB)
- Setup encryption with SQLCipher integration
- Update build configuration for both platforms

**Critical Files:**
- `packages/openchs-android/src/framework/db/RealmFactory.js` - Add DatabaseFactory abstraction
- `avni-models/src/framework/RealmProxy.js` - Create DatabaseProxy wrapper

**Team**: 2 developers

---

### Phase 2: Pilot Migration (4-6 weeks)
**Objective**: Validate approach with simple entities

**Entities to Migrate** (3-5 simple reference data entities):
- Concept, Gender, Format
- ConceptAnswer, LocaleMapping

**Tasks:**
- Migrate pilot entity schemas to WatermelonDB
- Update corresponding services (BaseService, EntityService patterns)
- Implement data migration utility (batch migration engine)
- Create validation framework (checksum, count, sample validation)
- Test with pilot data
- Document patterns and lessons learned

**Validation Criteria:**
- All records migrated (count validation)
- Data integrity verified (checksum)
- Query performance acceptable
- Encryption working correctly

**Critical Files:**
- `packages/openchs-android/src/service/BaseService.js` - Update base query patterns
- `packages/openchs-android/src/service/EntityService.js` - Update generic entity operations
- Create: `services/migration/MigrationService.js` - Migration engine
- Create: `services/migration/ValidationService.js` - Validation framework

**Team**: 3 developers

---

### Phase 3: Core Entities (12-16 weeks)
**Objective**: Migrate critical domain entities

**Entities to Migrate**:
- Individual (primary subject entity)
- Program, ProgramEnrolment
- Encounter, ProgramEncounter
- EncounterType, SubjectType
- Form, FormElement, FormElementGroup
- FormMapping

**Tasks:**
- Migrate 30-40 schemas
- Update 30-40 core services
- Implement dual-write pattern (write to both DBs temporarily)
- Update sync infrastructure (SyncService adapter layer)
- Comprehensive testing with production-like data (1.4M+ records)
- Performance profiling and optimization

**Parallel Data Sync Strategy:**
- Write operations go to both databases
- Read operations from WatermelonDB with Realm fallback
- Validate data consistency between databases
- Prepare for cutover

**Critical Files:**
- `packages/openchs-android/src/service/SyncService.js` - Update sync adapter
- `packages/openchs-android/src/service/IndividualService.js` - Pattern for domain services
- `packages/openchs-android/src/service/ProgramEnrolmentService.js`
- `packages/openchs-android/src/service/EncounterService.js`

**Team**: 3-4 developers

---

### Phase 4: Complex Entities & Features (8-10 weeks)
**Objective**: Migrate complex patterns and remaining entities

**Entities to Migrate**:
- **Observation** (EAV pattern - most complex, ~1.4M records)
- Media, MediaQueue
- Checklist, ChecklistItem, ChecklistItemDetail
- Task, TaskStatus, TaskType
- EntityApprovalStatus, ApprovalStatus
- Comment, CommentThread
- IndividualRelationship, GroupSubject
- Dashboard entities, ReportCard

**Tasks:**
- Migrate remaining 40+ schemas
- Update remaining 40+ services
- Special handling for Observation EAV pattern
- MediaQueueService updates
- Update all integration tests
- UI reactivity validation (ensure observers work correctly)

**Special Attention:**
- **Observation Pattern**: Complex EAV-like structure needs careful schema design in relational model
- **Media Handling**: Large file attachments, queue management
- **Performance**: Ensure query performance with 1.4M+ observations

**Critical Files:**
- `packages/openchs-android/src/service/ObservationService.js`
- `packages/openchs-android/src/service/MediaQueueService.js`
- `packages/openchs-android/src/service/ChecklistService.js`
- Update: All integration test files

**Team**: 3-4 developers

---

### Phase 5: Cutover & Optimization (4-6 weeks)
**Objective**: Complete migration and optimize

**Tasks:**
- Final data migration tool (one-time full migration)
- Remove Realm dependencies from package.json
- Remove dual-write code paths
- Performance optimization (query tuning, indexing)
- Memory profiling on low-end Android devices
- Update documentation
- Create rollback procedure (keep Realm DB backup for 30 days)

**Migration Tool Requirements:**
- Runs entirely offline (field workers have poor connectivity)
- Batch processing (1000 records per batch)
- Resumable if interrupted
- Progress UI for users
- Validation after migration
- Archive original Realm DB (backup for 30 days)

**Critical Files:**
- Create: `services/migration/FinalMigrationService.js`
- Create: `components/MigrationProgressScreen.js`
- Update: `package.json` - Remove Realm dependencies

**Team**: 3 developers

---

### Phase 6: Field Testing & Rollout (4-6 weeks, parallel)
**Objective**: Validate in real-world conditions

**Field Testing:**
- Pilot with 10-20 field workers
- Test in low connectivity environments
- Validate offline data collection workflows
- Monitor performance on low-end devices
- Gather feedback on migration experience

**Phased Rollout:**
- 10% of users (week 1-2)
- 25% of users (week 3)
- 50% of users (week 4)
- 100% of users (week 5-6)

**Monitoring:**
- Migration success rate
- Performance metrics (query time, battery usage)
- Crash reports
- Data validation reports
- User feedback

**Rollback Criteria:**
- Migration failure rate > 5%
- Critical data loss
- Performance degradation > 50%
- Widespread crashes

---

## Testing Strategy

### Unit Testing (~120-150 hours)
- Update all 80+ service test files
- Mock WatermelonDB instead of Realm
- Test query translations
- Test transaction handling

### Integration Testing (~100-120 hours)
- Sync scenarios (upload/download)
- Multi-entity workflows
- Conflict resolution
- Offline scenarios

### E2E Testing (~80-100 hours)
- Critical user journeys:
  - Individual registration
  - Program enrollment
  - Encounter data collection
  - Observation recording
  - Offline sync
- Migration scenarios (Realm → WatermelonDB)

### Performance Testing (~40-60 hours)
- Load testing with 1.4M+ records
- Query performance benchmarks
- Memory usage profiling on low-end devices
- Battery usage testing

---

## Effort & Timeline

### Development Effort
**Total: 1,500-1,800 development hours + 300-400 testing hours**

**Breakdown:**
- Schema migration (86 schemas): 80-100 hours
- Service layer refactoring (80+ services): 400-500 hours
- RealmProxy replacement: 60-80 hours
- Data migration utilities: 80-100 hours
- Testing: 300-400 hours
- Sync infrastructure: 100-120 hours
- UI/State management: 80-100 hours

### Team & Timeline
**Team**: 3-4 developers, 1 QA engineer (50%), 1 DevOps engineer (25%)

**Timeline**: 9-11 months total

| Phase | Duration | Start Month | End Month |
|-------|----------|-------------|-----------|
| Planning & Training | 2 months | Month 1-2 | Month 2 |
| Phase 1: Infrastructure | 3 weeks | Month 3 | Month 3 |
| Phase 2: Pilot | 6 weeks | Month 3-4 | Month 4 |
| Phase 3: Core Entities | 16 weeks | Month 5-8 | Month 8 |
| Phase 4: Complex Entities | 10 weeks | Month 8-10 | Month 10 |
| Phase 5: Cutover | 6 weeks | Month 11 | Month 11 |
| Phase 6: Rollout | 6 weeks | Month 11-12 | Month 12 |
| Buffer/Contingency | 4 weeks | Month 12+ | Month 13 |

**Recommended Start**: Q2 2026 (April-June) to complete before Realm EOL

---

## Key Success Factors

### Technical
1. ✅ **Database Abstraction**: Clean DatabaseInterface layer enables incremental migration
2. ✅ **Service Layer**: Existing 80+ services provide isolation from DB implementation
3. ✅ **Encryption Early**: Validate SQLCipher integration in Phase 1
4. ✅ **Observation Pattern**: Prototype complex EAV pattern early (Phase 2)
5. ✅ **Dual Database Period**: Parallel writes enable validation before cutover

### Organizational
1. ✅ **Executive Buy-in**: Secure commitment to pause/slow features during migration
2. ✅ **Dedicated Team**: Don't spread migration across too many developers
3. ✅ **Field Testing**: Real-world validation with actual health workers
4. ✅ **Phased Rollout**: Gradual deployment (10% → 25% → 50% → 100%)
5. ✅ **Rollback Plan**: Keep Realm backup for 30 days, flag-based rollback capability

---

## Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Observation EAV pattern performance | HIGH | MEDIUM | Early prototype in Phase 2, performance testing |
| Encryption implementation issues | HIGH | LOW | Validate SQLCipher in Phase 1 spike |
| Migration fails on low-end devices | HIGH | MEDIUM | Resumable migration, batch processing, extensive device testing |
| Query translation errors | MEDIUM | MEDIUM | Build query translator utilities, comprehensive unit tests |
| UI reactivity breaks | MEDIUM | LOW | Observer pattern validation framework |

### Organizational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Field worker disruption | HIGH | MEDIUM | Phased rollout, migration during low-activity periods |
| Feature development slowdown | MEDIUM | HIGH | Freeze major features during core phases, dedicated team |
| Team knowledge gaps | MEDIUM | LOW | Upfront training (2-3 days), pair programming, documentation |

---

## Verification & Validation

### Data Migration Validation
1. **Count Validation**: Verify all records migrated (exact counts match)
2. **Checksum Validation**: Validate critical data integrity
3. **Sample Deep Comparison**: 10% of records validated field-by-field
4. **Business Rule Validation**: All Individuals have valid Programs, Enrollments have Encounters, etc.
5. **Relationship Validation**: Foreign key integrity maintained

### Performance Validation
- Query performance within 10% of Realm baseline
- Memory usage within acceptable limits on low-end devices
- Migration completes within 10 minutes on low-end device
- No UI jank during reactive updates

### User Acceptance
- Field workers can complete typical workflows
- Offline data collection works correctly
- Sync completes successfully
- No data loss reported
- Migration experience is smooth

---

## Critical Files to Modify

### Database Layer
- `packages/openchs-android/src/framework/db/RealmFactory.js` → `DatabaseFactory.js`
- `avni-models/src/framework/RealmProxy.js` → `DatabaseProxy.js`

### Service Layer
- `packages/openchs-android/src/service/BaseService.js` - Base patterns for all services
- `packages/openchs-android/src/service/EntityService.js` - Generic entity operations
- `packages/openchs-android/src/service/SyncService.js` - Sync infrastructure
- `packages/openchs-android/src/service/query/RealmQueryService.js` → `QueryService.js`

### New Files to Create
- `services/database/DatabaseInterface.js` - DB abstraction interface
- `services/database/WatermelonDBAdapter.js` - WatermelonDB implementation
- `services/migration/MigrationService.js` - Migration engine
- `services/migration/ValidationService.js` - Data validation
- `components/MigrationProgressScreen.js` - User-facing migration UI

### Configuration
- `package.json` - Add WatermelonDB, remove Realm (Phase 5)
- Update: All 80+ service files (incremental across phases)
- Update: All integration test files

---

## Community Alternatives to Realm?

### Option A: Community-Maintained Realm Fork

**What exists:**
- There is a [community branch of realm-js](https://github.com/realm/realm-js) available on npm that removes deprecated sync features
- The core Realm database remains open source on GitHub

**Why this is NOT a solution:**
1. ❌ **Security**: Community fork unlikely to provide timely security patches
2. ❌ **Native SDK Compatibility**: Requires C++ expertise to maintain iOS/Android compatibility
3. ❌ **React Native Updates**: No guarantee of keeping up with RN New Architecture (Fabric, TurboModules)
4. ❌ **Resource Intensive**: Would require 1-2 senior engineers full-time to maintain
5. ❌ **No Guarantee**: Community momentum could die out

**Cost-Benefit Analysis:**
- Maintaining a fork: ~$300K-500K/year (2 senior engineers)
- Migration to WatermelonDB: ~$180K-330K one-time
- **Verdict**: Migration is cheaper and lower risk long-term

### Option B: Stay on Realm 12.14.2 Without Updates

**How long is this viable?**
- **6-12 months**: Low risk (until RN 0.76-0.77, iOS 19, Android 16)
- **12-18 months**: Medium risk (security vulnerabilities, compatibility issues emerging)
- **18-24 months**: High risk (forced incompatibilities likely, technical debt compounding)

**When it becomes untenable:**
- First unpatched security vulnerability in Realm
- React Native 0.78+ drops support for old native modules
- iOS/Android SDK updates break Realm's native layer
- Google Play/App Store requirements force newer toolchain

**Recommendation**: Only viable as short-term stopgap (6-12 months max) while planning migration

---

## Decision: Migrate or Continue?

### ✅ **MIGRATE** - Clear Recommendation

**Why:**
1. Security imperative for health data application
2. No viable long-term community alternative (maintaining fork too expensive/risky)
3. React Native ecosystem moving forward, Realm being left behind
4. Favorable architecture (service layer) makes migration feasible
5. Sufficient runway (19 months to EOL)
6. WatermelonDB is production-ready, well-documented, actively maintained
7. Migration cost (~$180K-330K) < Annual fork maintenance (~$300K-500K/year)

### ❌ Community Fork - NOT RECOMMENDED

**Why NOT:**
- Requires significant ongoing engineering investment
- No guarantee of long-term viability
- Security patch burden on your team
- Still faces same React Native compatibility issues

### ❌ "Stay on Realm 12.14.2" - HIGH RISK

**Why NOT:**
- Security risk unacceptable for health data
- First major RN/iOS/Android update could force emergency migration
- Technical debt compounds over time
- Team knowledge of Realm will degrade

---

## Next Steps

1. **Immediate (Week 1-2)**:
   - Review and approve this plan
   - Secure executive buy-in and budget
   - Identify dedicated migration team (3-4 developers)
   - Schedule team training on WatermelonDB (2-3 days)

2. **Short-term (Month 1-2)**:
   - Spike: Validate encryption with SQLCipher
   - Spike: Prototype Observation EAV pattern in WatermelonDB
   - Spike: Test dual-database hybrid approach
   - Setup project structure and tooling
   - Freeze major feature development roadmap during core phases

3. **Start Migration (Month 3)**:
   - Begin Phase 1: Infrastructure Setup
   - Target completion: Month 12-13 (before Realm EOL Sept 2025)

---

## Research Sources

### Realm Deprecation & Alternatives
- [Update to End-of-Life and Deprecation Notice - MongoDB Community](https://www.mongodb.com/community/forums/t/update-to-end-of-life-and-deprecation-notice/297168)
- [Deprecation React Native SDK September 2025 - MongoDB Community](https://www.mongodb.com/community/forums/t/deprecation-react-native-sdk-september-2025/307088)
- [Sharing Our Alternative to Realm - MongoDB Community](https://www.mongodb.com/community/forums/t/sharing-our-alternative-to-realm/322281)
- [Realm Open Source - GitHub](https://realm.github.io/)
- [realm-js GitHub Repository](https://github.com/realm/realm-js)
- [Realm is Deprecated - GitHub Discussion](https://github.com/realm/realm-swift/discussions/8680)
- [Best Realm Alternatives 2026 - Product Hunt](https://www.producthunt.com/products/realm/alternatives)
- [What are some alternatives to Realm? - StackShare](https://stackshare.io/realm/alternatives)

### WatermelonDB & Database Alternatives
- [WatermelonDB GitHub](https://github.com/Nozbe/WatermelonDB)
- [React Native Database Options - PowerSync](https://www.powersync.com/blog/react-native-local-database-options)
- [Offline-first React Native with WatermelonDB - SitePoint](https://www.sitepoint.com/create-an-offline-first-react-native-app-using-watermelondb/)
- [React Native Offline-first with Expo, WatermelonDB, Supabase](https://supabase.com/blog/react-native-offline-first-watermelon-db)
- [React Native Database - RxDB](https://rxdb.info/react-native-database.html)
- [MongoDB Realm & Device Sync Alternatives - Supabase](https://supabase.com/blog/mongodb-realm-and-device-sync-alternatives)
- [Alternatives for Realtime Local-First JavaScript Applications - RxDB](https://rxdb.info/alternatives.html)

### Offline-First Architecture & Migration Strategies
- [Expo SQLite: Complete Guide for Offline-First React Native Apps - Medium](https://medium.com/@aargon007/expo-sqlite-a-complete-guide-for-offline-first-react-native-apps-984fd50e3adb)
- [Building Offline-First Apps with React Native, React Query, AsyncStorage - DEV](https://dev.to/msaadullah/building-offline-first-apps-using-react-native-react-query-and-asyncstorage-1h4i)
- [Offline First: How to Apply in React Native - Medium](https://medium.com/@vitorbritto/offline-first-how-to-apply-this-approach-in-react-native-e2ed7af29cde)
- [Best Practices of Offline Storage in React Native Projects - Medium](https://medium.com/@tusharkumar27864/best-practices-of-using-offline-storage-asyncstorage-sqlite-in-react-native-projects-dae939e28570)
- [Building Offline-first Applications with React Native - DEV](https://dev.to/zidanegimiga/building-offline-first-applications-with-react-native-3626)
- [React Native Offline First Apps: Step-by-Step Tutorial - Bacancy](https://www.bacancytechnology.com/blog/react-native-offline-support)
- [Building an Offline First App with React Native and SQLite - Implementation Details](https://implementationdetails.dev/blog/2020/05/03/react-native-offline-first-db-with-sqlite-hooks/)
- [Offline-First Architecture with Local Databases in React Native - InnovationM](https://www.innovationm.com/blog/react-native-offline-first-architecture-sqlite-local-database-guide/)
