# Realm DB Migration Plan for avni-client

## Current Status (February 2026)

| Aspect | Status |
|--------|--------|
| **Realm Version** | 12.14.2 |
| **React Native** | 0.76.5 |
| **Production Issues** | None |
| **Data per device** | Hundreds to few thousands |
| **Unsynced data** | Typically 5-10 records |
| **Community Support** | Last npm publish: August 2025 (6+ months ago) |
| **Decision** | BEGIN MIGRATION PREPARATION |

---

## Migration Triggers

**Status**: ✅ TRIGGER ACTIVATED (Community package not published in 6+ months)

Monitor for additional triggers:
- RN 0.77/0.78 incompatible with Realm → Begin full migration
- Android 16 breaks Realm native modules → Begin full migration  
- Security CVE with no patch in 14 days → Emergency migration

---

## Immediate Actions (Next 4-6 weeks)

| Task | Effort | Priority | Rationale |
|------|--------|----------|----------|
| Create `DatabaseInterface` abstraction layer | 40-80 hours | **HIGH** | Enables faster migration if needed |
| Document current Realm query patterns | 4-8 hours | Medium | Aids future migration |

**Expected Timeline with Abstraction Layer**:
- Migration effort: ~800-900 hours (vs ~1,160 hours without abstraction)
- Can begin full migration within 2 weeks of critical trigger
- Estimated completion: 6-8 months

---

## Migration Strategy

### Target Database: **WatermelonDB**

**Selection Rationale:**
- Built for React Native offline-first apps
- Reactive/observable patterns (preserves current reactivity)
- Proven performance with large datasets (1.4M+ records)
- SQLite foundation (stable, won't be deprecated)
- Active development, documented Realm migration path

### Migration Approach: **Dual-Database Hybrid with Sync-First**

**Key Constraints:**
- 20,000+ active users with varying connectivity
- Unsynced data on devices (days/weeks of observations)
- Zero data loss tolerance (health data)
- Rolling APK updates across different OS versions

---

### User Migration Flow

#### Scenario 1: Synced Data (80% of users)
1. App detects empty EntityQueue → automatic migration (2-5 min)
2. User continues on WatermelonDB
3. Realm DB kept as backup (30 days)

#### Scenario 2: Unsynced Data (20% of users)
1. App detects unsynced items → prompt to sync first
2. Keep using Realm until sync completes
3. After sync → migrate to WatermelonDB
4. User controls migration timing

#### Scenario 3: Offline Extended Period (Edge Case)
1. User choice: wait to sync OR migrate offline
2. If migrate offline: transfer EntityQueue items with data
3. Sync works identically on WatermelonDB
4. Zero data loss guaranteed

---

## Rollout Strategy

| Phase | Users | Duration | Success Target |
|-------|-------|----------|----------------|
| Alpha | 100 (0.5%) | Week 1-2 | 100% success |
| Beta | 1,000 (5%) | Week 3-4 | >99% success |
| Phase 1 | 4,000 (20%) | Week 5-6 | >99% success |
| Phase 2 | 10,000 (50%) | Week 7-8 | >99% success |
| Phase 3 | All (100%) | Week 9-10 | >99% success |
| Monitoring | All | Week 11-16 | Cleanup |

**Total Duration**: 4 months

---

## Technical Implementation

### Migration State Machine
- Detect DB state: MIGRATED, NEEDS_SYNC_FIRST, READY_TO_MIGRATE, DUAL_MODE, FRESH_INSTALL
- Handle each state appropriately
- Prioritize sync before migration

### Unsynced Data Transfer
- Migrate EntityQueue items with data intact
- Preserve EntitySyncStatus
- Validate count matches after migration

### Rollback Mechanism
- Keep Realm DB as backup (30 days)
- Automatic retry on failure (24 hours)
- User-friendly error messages
- Can rollback to Realm if needed

### Validation & Safety

**Pre-Migration**: Storage space, battery level, DB integrity, version compatibility

**During Migration**: Batch processing (1000 records), resumable, progress tracking

**Post-Migration**: Count validation, sample comparison, relationship integrity, CRUD tests

**Failure Handling**: Rollback on errors, automatic retry, resume on crash

### Monitoring Metrics

| Metric | Target |
|--------|--------|
| Migration success rate | >99.5% |
| Migration time (P95) | <10 minutes |
| Data loss incidents | 0 |
| Rollback rate | <0.5% |
| Support tickets | <1% of users |

---

## Implementation Plan

### Phase 1: Infrastructure Setup (2-3 weeks)
- Create `DatabaseInterface` abstraction layer
- Setup WatermelonDB with SQLCipher encryption
- Update RealmFactory → DatabaseFactory pattern
- **Team**: 2 developers

### Phase 2: Pilot Migration (4-6 weeks)
- Migrate 3-5 simple entities (Concept, Gender, Format)
- Build migration engine and validation framework
- Test with pilot data
- **Team**: 3 developers

### Phase 3: Core Entities (12-16 weeks)
- Migrate 30-40 core schemas (Individual, Program, Encounter, Form)
- Update 30-40 core services
- Implement dual-write pattern
- Update sync infrastructure
- **Team**: 3-4 developers

### Phase 4: Complex Entities (8-10 weeks)
- Migrate 40+ remaining schemas (Observation, Media, Checklist, Task)
- Special handling for Observation EAV pattern
- Update all integration tests
- **Team**: 3-4 developers

### Phase 5: Cutover & Optimization (4-6 weeks)
- Final migration tool with offline support
- Remove Realm dependencies
- Performance optimization and memory profiling
- **Team**: 3 developers

### Phase 6: Field Testing & Rollout (4-6 weeks)
- Pilot with 10-20 field workers
- Phased rollout: 10% → 25% → 50% → 100%
- Monitor success rate, performance, crashes

## Testing Strategy

| Test Type | Effort | Focus |
|-----------|--------|-------|
| Unit | 120-150h | Update 80+ service tests, query translations |
| Integration | 100-120h | Sync scenarios, multi-entity workflows, offline |
| E2E | 80-100h | Critical user journeys, migration scenarios |
| Performance | 40-60h | Load testing (1.4M+ records), memory profiling |

---

## Timeline & Resources

**Total Effort**: 1,800-2,200 hours (development + testing)

**Team**: 3-4 developers, 1 QA engineer (50%), 1 DevOps engineer (25%)

**Duration**: 9-11 months

| Phase | Duration | Months |
|-------|----------|--------|
| Planning & Training | 2 months | 1-2 |
| Phase 1: Infrastructure | 3 weeks | 3 |
| Phase 2: Pilot | 6 weeks | 3-4 |
| Phase 3: Core Entities | 16 weeks | 5-8 |
| Phase 4: Complex Entities | 10 weeks | 8-10 |
| Phase 5: Cutover | 6 weeks | 11 |
| Phase 6: Rollout | 6 weeks | 11-12 |
| Buffer/Contingency | 4 weeks | 12-13 |

## Success Factors & Risks

**Critical Success Factors:**
- Database abstraction layer (enables incremental migration)
- Validate SQLCipher encryption early (Phase 1)
- Prototype Observation EAV pattern early (Phase 2)
- Executive buy-in for feature freeze during core phases
- Dedicated team (don't spread across too many developers)
- Real-world field testing before full rollout

**Key Risks & Mitigation:**
- **Observation EAV performance**: Early prototype, performance testing
- **Low-end device failures**: Resumable migration, batch processing, extensive testing
- **Field worker disruption**: Phased rollout, migration during low-activity periods
- **Feature slowdown**: Freeze major features, dedicated team

## Key Files

**Database Layer:**
- `RealmFactory.js` → `DatabaseFactory.js`
- `RealmProxy.js` → `DatabaseProxy.js`

**Service Layer:**
- `BaseService.js`, `EntityService.js`, `SyncService.js`
- 80+ service files (incremental updates)

**New Files:**
- `DatabaseInterface.js`, `WatermelonDBAdapter.js`
- `MigrationService.js`, `ValidationService.js`
- `MigrationProgressScreen.js`

---

## Next Steps

**Immediate (Week 1-2):**
- Review and approve this plan
- Secure executive buy-in and budget
- Identify dedicated migration team (3-4 developers)
- Schedule team training on WatermelonDB (2-3 days)

**Short-term (Month 1-2):**
- Spike: Validate encryption with SQLCipher
- Spike: Prototype Observation EAV pattern in WatermelonDB
- Spike: Test dual-database hybrid approach
- Setup project structure and tooling
- Freeze major feature development roadmap during core phases

**Start Migration (Month 3):**
- Begin Phase 1: Infrastructure Setup
- Target completion: Month 12-13
