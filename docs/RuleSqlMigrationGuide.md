# Report Card Rule Migration Guide: Realm to SQLite

## Overview

When the app runs on SQLite, report card rules can use the `exec*` API on `params.db` to execute SQL directly, bypassing entity hydration. This reduces dashboard card execution from minutes to milliseconds for count-only cards.

Rules must continue to work on both Realm and SQLite. Use `params.db.isSqlite` to branch.

## Standard Pattern: `execReport`

Use `execReport` for any report card that returns a count with a clickable line list:

```javascript
'use strict';
({params, imports}) => {
    if (params.db.isSqlite) {
        const whereSql = `
            FROM individual i
            JOIN subject_type st ON st.uuid = i.subject_type_uuid
            WHERE i.voided = 0
            AND st.type = 'Person'
        `;
        return params.db.execReport(
            'SELECT COUNT(*) ' + whereSql, [],
            'SELECT i.uuid ' + whereSql, [],
            'Individual'
        );
    }
    // Realm fallback
    return params.db.objects('Individual')
        .filtered('voided = false AND subjectType.type = $0', 'Person');
};
```

**How it works:**
- `execReport(countSql, countParams, listSql, listParams, schemaName)` returns `{primaryValue, lineListFunction}`
- The count SQL executes immediately (~1-5ms)
- The list SQL + hydration only runs when the user taps the card
- Line list entities are hydrated at depth 1 (scalars + FK references, no child lists)

## Available `exec*` Methods

All methods are on `params.db` and only available when `params.db.isSqlite` is true.

| Method | Returns | Use case |
|---|---|---|
| `execReport(countSql, countParams, listSql, listParams, schemaName)` | `{primaryValue, lineListFunction}` | Standard report card pattern |
| `execCount(sql, params)` | `number` | Count-only (no line list needed) |
| `execQuery(sql, params)` | `[{col: val, ...}, ...]` | Raw rows, no hydration |
| `execCountEntities(schemaName, whereSql, params)` | `number` | Count with auto table name |
| `execFindObservationValue(schemaName, entityUuid, conceptNameOrUuid)` | value or `null` | Observation lookup via JSON |

## Table and Column Naming

SQLite tables and columns use snake_case derived from the Realm schema:

| Realm Schema/Property | SQLite Table/Column |
|---|---|
| `Individual` | `individual` |
| `ProgramEnrolment` | `program_enrolment` |
| `ProgramEncounter` | `program_encounter` |
| `Encounter` | `encounter` |
| `EncounterType` | `encounter_type` |
| `SubjectType` | `subject_type` |
| `AddressLevel` | `address_level` |
| `dateOfBirth` | `date_of_birth` |
| `subjectType` (FK) | `subject_type_uuid` |
| `lowestAddressLevel` (FK) | `lowest_address_level_uuid` |
| `programEnrolment` (FK) | `program_enrolment_uuid` |
| `encounterType` (FK) | `encounter_type_uuid` |
| `voided` | `voided` (0/1 integer) |
| `observations` | `observations` (JSON text) |

**Date columns** store epoch milliseconds as INTEGER.

## Common SQL Patterns

### Count individuals enrolled in a program

```javascript
const whereSql = `
    FROM individual i
    JOIN program_enrolment pe ON pe.individual_uuid = i.uuid
    JOIN program p ON p.uuid = pe.program_uuid
    WHERE i.voided = 0
    AND pe.voided = 0
    AND pe.program_exit_date_time IS NULL
    AND p.name = ?
`;
return params.db.execReport(
    'SELECT COUNT(DISTINCT i.uuid) ' + whereSql, ['Pregnancy'],
    'SELECT DISTINCT i.uuid ' + whereSql, ['Pregnancy'],
    'Individual'
);
```

### Count individuals NOT enrolled

```javascript
const whereSql = `
    FROM individual i
    JOIN subject_type st ON st.uuid = i.subject_type_uuid
    WHERE i.voided = 0
    AND st.type = 'Person'
    AND i.uuid NOT IN (
        SELECT individual_uuid FROM program_enrolment WHERE voided = 0
    )
`;
return params.db.execReport(
    'SELECT COUNT(*) ' + whereSql, [],
    'SELECT i.uuid ' + whereSql, [],
    'Individual'
);
```

### Scheduled encounters this month

```javascript
const whereSql = `
    FROM program_encounter enc
    JOIN program_enrolment pe ON pe.uuid = enc.program_enrolment_uuid
    JOIN program p ON p.uuid = pe.program_uuid
    JOIN encounter_type et ON et.uuid = enc.encounter_type_uuid
    WHERE p.name = ? AND et.name = ?
    AND enc.voided = 0 AND pe.voided = 0
    AND pe.program_exit_date_time IS NULL
    AND enc.encounter_date_time IS NULL
    AND enc.cancel_date_time IS NULL
    AND enc.earliest_visit_date_time IS NOT NULL
    AND strftime('%Y-%m', enc.earliest_visit_date_time/1000, 'unixepoch') = strftime('%Y-%m', 'now')
`;
return params.db.execReport(
    'SELECT COUNT(DISTINCT pe.individual_uuid) ' + whereSql, ['Hypertension', 'Hypertension Followup'],
    'SELECT DISTINCT pe.individual_uuid AS uuid ' + whereSql, ['Hypertension', 'Hypertension Followup'],
    'Individual'
);
```

### Completed encounters this month

```javascript
const whereSql = `
    FROM program_encounter enc
    JOIN program_enrolment pe ON pe.uuid = enc.program_enrolment_uuid
    JOIN program p ON p.uuid = pe.program_uuid
    JOIN encounter_type et ON et.uuid = enc.encounter_type_uuid
    WHERE p.name = ? AND et.name = ?
    AND enc.voided = 0 AND pe.voided = 0
    AND enc.encounter_date_time IS NOT NULL
    AND enc.cancel_date_time IS NULL
    AND strftime('%Y-%m', enc.encounter_date_time/1000, 'unixepoch') = strftime('%Y-%m', 'now')
`;
return params.db.execReport(
    'SELECT COUNT(DISTINCT pe.individual_uuid) ' + whereSql, ['Hypertension', 'Hypertension Followup'],
    'SELECT DISTINCT pe.individual_uuid AS uuid ' + whereSql, ['Hypertension', 'Hypertension Followup'],
    'Individual'
);
```

### Cancelled encounters this month

```javascript
// Same as completed but filter on cancel_date_time instead of encounter_date_time
AND enc.cancel_date_time IS NOT NULL
AND enc.encounter_date_time IS NULL
AND strftime('%Y-%m', enc.cancel_date_time/1000, 'unixepoch') = strftime('%Y-%m', 'now')
```

### Filter by observation value (concept UUID + answer)

```javascript
const whereSql = `
    FROM program_enrolment pe
    JOIN program p ON p.uuid = pe.program_uuid
    JOIN individual i ON i.uuid = pe.individual_uuid
    WHERE p.name = 'Pregnancy'
    AND pe.voided = 0 AND i.voided = 0
    AND pe.program_exit_date_time IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM json_each(pe.program_exit_observations) AS obs
        WHERE json_extract(obs.value, '$.concept.uuid') = '9518f70d-351a-44f0-b3f8-9af412db74af'
        AND obs.value LIKE '%c125eec0-2bc4-4add-b1d0-7531e5ffa9c8%'
    )
    AND strftime('%Y-%m', pe.program_exit_date_time/1000, 'unixepoch') = strftime('%Y-%m', 'now')
`;
return params.db.execReport(
    'SELECT COUNT(DISTINCT i.uuid) ' + whereSql, [],
    'SELECT DISTINCT i.uuid ' + whereSql, [],
    'Individual'
);
```

### Referral check (observation value in encounters)

```javascript
const whereSql = `
    FROM program_encounter enc
    JOIN program_enrolment pe ON pe.uuid = enc.program_enrolment_uuid
    JOIN program p ON p.uuid = pe.program_uuid
    JOIN individual i ON i.uuid = pe.individual_uuid
    WHERE p.name = ?
    AND enc.voided = 0 AND pe.voided = 0 AND i.voided = 0
    AND enc.encounter_date_time IS NOT NULL
    AND strftime('%Y-%m', enc.encounter_date_time/1000, 'unixepoch') = strftime('%Y-%m', 'now')
    AND EXISTS (
        SELECT 1 FROM json_each(enc.observations) AS obs
        WHERE json_extract(obs.value, '$.concept.uuid') = ?
        AND obs.value LIKE '%Yes%'
    )
`;
return params.db.execReport(
    'SELECT COUNT(DISTINCT i.uuid) ' + whereSql, ['Epilepsy', '<referral-concept-uuid>'],
    'SELECT DISTINCT i.uuid ' + whereSql, ['Epilepsy', '<referral-concept-uuid>'],
    'Individual'
);
```

## Observation JSON Structure

Observations are stored as a JSON array in TEXT columns:

```json
[
  {"concept": {"uuid": "abc-123"}, "valueJSON": "{\"answer\": 65.5}"},
  {"concept": {"uuid": "def-456"}, "valueJSON": "{\"answer\": \"coded-answer-uuid\"}"}
]
```

To query observations in SQL:
- **Check if concept exists:** `observations LIKE '%<concept-uuid>%'`
- **Extract value via json_each:** `json_extract(obs.value, '$.concept.uuid')` and `json_extract(obs.value, '$.valueJSON')`
- **Coded answer check:** `obs.value LIKE '%<answer-concept-uuid>%'`

Use `execFindObservationValue(schemaName, entityUuid, conceptNameOrUuid)` for single-entity observation lookups.

## Date Handling

Dates are stored as epoch milliseconds (INTEGER). Use SQLite date functions:

| Rule Pattern | SQL Equivalent |
|---|---|
| This month | `strftime('%Y-%m', col/1000, 'unixepoch') = strftime('%Y-%m', 'now')` |
| This year | `strftime('%Y', col/1000, 'unixepoch') = strftime('%Y', 'now')` |
| Last N days | `col > (strftime('%s', 'now') - N*86400) * 1000` |
| Date range | `col BETWEEN ? AND ?` (pass epoch ms) |
| Age in years | `(strftime('%s', 'now') * 1000 - date_of_birth) / (365.25*86400000)` |

## Tips

1. **Always use parameterized queries** (`?` placeholders) — never concatenate user values into SQL strings.
2. **Use `DISTINCT`** when joining through enrolments/encounters to avoid counting individuals multiple times.
3. **Share the WHERE clause** between count and list SQL to ensure consistency.
4. **Test counts match** — compare `execCount` result with the Realm path result during development.
5. **FK columns end in `_uuid`** — e.g., `individual_uuid`, `program_uuid`, `encounter_type_uuid`.
6. **Boolean columns are 0/1** — use `voided = 0` not `voided = false`.
