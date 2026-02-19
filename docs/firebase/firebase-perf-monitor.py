#!/usr/bin/env python3
"""
Firebase Analytics Performance Monitor for Avni Client
Tracks usage hotspots, stability, and performance via BigQuery.

Usage:
    python3 firebase-perf-monitor.py check              # Verify setup & data availability
    python3 firebase-perf-monitor.py query               # Run all performance queries
    python3 firebase-perf-monitor.py query --type screens # Slowest screens only
    python3 firebase-perf-monitor.py query --type orgs    # Performance by organization
    python3 firebase-perf-monitor.py query --type usage   # Usage/traffic hotspots
    python3 firebase-perf-monitor.py query --type offline # Offline vs online comparison
    python3 firebase-perf-monitor.py setup-metabase       # Connect Metabase to BigQuery
"""

import argparse
import json
import os
import sys
from datetime import datetime

PROJECT_ID = "avni-be4b7"
DATASET_ID = "analytics_259495760"
CREDS_PATH = os.path.expanduser("~/.gcp/avni-be4b7-sa.json")

# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

def resolve_credentials():
    creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if creds and os.path.exists(creds):
        return creds
    if os.path.exists(CREDS_PATH):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDS_PATH
        return CREDS_PATH
    return None

def print_setup_instructions():
    print("""
CREDENTIALS NOT FOUND
=====================
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=avni-be4b7
2. Create Service Account -> Name: 'bigquery-cli' -> Role: 'BigQuery Admin'
3. Keys tab -> Add Key -> Create new key -> JSON
4. Save to: ~/.gcp/avni-be4b7-sa.json

Then run this script again.

Alternative: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
""")

def get_client():
    creds = resolve_credentials()
    if not creds:
        print_setup_instructions()
        sys.exit(1)
    from google.cloud import bigquery
    return bigquery.Client(project=PROJECT_ID)

# ---------------------------------------------------------------------------
# Check subcommand
# ---------------------------------------------------------------------------

def cmd_check():
    """Verify credentials, list datasets, check if BigQuery export is active."""
    creds = resolve_credentials()
    if not creds:
        print_setup_instructions()
        return

    print(f"Credentials: {creds}\n")

    from google.cloud import bigquery
    client = bigquery.Client(project=PROJECT_ID)

    # List datasets
    datasets = list(client.list_datasets())
    if not datasets:
        print(f"No datasets found in project {PROJECT_ID}.")
        print("BigQuery export may not be enabled yet.")
        print(f"Enable it at: https://console.firebase.google.com/project/{PROJECT_ID}/settings/integrations")
        return

    print(f"Datasets in {PROJECT_ID}:")
    has_analytics = False
    for ds in datasets:
        marker = " <-- Firebase Analytics" if "analytics" in ds.dataset_id.lower() else ""
        print(f"  {ds.dataset_id}{marker}")
        if ds.dataset_id == DATASET_ID:
            has_analytics = True

    if not has_analytics:
        print(f"\nDataset '{DATASET_ID}' not found. BigQuery export may not be enabled.")
        print(f"Enable at: https://console.firebase.google.com/project/{PROJECT_ID}/settings/integrations")
        return

    # Check tables
    tables = list(client.list_tables(DATASET_ID))
    if not tables:
        print(f"\nDataset '{DATASET_ID}' exists but has no tables yet.")
        print("Data may still be processing (takes 24-48 hours after enabling export).")
        return

    print(f"\nTables in {DATASET_ID}: {len(tables)}")
    for t in tables[:10]:
        full = client.get_table(f"{PROJECT_ID}.{DATASET_ID}.{t.table_id}")
        size_mb = (full.num_bytes or 0) / (1024 * 1024)
        print(f"  {t.table_id}  ({full.num_rows:,} rows, {size_mb:.1f} MB)")
    if len(tables) > 10:
        print(f"  ... and {len(tables) - 10} more")

    # Check org data
    try:
        q = f"""
        SELECT
          (SELECT value.string_value FROM UNNEST(user_properties)
           WHERE key = 'organization_id') as org_id,
          COUNT(*) as cnt
        FROM `{PROJECT_ID}.{DATASET_ID}.events_*`
        GROUP BY org_id ORDER BY cnt DESC LIMIT 10
        """
        rows = list(client.query(q).result())
        print("\nOrganizations in data:")
        for r in rows:
            print(f"  {r['org_id'] or '[NO ORG_ID]'}: {r['cnt']:,} events")
    except Exception as e:
        print(f"\nCould not check org data: {e}")

    print("\nSetup looks good!")

# ---------------------------------------------------------------------------
# Query subcommand
# ---------------------------------------------------------------------------

QUERIES = {
    "screens": {
        "title": "SLOWEST SCREENS (Last 7 Days) - Requires time_taken logging",
        "sql": f"""
SELECT
  DATE(TIMESTAMP_MICROS(event_timestamp)) as date,
  (SELECT value.string_value FROM UNNEST(user_properties)
   WHERE key = 'organisation') as organisation,
  event_name as screen,
  COUNT(*) as views,
  ROUND(AVG(CAST((SELECT value.int_value FROM UNNEST(event_params)
           WHERE key = 'time_taken_ms') AS FLOAT64))) as avg_ms,
  ROUND(PERCENTILE_CONT(
    CAST((SELECT value.int_value FROM UNNEST(event_params)
          WHERE key = 'time_taken_ms') AS FLOAT64), 0.95)
    OVER(PARTITION BY event_name)) as p95_ms
FROM `{PROJECT_ID}.{DATASET_ID}.events_*`
WHERE DATE(TIMESTAMP_MICROS(event_timestamp)) >= CURRENT_DATE() - 7
  AND (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'time_taken_ms') IS NOT NULL
GROUP BY date, organisation, screen
HAVING COUNT(*) >= 5
ORDER BY avg_ms DESC
LIMIT 50
""",
    },
    "orgs": {
        "title": "PERFORMANCE BY ORGANIZATION (Last 30 Days)",
        "sql": f"""
SELECT
  (SELECT value.string_value FROM UNNEST(user_properties)
   WHERE key = 'organisation') as organisation,
  event_name as screen,
  COUNT(*) as views,
  COUNT(DISTINCT user_pseudo_id) as unique_users
FROM `{PROJECT_ID}.{DATASET_ID}.events_*`
WHERE DATE(TIMESTAMP_MICROS(event_timestamp)) >= CURRENT_DATE() - 30
  AND event_name = 'screen_view'
GROUP BY organisation, screen
HAVING COUNT(*) >= 5
ORDER BY organisation, views DESC
LIMIT 100
""",
    },
    "usage": {
        "title": "USAGE / TRAFFIC HOTSPOTS (Last 7 Days)",
        "sql": f"""
SELECT
  event_name as screen,
  (SELECT value.string_value FROM UNNEST(user_properties)
   WHERE key = 'organisation') as organisation,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_pseudo_id) as unique_users
FROM `{PROJECT_ID}.{DATASET_ID}.events_*`
WHERE DATE(TIMESTAMP_MICROS(event_timestamp)) >= CURRENT_DATE() - 7
GROUP BY screen, organisation
ORDER BY event_count DESC
LIMIT 50
""",
    },
    "offline": {
        "title": "OFFLINE vs ONLINE PERFORMANCE (Last 7 Days) - Requires is_offline logging",
        "sql": f"""
SELECT
  (SELECT value.string_value FROM UNNEST(user_properties)
   WHERE key = 'organisation') as organisation,
  IFNULL((SELECT value.string_value FROM UNNEST(event_params)
   WHERE key = 'is_offline'), 'not_specified') as is_offline,
  event_name as screen,
  COUNT(*) as events,
  COUNT(DISTINCT user_pseudo_id) as users
FROM `{PROJECT_ID}.{DATASET_ID}.events_*`
WHERE DATE(TIMESTAMP_MICROS(event_timestamp)) >= CURRENT_DATE() - 7
GROUP BY organisation, is_offline, screen
ORDER BY organisation, events DESC
LIMIT 50
""",
    },
}

def cmd_query(query_type):
    """Run performance queries against BigQuery."""
    client = get_client()
    import pandas as pd

    types_to_run = [query_type] if query_type != "all" else list(QUERIES.keys())

    for qt in types_to_run:
        q = QUERIES[qt]
        print(f"\n{'=' * 70}")
        print(q["title"])
        print("=" * 70)

        try:
            df = client.query(q["sql"]).result().to_dataframe()
            if df.empty:
                print("No data found. Check that BigQuery export is enabled and events are being recorded.")
                continue
            print(f"\n{df.to_string(index=False)}\n")
        except Exception as e:
            print(f"Error: {e}")

    # Export combined results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_file = f"firebase-perf-{timestamp}.csv"
    try:
        df = client.query(QUERIES["screens"]["sql"]).result().to_dataframe()
        if not df.empty:
            df.to_csv(csv_file, index=False)
            print(f"Results exported to: {csv_file}")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Setup Metabase subcommand
# ---------------------------------------------------------------------------

def cmd_setup_metabase(metabase_url, metabase_user, metabase_password):
    """Connect Metabase to BigQuery via API."""
    import requests

    creds = resolve_credentials()
    if not creds:
        print_setup_instructions()
        return

    # Authenticate
    resp = requests.post(f"{metabase_url}/api/session", json={
        "username": metabase_user,
        "password": metabase_password,
    })
    if resp.status_code != 200:
        print(f"Metabase auth failed: {resp.text}")
        return

    session_id = resp.json().get("id")
    headers = {"X-Metabase-Session": session_id, "Content-Type": "application/json"}

    # Create database connection
    with open(creds) as f:
        sa_json = json.load(f)

    resp = requests.post(f"{metabase_url}/api/database", headers=headers, json={
        "name": "Firebase Analytics BigQuery",
        "engine": "bigquery-cloud-sdk",
        "details": {
            "dataset-filters-type": "all",
            "project-id": PROJECT_ID,
            "service-account-json": json.dumps(sa_json),
        },
    })

    if resp.status_code in (200, 201):
        db_id = resp.json().get("id")
        print(f"BigQuery database created in Metabase (ID: {db_id})")
        print(f"Open {metabase_url} and create dashboards using the SQL queries in FIREBASE_PERF_SETUP.md")
    else:
        print(f"Failed to create database: {resp.text}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Firebase Analytics Performance Monitor for Avni Client",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("check", help="Verify setup & data availability")

    q = sub.add_parser("query", help="Run performance queries")
    q.add_argument("--type", choices=["all", "screens", "orgs", "usage", "offline"],
                   default="all", help="Query type (default: all)")

    m = sub.add_parser("setup-metabase", help="Connect Metabase to BigQuery")
    m.add_argument("--url", default="http://localhost:3000", help="Metabase URL")
    m.add_argument("--user", required=True, help="Metabase admin email")
    m.add_argument("--password", required=True, help="Metabase admin password")

    args = parser.parse_args()

    if args.command == "check":
        cmd_check()
    elif args.command == "query":
        cmd_query(args.type)
    elif args.command == "setup-metabase":
        cmd_setup_metabase(args.url, args.user, args.password)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
