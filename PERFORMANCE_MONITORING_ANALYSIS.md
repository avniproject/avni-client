# Avni Client: Performance Monitoring Analysis

## Current Stack

- **Bugsnag** — Crash reporting, JS source maps, actionable stack traces
- **Firebase Analytics** — Screen views, usage events, organisation user property tracking
- **Metabase** — Dashboards (already available)

## What's Working

- ✅ Crash reporting with actionable JS stack traces (Bugsnag)
- ✅ Screen view tracking and custom events (Firebase)
- ✅ Organisation name set as Firebase user property (`organisation` property, [Analytics.js:32](packages/openchs-android/src/utility/Analytics.js#L32))
- ✅ User ID tracking in Bugsnag on login

## What's Missing

| Gap | Impact | Solution |
|---|---|---|
| No `time_taken` logged with screen events | Can't identify which screens are slow | Add performance timing to screen events |
| No BigQuery export enabled | Can't query Firebase data in Metabase | Enable in Firebase Console (24-48h setup) |
| Bugsnag has no org context | Can't filter crashes by organisation in Bugsnag | Add `bugsnag.addMetadata('user', { organisation })` |
| No offline-aware event journaling | Firebase silently drops events during long offline periods | Build supplementary local event queue for field workers |
| Firebase Console hard to use | Can't slice analytics by org, screen, user segment easily | Export to BigQuery → query in Metabase |

## Recommended Solution

**Keep existing tools, add BigQuery pipeline. No migration needed.**

```
Firebase Analytics
    ↓ (BigQuery export)
BigQuery dataset (analytics_events)
    ↓ (native connector)
Metabase
    ↓
Dashboards: usage hotspots, slow screens by org, performance trends
```

### Implementation Steps

1. **Enable BigQuery export** in Firebase Console
   - URL: https://console.firebase.google.com/project/avni-be4b7/settings/integrations
   - Click "Export to BigQuery" → Dataset: `analytics_events`
   - Wait 24-48 hours for first data batch

2. **Add screen performance timing** to Firebase events
   ```javascript
   // In screen load completion handler
   const timeTaken = Date.now() - screenStartTime;
   logEvent('screen_load', {
     screen_name: 'PatientList',
     time_taken_ms: timeTaken
   });
   ```

3. **Add organisation context to Bugsnag** (optional but recommended)
   ```javascript
   // After user login, when org is known
   bugsnag.addMetadata('user', {
     organisation: organisationName,
     organisation_id: organisationId
   });
   ```

4. **Create Metabase dashboards** from BigQuery
   - Connect Metabase to `avni-be4b7` project's `analytics_events` dataset
   - Build queries for:
     - Slowest screens (7 days)
     - Usage hotspots by organisation
     - Performance trends (30 days)
     - Offline vs online performance
   - See [FIREBASE_PERF_SETUP.md](FIREBASE_PERF_SETUP.md) for dashboard SQL queries

5. **Monitor and supplement offline gaps**
   - Firebase queues events locally but silently drops during long offline periods
   - For field workers offline for days, implement local event journal + sync mechanism
   - Track: critical user actions, data submissions, error counts

### Tool Comparison: Why Not Migrate to Sentry?

Sentry was evaluated as an alternative to Bugsnag. **Verdict: Not recommended.**

| Feature | Bugsnag | Sentry | Winner |
|---|---|---|---|
| Crash reporting (React Native) | ✅ Excellent | ✅ Excellent | Tie |
| JS source maps | ✅ Supported | ✅ Auto-upload | Sentry slightly better |
| Actionable stack traces | ✅ Yes | ✅ Yes | Tie |
| Performance monitoring | ❌ No | ✅ Transactions/spans | Sentry |
| Usage analytics | ❌ No | ❌ No | Neither (Firebase handles this) |
| Organisation-level filtering | ❌ Limited | ✅ Searchable tags | Sentry |
| BigQuery/Metabase integration | ❌ No native export | ❌ No native export | Neither |
| Cost at 50k MAU | Already paying | $29/month | Bugsnag (no change) |
| Bundle size impact | Minimal | ~200-264 KB JS | Bugsnag |
| New Architecture (Fabric) support | ⚠️ Partial | ✅ Full | Sentry |

**Conclusion:** Bugsnag provides all needed crash reporting. Adding Sentry means duplicate crash data, extra SDK, migration effort, and $29/month cost. Firebase + BigQuery covers the performance gaps Sentry would fill, without changing crash reporting tools.

---

## Cost Analysis

### Current Spend
| Item | Cost | Notes |
|---|---|---|
| Bugsnag | Existing | No change |
| Firebase | Free | Analytics + Crashlytics (not used) |
| Metabase | Existing | Already deployed |
| **Total Current** | **No change** | |

### Proposed Addition (BigQuery)
| Item | Cost | Notes |
|---|---|---|
| BigQuery export | Free | Firebase export to BigQuery: free |
| BigQuery storage | ~$0.05-1/month | ~5-10 GB analytics data/month × $0.02/GB |
| BigQuery queries | Free under free tier | 1 TB/month free, typical usage ~100 MB/analysis |
| Metabase (BigQuery connector) | Free | Existing Metabase deployment |
| **Additional Cost** | **~$1-2/month** | Negligible |

### Not Recommended
| Item | Cost | Notes |
|---|---|---|
| Sentry (if added) | $29/month | Would be duplicate of Bugsnag functionality |
| gcloud CLI | Free | Open source, optional (already have Firebase CLI) |

---

## Implementation Priority

### Phase 1: Quick Win (1-2 days)
1. Enable BigQuery export in Firebase Console
2. Add `time_taken_ms` to screen events in code
3. Wait for first data (24-48h)

### Phase 2: Dashboards (1 day)
1. Connect Metabase to BigQuery
2. Create 3 dashboard queries:
   - Slowest screens by organisation
   - Usage hotspots (event counts by screen)
   - Performance trend (7/30 day views)

### Phase 3: Context (Optional, 1-2 days)
1. Add organisation metadata to Bugsnag crashes
2. Build offline event queue for long-offline scenarios
3. Set up Metabase alerts for slow screens (>5 second P95)

---

## Monitoring Capabilities After Implementation

You will be able to answer:

✅ **Which screens are slow?** (Metabase dashboard, by organisation)
✅ **How slow are they?** (avg time, p95 percentile)
✅ **Which organisations are affected?** (slice and filter)
✅ **Are slow screens causing drops?** (funnel analysis)
✅ **Is performance degrading over time?** (trends view)
✅ **When did performance change?** (date range comparison)
✅ **How many users hit slow screens?** (unique user counts)
✅ **What's the impact of offline mode?** (offline vs online comparison query)

---

## References

- [firebase-perf-monitor.py](firebase-perf-monitor.py) — Single script for checking/querying BigQuery data
- [FIREBASE_PERF_SETUP.md](FIREBASE_PERF_SETUP.md) — Setup guide + Metabase dashboard SQL queries
- Current Analytics implementation: [Analytics.js](packages/openchs-android/src/utility/Analytics.js)
- Bugsnag integration: [bugsnag.js](packages/openchs-android/src/utility/bugsnag.js), [ErrorUtil.js](packages/openchs-android/src/framework/errorHandling/ErrorUtil.js)
