# Firebase Performance Monitoring Setup

Track usage hotspots, stability, and performance for Avni Client (offline-first app) via Firebase Analytics → BigQuery → Metabase.

## Firebase Projects

Analytics data is collected in two Firebase projects:

| Firebase Project | Build Flavors | Package Names |
|-----------------|---------------|---------------|
| **avni-be4b7** | generic, gramin, sakhi | com.openchsclient, com.openchsclient.gramin, org.sakhi.openchsclient |
| **lfe-teach** | lfe, lfeTeachNagaland, lfeTeachNagalandSecurity | org.lfeteach.openchsclient, com.openchsclient.lfeteach.nagaland |

Each project has separate BigQuery datasets for analytics export.

**Note:** When querying analytics data, replace `avni-be4b7` with `lfe-teach` for LFE/TEACH analytics.

## Analytics Segregation

To prevent development/testing data from polluting production insights, all analytics events include these user properties:

- **`build_type`**: "debug" or "release" (from ConfigModule.BUILD_TYPE)
- **`environment`**: "prod", "dev", "staging", "uat" (from Config.ENV)
- **`is_production`**: "true" or "false" (derived from build_type)
- **`organisation`**: Organization name

### Production Data Filter

**Add this to all production queries to filter out development/testing data:**

```sql
WHERE (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'is_production') = 'true'
  AND (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'environment') = 'prod'
```

This follows the same pattern as Bugsnag's environment-based configuration, where ConfigModule provides build information similar to how BugsnagInitializer provides environment configuration.

## One-Time Setup

### 1. Enable BigQuery Export in Firebase Console

For each project:

**For avni-be4b7:**
1. Open https://console.firebase.google.com/project/avni-be4b7/settings/integrations
2. Link Google Analytics (if not already linked)
3. Enable "Export to BigQuery" → dataset: `analytics_259495760`
4. Wait 24-48 hours for first data batch

**For lfe-teach:**
1. Open https://console.firebase.google.com/project/lfe-teach/settings/integrations
2. Link Google Analytics (if not already linked)
3. Enable "Export to BigQuery" (use appropriate dataset name)
4. Wait 24-48 hours for first data batch

### 2. Create GCP Service Account

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts?project=avni-be4b7
2. Create Service Account → Name: `bigquery-cli` → Role: `BigQuery Admin`
3. Keys tab → Add Key → Create new key → JSON
4. Save to `~/.gcp/avni-be4b7-sa.json`

### 3. Install Dependencies

```bash
pip3 install google-cloud-bigquery pandas
```

## Usage

```bash
# Verify setup
python3 firebase-perf-monitor.py check

# Run all performance queries
python3 firebase-perf-monitor.py query

# Specific queries
python3 firebase-perf-monitor.py query --type screens   # Slowest screens
python3 firebase-perf-monitor.py query --type orgs      # By organization
python3 firebase-perf-monitor.py query --type usage     # Traffic hotspots
python3 firebase-perf-monitor.py query --type offline   # Offline vs online

# Connect Metabase to BigQuery
python3 firebase-perf-monitor.py setup-metabase --user admin@example.com --password secret
```

## Metabase Dashboard Queries

Once Metabase is connected to BigQuery, create these dashboard cards:

### Usage / Traffic Hotspots
```sql
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name') as screen,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'organisation') as organisation,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'environment') as environment,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'build_type') as build_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_pseudo_id) as unique_users
FROM `avni-be4b7.analytics_259495760.events_*`
WHERE DATE(TIMESTAMP_MICROS(event_timestamp)) >= CURRENT_DATE() - 7
  AND event_name = 'screen_load_time'
GROUP BY screen, organisation, environment, build_type
ORDER BY event_count DESC
```

### All Recent Events (Testing/Debug)
```sql
-- Simple query to see all recent screen_load_time events
SELECT
  TIMESTAMP_MICROS(event_timestamp) as timestamp,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name') as screen,
  (SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms') as time_ms,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'organisation') as organisation,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'environment') as environment,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'build_type') as build_type,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'is_offline') as is_offline
FROM `avni-be4b7.analytics_259495760.events_*`
WHERE event_name = 'screen_load_time'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
ORDER BY event_timestamp DESC
LIMIT 100
```

### Slowest Screens by Organization
```sql
SELECT
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'organisation') as organisation,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'environment') as environment,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'build_type') as build_type,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name') as screen,
  COUNT(*) as views,
  ROUND(AVG((SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms'))) as avg_ms,
  ROUND(APPROX_QUANTILES((SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms'), 100)[OFFSET(95)]) as p95_ms
FROM `avni-be4b7.analytics_259495760.events_*`
WHERE DATE(TIMESTAMP_MICROS(event_timestamp)) >= CURRENT_DATE() - 7
  AND event_name = 'screen_load_time'
  AND (SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms') IS NOT NULL
GROUP BY organisation, environment, build_type, screen
HAVING COUNT(*) >= 5  -- Remove this line for testing with fresh data
ORDER BY avg_ms DESC
```

### Performance Trend (30 days)
```sql
SELECT
  DATE(TIMESTAMP_MICROS(event_timestamp)) as date,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name') as screen,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'environment') as environment,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'build_type') as build_type,
  ROUND(AVG((SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms'))) as avg_ms
FROM `avni-be4b7.analytics_259495760.events_*`
WHERE DATE(TIMESTAMP_MICROS(event_timestamp)) >= CURRENT_DATE() - 30
  AND event_name = 'screen_load_time'
  AND (SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms') IS NOT NULL
GROUP BY date, screen, environment, build_type
ORDER BY date DESC, avg_ms DESC
```

### Offline vs Online Performance
```sql
SELECT
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'organisation') as organisation,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'environment') as environment,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'build_type') as build_type,
  IFNULL((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'is_offline'), 'false') as is_offline,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name') as screen,
  COUNT(*) as views,
  ROUND(AVG((SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms'))) as avg_ms
FROM `avni-be4b7.analytics_259495760.events_*`
WHERE DATE(TIMESTAMP_MICROS(event_timestamp)) >= CURRENT_DATE() - 7
  AND event_name = 'screen_load_time'
  AND (SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms') IS NOT NULL
GROUP BY organisation, environment, build_type, is_offline, screen
ORDER BY organisation, avg_ms DESC
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No datasets found" | Enable BigQuery export in Firebase Console and wait 24-48h |
| "DefaultCredentialsError" | Set `GOOGLE_APPLICATION_CREDENTIALS=~/.gcp/avni-be4b7-sa.json` |
| "Permission denied" | Ensure service account has BigQuery Admin role |
| Data exists but no `time_taken_ms` | Deploy latest app version — `time_taken_ms` added in Analytics.js |
| No `organisation` data | Ensure app calls `analytics.setUserProperty("organisation", orgName)` |
| Missing `build_type`, `environment`, or `is_production` | Deploy latest app version with updated Analytics.js and ConfigModule |
| Queries return no data after adding production filter | Verify app is running release builds with `environment=prod` in Config.ENV |
| Development data appearing in reports | Ensure production filter is applied: `is_production='true' AND environment='prod'` |
| Need to analyze development data | Remove production filter or change to `is_production='false'` OR `environment!='prod'` |

## Cost

All free: Firebase Analytics (free) + BigQuery (1TB/month free tier) + Metabase (already have it).
