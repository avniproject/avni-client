# Firebase Performance Monitoring Setup

Track usage hotspots, stability, and performance for Avni Client (offline-first app) via Firebase Analytics → BigQuery → Metabase.

## One-Time Setup

### 1. Enable BigQuery Export in Firebase Console

For each project (`avni-be4b7`, `lfe-teach`):

1. Open https://console.firebase.google.com/project/avni-be4b7/settings/integrations
2. Link Google Analytics (if not already linked)
3. Enable "Export to BigQuery" → dataset: `analytics_259495760`
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
  event_name as screen,
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'organization_id') as org_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_pseudo_id) as unique_users
FROM `avni-be4b7.analytics_259495760.events_*`
WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY screen, org_id
ORDER BY event_count DESC
```

### Slowest Screens by Organization
```sql
SELECT
  (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'organization_id') as org_id,
  event_name as screen,
  COUNT(*) as views,
  ROUND(AVG(CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'time_taken') AS FLOAT64))) as avg_ms,
  ROUND(PERCENTILE_CONT(CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'time_taken') AS FLOAT64), 0.95) OVER(PARTITION BY event_name)) as p95_ms
FROM `avni-be4b7.analytics_259495760.events_*`
WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'time_taken') IS NOT NULL
GROUP BY org_id, screen
HAVING COUNT(*) >= 5
ORDER BY avg_ms DESC
```

### Performance Trend (30 days)
```sql
SELECT
  DATE(TIMESTAMP_MICROS(event_timestamp)) as date,
  event_name as screen,
  ROUND(AVG(CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'time_taken') AS FLOAT64))) as avg_ms
FROM `avni-be4b7.analytics_259495760.events_*`
WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'time_taken') IS NOT NULL
GROUP BY date, screen
ORDER BY date DESC, avg_ms DESC
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No datasets found" | Enable BigQuery export in Firebase Console and wait 24-48h |
| "DefaultCredentialsError" | Set `GOOGLE_APPLICATION_CREDENTIALS=~/.gcp/avni-be4b7-sa.json` |
| "Permission denied" | Ensure service account has BigQuery Admin role |
| Data exists but no `time_taken` | Check app is logging `time_taken` as event parameter |
| No `organization_id` | Ensure app calls `analytics.setUserProperty("organization_id", orgId)` |

## Cost

All free: Firebase Analytics (free) + BigQuery (1TB/month free tier) + Metabase (already have it).
