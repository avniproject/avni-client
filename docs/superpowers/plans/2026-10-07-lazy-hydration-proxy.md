# Lazy Hydration Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On SQLite, load a row's detail only when something reads it, batched across the result set, so org rules that run JavaScript over `db.objects(X)` stop paying a depth-3 build of every row.

**Architecture:** A new `LazyGroup` holds the raw rows of one query (or of one batched reference/list load). Rows are built on access into plain objects whose scalars are converted at once and whose references, lists and embedded JSON are memoised getters. The first read of a reference or list on any row loads it for every row of the group with one `IN` query and makes the loaded rows a child group, so nesting batches too. `SqliteResultsProxy` runs only the SQL and hands out rows from the group. The old eager path stays only as the reference the parity tests compare against.

**Tech Stack:** React Native 0.77 app, JavaScript (Babel), op-sqlite on device, better-sqlite3 via `test/helpers/nodeSqliteAdapter.js` in Jest integration tests, openchs-models entity classes.

**Spec:** `docs/superpowers/specs/2026-10-07-lazy-hydration-proxy-design.md`

## Global Constraints

- Branch `18.0`. Work happens in `packages/openchs-android`.
- Do not commit. The user commits only when they ask (`CLAUDE.md`). Commit format when asked: `#2080 | One-line summary`.
- Realm is untouched: no change under `src/framework/db/RealmFactory.js`, `src/repository/RealmRepository.js` or any Realm path.
- Every card number, list and line-list must equal today's SQLite eager result, including row order.
- Model classes (openchs-models) are not changed.
- Comments: one short line, only for a non-obvious why; no multi-line blocks (`CLAUDE.md`). Exception agreed with the user: each piece of the eager path kept only for parity tests carries a one-line comment `// Eager path kept only as the parity tests' reference; remove with #2080's follow-up once lazy hydration has proven out in the field.`
- Run unit tests with Node 20 or 24: `source ~/.nvm/nvm.sh && nvm use 24 && yarn jest --selectProjects unit <path>`. Integration tests need Node 24 (better-sqlite3 is built for ABI 137): `nvm use 24 && yarn jest --selectProjects integration --testPathPattern <name>`. Use `yarn`, not `npm`/`npx`.
- SQLite caps bound parameters at 999 per statement: chunk every `IN (…)`.

## Review Focus

1. A reference read across more than 999 rows must still be correct and cost `ceil(n/999)` queries — pinned in Task 3.
2. Copying a lazy object (`{...entity.that}`, as sync's `General.pick` and `cloneForEdit` do) fires every getter once; for a one-row group that must cost at most one query per reference and list property, never a recursive walk — pinned in Task 6.
3. Edit-and-save of an entity read lazily must write back exactly the stored values of every property the code never read — pinned in Task 6.
4. A row object read after the dashboard query cache has ended (`endQueryCache`) must still resolve its references — pinned in Task 7.
5. An empty result set, and a reference whose target table does not exist, must behave as today (zero rows; `{uuid}` placeholder) without throwing — pinned in Tasks 2 and 3.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/framework/db/HydrationValues.js` | Create | Value helpers shared by the eager hydrator and lazy groups: SQLite→JS conversion, safe JSON parse, unresolved-reference test, the user-subject placeholder address |
| `src/framework/db/LazyGroup.js` | Create | One batch group: raw rows, built-object memo, batched references and lists, lazy getters, `LAZY_STATE` |
| `src/framework/db/EntityHydrator.js` | Modify | Factory and services lazy groups use (`createLazyGroup`, `selectIn`, `cachedReference`, `parseEmbedded`, `resolveJsonUuidArray`, `ensureConceptCache`, `lazyStats`), `flatten()` for unread lazy properties, the test-only `eagerReferenceMode` |
| `src/framework/db/SqliteResultsProxy.js` | Modify | Execute SQL only, hand out rows from the group, query cache holds the group, eager path kept as `_executeEager()` |
| `src/framework/db/SqliteProxy.js` | Modify | `objectForPrimaryKey` and `create`'s re-read build through a one-row group; `takeLazyStats()` |
| `src/service/RuleEvaluationService.js` | Modify | `RulePerf` line also prints the lazy-load counters for the rule |
| `test/integration/framework/db/lazyFixture.js` | Create | Seeded real-schema SQLite database plus a SELECT counter, shared by the integration tests |
| `test/integration/framework/db/LazyGroupTest.js` | Create | Group behaviour on real SQLite (Tasks 2–6) |
| `test/integration/framework/db/LazyResultsProxyTest.js` | Create | Proxy and point-lookup behaviour on real SQLite (Tasks 7–8) |
| `test/integration/framework/db/LazyEagerParitySweepTest.js` | Create | Every property of every row, lazy against eager |
| `test/integration/rules/ReportCardLazyParityTest.js` | Create | Org report-card rules, lazy against eager, on a supplied snapshot |
| `test/framework/db/SqliteResultsProxyTest.js`, `test/framework/db/SqliteResultsProxyFallbackTest.js` | Modify | Mock hydrators gain `createLazyGroup`; the depth-3 hydration test becomes a lazy one |
| `test/integration/framework/db/IncludedListBatchPreloadTest.js`, `SubjectListHydrationTest.js`, `SearchHydrationTest.js` | Modify | "Opted-in list is a plain array" becomes "opted-in list costs one batched query" |
| `docs/RealmToSqliteOverview.md` | Modify | "Hydration Modes & Depths" describes lazy groups |

---

### Task 1: Shared value helpers

Moves four private helpers out of `EntityHydrator.js` so `LazyGroup` can use them without importing the hydrator (which will import `LazyGroup`). No behaviour change.

**Files:**
- Create: `src/framework/db/HydrationValues.js`
- Modify: `src/framework/db/EntityHydrator.js` (top-of-file `restoreUserSubjectPlaceholderAddress` and the bottom helpers `isUnresolvedReference`, `parseJsonSafe`, `convertSqliteValue`)
- Test: existing `test/framework/db/EntityHydratorTest.js`, `test/framework/db/LazyListHydrationTest.js`, `test/framework/db/JsonArrayListPropTest.js`

**Interfaces:**
- Produces: `convertSqliteValue(realmType, value)`, `parseJsonSafe(value)`, `isUnresolvedReference(ref)`, `placeholderAddressLevel()` (returns a fresh `{locationProperties: [], ...Individual.getPlaceholderAddressLevel().that}`), all named exports of `HydrationValues.js`.

- [ ] **Step 1: Create the helpers module**

```js
import _ from "lodash";
import {Individual} from "openchs-models";

export function convertSqliteValue(realmType, value) {
    if (_.isNil(value)) return null;

    switch (realmType) {
        case "date":
            return typeof value === "number" ? new Date(value) : value;
        case "bool":
            return typeof value === "number" ? value !== 0 : !!value;
        case "int":
        case "float":
        case "double":
            return typeof value === "string" ? parseFloat(value) : value;
        case "decimal128":
            return value != null ? String(value) : null;
        default:
            return value;
    }
}

export function parseJsonSafe(value) {
    if (_.isNil(value)) return null;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch (e) {
        return null;
    }
}

// resolveReference returns a bare {uuid} on miss; drop those from JSON-array lists.
export function isUnresolvedReference(ref) {
    return ref == null || (typeof ref === "object" && Object.keys(ref).length === 1 && "uuid" in ref);
}

// The placeholder address is written as NULL; hand it back on read, as Realm does.
export function placeholderAddressLevel() {
    return {locationProperties: [], ...Individual.getPlaceholderAddressLevel().that};
}
```

- [ ] **Step 2: Point `EntityHydrator.js` at it**

Delete the bottom-of-file definitions of `isUnresolvedReference`, `parseJsonSafe` and `convertSqliteValue` (keep `convertToSqliteValue`, `flattenEmbedded`, `unwrapThat`). Add to the imports:

```js
import {convertSqliteValue, isUnresolvedReference, parseJsonSafe, placeholderAddressLevel} from "./HydrationValues";
```

Replace `restoreUserSubjectPlaceholderAddress` with:

```js
// The placeholder address is written as NULL (above); hand it back on read, as Realm does,
// so a user subject's address never reads as missing (fullAddress() does not null-check).
function restoreUserSubjectPlaceholderAddress(individual) {
    if (!_.isNil(individual.lowestAddressLevel)) return;
    if (_.get(individual, "subjectType.type") !== SubjectType.types.User) return;
    individual.lowestAddressLevel = placeholderAddressLevel();
}
```

- [ ] **Step 3: Run the hydrator tests**

Run: `cd packages/openchs-android && source ~/.nvm/nvm.sh && nvm use 24 && yarn jest --selectProjects unit test/framework/db`
Expected: PASS, same count as before the change (all suites in `test/framework/db`).

---

### Task 2: Lazy group — rows built on access, scalars, null references

**Files:**
- Create: `src/framework/db/LazyGroup.js`
- Modify: `src/framework/db/EntityHydrator.js` (constructor; new methods after `hydrateAll`)
- Create: `test/integration/framework/db/lazyFixture.js`
- Create: `test/integration/framework/db/LazyGroupTest.js`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces:
  - `LazyGroup` (default export) with `constructor(hydrator, schemaName, rows, parentLink = null)`, `size` (getter), `buildAt(index) → object|null`, `buildAll() → object[]`, `buildByUuid(uuid) → object|undefined`.
  - `LAZY_STATE` (named export, a `Symbol`): every built object has a non-enumerable `[LAZY_STATE] = {row, group, resolved: Set<propName>}`.
  - `EntityHydrator#createLazyGroup(schemaName, rows) → LazyGroup`, `EntityHydrator#lazyStats` (`{rowsBuilt, inQueries, embeddedParsed}`), `EntityHydrator#takeLazyStats() → {rowsBuilt, inQueries, embeddedParsed}` (returns and resets).
  - Fixture: `openSeededDb() → {rawDb, proxy, hydrator, selects, rowsOf(table)}` where `selects` is an array of SELECT statements run since the last `selects.length = 0`, and `rowsOf(table)` returns raw rows ordered by rowid without being counted.

- [ ] **Step 1: Create the shared fixture**

`test/integration/framework/db/lazyFixture.js`:

```js
import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

const at = new Date("2026-09-01T10:00:00.000Z");
const weight = (kg) => [{concept: {uuid: "c-weight"}, valueJSON: JSON.stringify({answer: kg})}];

export const SEED = [
    ["Gender", {uuid: "g-f", name: "Female", voided: false}],
    ["SubjectType", {uuid: "st-person", name: "Person", type: "Person", voided: false}],
    ["SubjectType", {uuid: "st-household", name: "Household", type: "Household", group: true, household: true, voided: false}],
    ["SubjectType", {uuid: "st-user", name: "User", type: "User", voided: false}],
    ["EncounterType", {uuid: "et-visit", name: "Visit", voided: false}],
    ["Program", {uuid: "pr-mother", name: "Mother", voided: false}],
    ["Concept", {uuid: "c-weight", name: "Weight", datatype: "Numeric", voided: false}],
    ["GroupRole", {uuid: "gr-member", role: "Member", voided: false}],
    ["ApprovalStatus", {uuid: "as-approved", status: "Approved", voided: false}],
    ["IndividualRelationshipType", {uuid: "rt-spouse", name: "Spouse", voided: false}],
    ["Individual", {uuid: "ind-1", firstName: "Asha", subjectType: {uuid: "st-person"}, gender: {uuid: "g-f"}, registrationDate: at, voided: false, observations: weight(50)}],
    ["Individual", {uuid: "ind-2", firstName: "Bina", subjectType: {uuid: "st-person"}, gender: {uuid: "g-f"}, registrationDate: at, voided: false, observations: []}],
    ["Individual", {uuid: "ind-hh", firstName: "Home", subjectType: {uuid: "st-household"}, registrationDate: at, voided: false, observations: []}],
    ["Individual", {uuid: "ind-user", firstName: "Worker", subjectType: {uuid: "st-user"}, registrationDate: at, voided: false, observations: []}],
    ["EntityApprovalStatus", {uuid: "eas-1a", entityUUID: "enc-1a", entityType: "Encounter", approvalStatus: {uuid: "as-approved"}, statusDateTime: at, voided: false, observations: []}],
    ["Encounter", {uuid: "enc-1a", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-1"}, encounterDateTime: at, voided: false, observations: weight(51), latestEntityApprovalStatus: {uuid: "eas-1a"}}],
    ["Encounter", {uuid: "enc-1b", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-1"}, encounterDateTime: at, voided: false, observations: weight(52)}],
    ["Encounter", {uuid: "enc-2a", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-2"}, encounterDateTime: at, voided: false, observations: weight(60)}],
    ["Encounter", {uuid: "enc-orphan", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-missing"}, voided: false, observations: []}],
    ["ProgramEnrolment", {uuid: "enl-1", program: {uuid: "pr-mother"}, individual: {uuid: "ind-1"}, enrolmentDateTime: at, voided: false, observations: []}],
    ["ProgramEnrolment", {uuid: "enl-2", program: {uuid: "pr-mother"}, individual: {uuid: "ind-2"}, enrolmentDateTime: at, voided: false, observations: []}],
    ["ProgramEncounter", {uuid: "pe-1a", encounterType: {uuid: "et-visit"}, programEnrolment: {uuid: "enl-1"}, voided: false, observations: []}],
    ["ProgramEncounter", {uuid: "pe-1b", encounterType: {uuid: "et-visit"}, programEnrolment: {uuid: "enl-1"}, voided: false, observations: []}],
    ["ProgramEncounter", {uuid: "pe-2a", encounterType: {uuid: "et-visit"}, programEnrolment: {uuid: "enl-2"}, voided: false, observations: []}],
    ["GroupSubject", {uuid: "gs-1", groupSubject: {uuid: "ind-hh"}, memberSubject: {uuid: "ind-1"}, groupRole: {uuid: "gr-member"}, membershipStartDate: at, voided: false}],
    ["IndividualRelationship", {uuid: "rel-1", relationship: {uuid: "rt-spouse"}, individualA: {uuid: "ind-1"}, individualB: {uuid: "ind-2"}, enterDateTime: at, voided: false}],
    ["ReportCard", {uuid: "rc-1", name: "Persons", colour: "#fff", voided: false, standardReportCardInputSubjectTypes: [{uuid: "st-person"}]}],
];

export function openSeededDb(extraSeed = []) {
    const rawDb = open({});
    const cfg = EntityMappingConfig.getInstance();
    const tableMetaMap = SchemaGenerator.generateAll(cfg);
    const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
    rawDb.executeSync("PRAGMA foreign_keys = OFF");
    for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
    const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);
    proxy.write(() => [...SEED, ...extraSeed].forEach(([schema, data]) => proxy.create(schema, data, true, {skipHydration: true})));
    proxy.ensureReferenceCacheBuilt();

    const execute = rawDb.executeSync.bind(rawDb);
    const selects = [];
    rawDb.executeSync = (sql, params) => {
        if (/^\s*SELECT/i.test(sql)) selects.push(sql);
        return execute(sql, params);
    };
    const rowsOf = (table) => execute(`SELECT * FROM ${table} ORDER BY rowid`).rows;
    return {rawDb, proxy, hydrator: proxy.hydrator, selects, rowsOf};
}

export const selectsFrom = (selects, table) => selects.filter(sql => new RegExp(`FROM ${table}\\b`).test(sql)).length;
```

- [ ] **Step 2: Write the failing tests**

`test/integration/framework/db/LazyGroupTest.js`:

```js
import {openSeededDb, selectsFrom} from "./lazyFixture";

describe("LazyGroup", () => {
    let db;

    beforeEach(() => {
        db = openSeededDb();
        db.hydrator.takeLazyStats();
        db.selects.length = 0;
    });

    afterEach(() => db.rawDb.close());

    const encounterGroup = () => db.hydrator.createLazyGroup("Encounter", db.rowsOf("encounter"));

    describe("rows", () => {
        it("builds nothing until a row is read, and each row once", () => {
            const group = encounterGroup();
            expect(group.size).toBe(4);
            expect(db.hydrator.lazyStats.rowsBuilt).toBe(0);

            const first = group.buildAt(1);
            expect(group.buildAt(1)).toBe(first);
            expect(db.hydrator.lazyStats.rowsBuilt).toBe(1);
        });

        it("converts scalars as the eager hydrator does", () => {
            const encounter = encounterGroup().buildAt(0);
            expect(encounter.uuid).toBe("enc-1a");
            expect(encounter.voided).toBe(false);
            expect(encounter.encounterDateTime).toEqual(new Date("2026-09-01T10:00:00.000Z"));
        });

        it("reads a null reference as null without a query", () => {
            const encounter = encounterGroup().buildAt(1);
            expect(encounter.latestEntityApprovalStatus).toBeNull();
            expect(Object.getOwnPropertyDescriptor(encounter, "latestEntityApprovalStatus").get).toBeUndefined();
            expect(db.selects).toEqual([]);
        });

        it("returns null outside the group", () => {
            const group = encounterGroup();
            expect(group.buildAt(-1)).toBeNull();
            expect(group.buildAt(4)).toBeNull();
        });

        it("finds a row by uuid, and nothing for an unknown one", () => {
            const group = encounterGroup();
            expect(group.buildByUuid("enc-2a").uuid).toBe("enc-2a");
            expect(group.buildByUuid("enc-2a")).toBe(group.buildAt(2));
            expect(group.buildByUuid("nope")).toBeUndefined();
        });

        it("hides its bookkeeping from enumeration", () => {
            const encounter = encounterGroup().buildAt(0);
            expect(Object.keys(encounter)).not.toContain("row");
            expect(Object.getOwnPropertySymbols(encounter).length).toBe(1);
        });
    });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `cd packages/openchs-android && source ~/.nvm/nvm.sh && nvm use 24 && yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: FAIL with `db.hydrator.createLazyGroup is not a function` (and `takeLazyStats is not a function`).

- [ ] **Step 4: Create `LazyGroup.js` (rows and scalars only; later tasks fill in references, lists and embedded values)**

```js
import _ from "lodash";
import {EMBEDDED_SCHEMA_NAMES, JSON_UUID_ARRAY_LIST_PROPERTIES} from "./SchemaGenerator";
import {camelToSnake, normalizeRealmType} from "./SqliteUtils";
import {convertSqliteValue} from "./HydrationValues";

export const LAZY_STATE = Symbol("lazyState");

// Memoised once read; a throw leaves it unresolved so the next read retries.
function defineLazy(target, state, propName, resolve) {
    let value;
    Object.defineProperty(target, propName, {
        enumerable: true,
        configurable: true,
        get: () => {
            if (!state.resolved.has(propName)) {
                value = resolve();
                state.resolved.add(propName);
            }
            return value;
        },
        set: (newValue) => {
            value = newValue;
            state.resolved.add(propName);
        },
    });
}

class LazyGroup {
    constructor(hydrator, schemaName, rows, parentLink = null) {
        this.hydrator = hydrator;
        this.schemaName = schemaName;
        this.rows = rows;
        this.parentLink = parentLink;
        this._built = new Array(rows.length);
        this._indexByUuid = null;
        this._referenceGroups = new Map();
        this._listGroups = new Map();
    }

    get size() {
        return this.rows.length;
    }

    buildAt(index) {
        if (index < 0 || index >= this.rows.length) return null;
        if (this._built[index] === undefined) {
            this._built[index] = this._build(this.rows[index]);
            this.hydrator.lazyStats.rowsBuilt++;
        }
        return this._built[index];
    }

    buildAll() {
        return this.rows.map((row, index) => this.buildAt(index));
    }

    buildByUuid(uuid) {
        if (!this._indexByUuid) {
            this._indexByUuid = new Map();
            this.rows.forEach((row, index) => {
                if (!_.isNil(row.uuid) && !this._indexByUuid.has(row.uuid)) this._indexByUuid.set(row.uuid, index);
            });
        }
        const index = this._indexByUuid.get(uuid);
        return index === undefined ? undefined : this.buildAt(index);
    }

    _build(row) {
        const schema = this.hydrator.realmSchemaMap.get(this.schemaName);
        if (!schema) return row;
        const target = {};
        const state = {row, group: this, resolved: new Set()};
        Object.defineProperty(target, LAZY_STATE, {value: state, enumerable: false});

        const properties = schema.properties || {};
        Object.keys(properties).forEach(propName => {
            const propDef = properties[propName];
            const type = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
            const objectType = typeof propDef === "object" ? propDef.objectType : null;
            const column = camelToSnake(propName);

            if (type === "object" && objectType) {
                if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    defineLazy(target, state, propName, () => this.hydrator.parseEmbedded(row[column], objectType, false));
                } else {
                    const fkColumn = `${column}_uuid`;
                    const fk = row[fkColumn];
                    if (_.isNil(fk)) target[propName] = null;
                    else defineLazy(target, state, propName, () => this._reference(objectType, fkColumn, fk));
                }
            } else if (type === "list") {
                const jsonArrayKey = `${this.schemaName}.${propName}`;
                if (Object.prototype.hasOwnProperty.call(JSON_UUID_ARRAY_LIST_PROPERTIES, jsonArrayKey)) {
                    defineLazy(target, state, propName, () => this.hydrator.resolveJsonUuidArray(row[column], JSON_UUID_ARRAY_LIST_PROPERTIES[jsonArrayKey]));
                } else if (objectType && EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                    defineLazy(target, state, propName, () => this.hydrator.parseEmbedded(row[column], objectType, true));
                } else if (objectType) {
                    defineLazy(target, state, propName, () => this._list(propName, objectType, row.uuid));
                } else {
                    target[propName] = [];
                }
            } else {
                target[propName] = convertSqliteValue(type, row[column]);
            }
        });
        return target;
    }

    _reference(objectType, fkColumn, fk) {
        throw new Error(`LazyGroup: references not implemented (${objectType}.${fkColumn}=${fk})`);
    }

    _list(propName, childSchemaName, parentUuid) {
        throw new Error(`LazyGroup: lists not implemented (${this.schemaName}.${propName})`);
    }
}

export default LazyGroup;
```

- [ ] **Step 5: Add the factory and counters to `EntityHydrator`**

Add `import LazyGroup from "./LazyGroup";` to the imports. At the end of the constructor:

```js
        this.lazyStats = {rowsBuilt: 0, inQueries: 0, embeddedParsed: 0};
```

After `hydrateAll(...)`:

```js
    createLazyGroup(schemaName, rows) {
        return new LazyGroup(this, schemaName, rows || []);
    }

    takeLazyStats() {
        const taken = {...this.lazyStats};
        this.lazyStats = {rowsBuilt: 0, inQueries: 0, embeddedParsed: 0};
        return taken;
    }
```

- [ ] **Step 6: Run the tests**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: PASS (6 tests).

---

### Task 3: Batched references

**Files:**
- Modify: `src/framework/db/LazyGroup.js` (`_reference`)
- Modify: `src/framework/db/EntityHydrator.js` (`selectIn`, `cachedReference`)
- Test: `test/integration/framework/db/LazyGroupTest.js`

**Interfaces:**
- Consumes: `LazyGroup` from Task 2.
- Produces: `EntityHydrator#selectIn(schemaName, column, values) → rows[]` (chunked at 999, `[]` when the table is unknown or `values` empty, increments `lazyStats.inQueries` once per statement); `EntityHydrator#cachedReference(schemaName, uuid) → object|undefined`.

- [ ] **Step 1: Write the failing tests** (add inside the top `describe`)

```js
    describe("references", () => {
        it("loads a reference for every row of the group with one query", () => {
            const group = encounterGroup();
            const names = [0, 1, 2].map(i => group.buildAt(i).individual.firstName);

            expect(names).toEqual(["Asha", "Asha", "Bina"]);
            expect(selectsFrom(db.selects, "individual")).toBe(1);
            expect(group.buildAt(0).individual).toBe(group.buildAt(1).individual);
        });

        it("batches nested references level by level", () => {
            const group = db.hydrator.createLazyGroup("ProgramEncounter", db.rowsOf("program_encounter"));
            const names = [0, 1, 2].map(i => group.buildAt(i).programEnrolment.individual.firstName);

            expect(names).toEqual(["Asha", "Asha", "Bina"]);
            expect(selectsFrom(db.selects, "program_enrolment")).toBe(1);
            expect(selectsFrom(db.selects, "individual")).toBe(1);
        });

        it("serves reference data from the cache without a query", () => {
            const encounter = encounterGroup().buildAt(0);
            expect(encounter.encounterType.name).toBe("Visit");
            expect(selectsFrom(db.selects, "encounter_type")).toBe(0);
        });

        it("gives a missing row the {uuid} placeholder, as the eager hydrator does", () => {
            const orphan = encounterGroup().buildAt(3);
            expect(orphan.individual).toEqual({uuid: "ind-missing"});
        });

        it("chunks a reference load above SQLite's 999-parameter limit", () => {
            const many = Array.from({length: 1200}, (_x, i) => ["Individual", {uuid: `bulk-${i}`, firstName: `B${i}`, subjectType: {uuid: "st-person"}, registrationDate: new Date(0), voided: false, observations: []}]);
            const visits = many.map(([, ind], i) => ["Encounter", {uuid: `bulk-enc-${i}`, encounterType: {uuid: "et-visit"}, individual: {uuid: ind.uuid}, voided: false, observations: []}]);
            db.rawDb.close();
            db = openSeededDb([...many, ...visits]);
            db.selects.length = 0;

            const group = db.hydrator.createLazyGroup("Encounter", db.rowsOf("encounter"));
            const last = group.buildAt(group.size - 1);

            expect(last.individual.firstName).toBe("B1199");
            expect(selectsFrom(db.selects, "individual")).toBe(2);
        });
    });
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: FAIL with `LazyGroup: references not implemented`.

- [ ] **Step 3: Add `selectIn` and `cachedReference` to `EntityHydrator`** (after `takeLazyStats`)

```js
    cachedReference(schemaName, uuid) {
        const cache = this.referenceDataCache[schemaName];
        return cache ? cache.get(uuid) : undefined;
    }

    selectIn(schemaName, column, values) {
        const tableMeta = this.tableMetaMap.get(schemaName);
        if (!tableMeta || values.length === 0) return [];
        const rows = [];
        for (let i = 0; i < values.length; i += IN_CHUNK_SIZE) {
            const chunk = values.slice(i, i + IN_CHUNK_SIZE);
            const placeholders = chunk.map(() => "?").join(", ");
            const chunkRows = this.executeQuery(`SELECT * FROM ${tableMeta.tableName} WHERE "${column}" IN (${placeholders})`, chunk);
            this.lazyStats.inQueries++;
            if (chunkRows) rows.push(...chunkRows);
        }
        return rows;
    }
```

Add near the other module constants: `const IN_CHUNK_SIZE = 999;`

- [ ] **Step 4: Implement `_reference` in `LazyGroup`** (replace the throwing stub)

```js
    _reference(objectType, fkColumn, fk) {
        const cached = this.hydrator.cachedReference(objectType, fk);
        if (cached) return cached;

        let referenced = this._referenceGroups.get(fkColumn);
        if (!referenced) {
            const uuids = _.uniq(this.rows.map(row => row[fkColumn]))
                .filter(uuid => !_.isNil(uuid) && !this.hydrator.cachedReference(objectType, uuid));
            referenced = new LazyGroup(this.hydrator, objectType, this.hydrator.selectIn(objectType, "uuid", uuids));
            this._referenceGroups.set(fkColumn, referenced);
        }
        const built = referenced.buildByUuid(fk);
        return built === undefined ? {uuid: fk} : built;
    }
```

- [ ] **Step 5: Run the tests**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: PASS (11 tests).

---

### Task 4: Batched lists and back-references

**Files:**
- Modify: `src/framework/db/LazyGroup.js` (`_list`, back-reference branch in `_reference`)
- Test: `test/integration/framework/db/LazyGroupTest.js`

**Interfaces:**
- Consumes: `EntityHydrator#selectIn`, `EntityHydrator#findChildFkColumn(parentSchemaName, childSchemaName, childTableMeta, parentListPropName) → string|null` (existing).
- Produces: `parentLink` shape `{group: LazyGroup, fkColumn: string}` on child groups made by list loads.

- [ ] **Step 1: Write the failing tests**

```js
    describe("lists", () => {
        const individualGroup = () => db.hydrator.createLazyGroup("Individual", db.rowsOf("individual"));

        it("loads a list for every row of the group with one query, in today's order", () => {
            const group = individualGroup();
            const visits = [0, 1].map(i => group.buildAt(i).encounters.map(e => e.uuid));

            expect(visits).toEqual([["enc-1a", "enc-1b"], ["enc-2a"]]);
            expect(selectsFrom(db.selects, "encounter")).toBe(1);
        });

        it("answers a child's reference to its parent from the parent, without a query", () => {
            const asha = individualGroup().buildAt(0);
            db.selects.length = 0;

            expect(asha.encounters[0].individual).toBe(asha);
            expect(selectsFrom(db.selects, "individual")).toBe(0);
        });

        it("batches nested lists level by level", () => {
            const group = individualGroup();
            const counts = [0, 1].map(i => group.buildAt(i).enrolments.map(enl => enl.encounters.length));

            expect(counts).toEqual([[2], [1]]);
            expect(selectsFrom(db.selects, "program_enrolment")).toBe(1);
            expect(selectsFrom(db.selects, "program_encounter")).toBe(1);
        });

        it("follows the explicit foreign key for lists with two links back to the parent", () => {
            const group = individualGroup();
            const asha = group.buildAt(0);
            const household = group.buildAt(2);

            expect(asha.groups.map(gs => gs.uuid)).toEqual(["gs-1"]);
            expect(household.groupSubjects.map(gs => gs.memberSubject.uuid)).toEqual(["ind-1"]);
            expect(asha.groupSubjects).toEqual([]);
        });

        it("reads an empty list as empty, not as unloaded", () => {
            expect(individualGroup().buildAt(3).encounters).toEqual([]);
        });

        it("gives a list on a schema without a table an empty array", () => {
            const group = db.hydrator.createLazyGroup("Individual", db.rowsOf("individual"));
            db.hydrator.tableMetaMap.delete("Comment");
            expect(group.buildAt(0).comments).toEqual([]);
        });
    });
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: FAIL with `LazyGroup: lists not implemented`.

- [ ] **Step 3: Implement `_list` in `LazyGroup`** (replace the throwing stub)

```js
    _list(propName, childSchemaName, parentUuid) {
        if (_.isNil(parentUuid)) return [];
        if (!this._listGroups.has(propName)) this._listGroups.set(propName, this._loadList(propName, childSchemaName));
        const loaded = this._listGroups.get(propName);
        if (!loaded) return [];
        return (loaded.indicesByParent.get(parentUuid) || []).map(index => loaded.group.buildAt(index));
    }

    _loadList(propName, childSchemaName) {
        const childTableMeta = this.hydrator.tableMetaMap.get(childSchemaName);
        if (!childTableMeta) return null;
        const fkColumn = this.hydrator.findChildFkColumn(this.schemaName, childSchemaName, childTableMeta, propName);
        if (!fkColumn) return null;

        const parentUuids = _.uniq(this.rows.map(row => row.uuid).filter(uuid => !_.isNil(uuid)));
        const rows = this.hydrator.selectIn(childSchemaName, fkColumn, parentUuids);
        const indicesByParent = new Map();
        rows.forEach((row, index) => {
            const parentUuid = row[fkColumn];
            if (!indicesByParent.has(parentUuid)) indicesByParent.set(parentUuid, []);
            indicesByParent.get(parentUuid).push(index);
        });
        return {group: new LazyGroup(this.hydrator, childSchemaName, rows, {group: this, fkColumn}), indicesByParent};
    }
```

- [ ] **Step 4: Answer back-references from the parent group** — first lines of `_reference`, before the cache lookup:

```js
        const parent = this.parentLink;
        if (parent && parent.fkColumn === fkColumn && parent.group.schemaName === objectType) {
            const built = parent.group.buildByUuid(fk);
            if (built !== undefined) return built;
        }
```

- [ ] **Step 5: Run the tests**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: PASS (17 tests).

---

### Task 5: Embedded values, concepts, JSON uuid-array lists, placeholder address

**Files:**
- Modify: `src/framework/db/EntityHydrator.js` (`parseEmbedded`, `resolveJsonUuidArray`, `ensureConceptCache`)
- Modify: `src/framework/db/LazyGroup.js` (Individual placeholder address)
- Test: `test/integration/framework/db/LazyGroupTest.js`

**Interfaces:**
- Consumes: `EntityHydrator#_hydrateEmbedded(data, schemaName)`, `EntityHydrator#resolveReference(...)`, `EntityHydrator#buildReferenceCache(configs)` (existing); `placeholderAddressLevel()` (Task 1).
- Produces: `EntityHydrator#parseEmbedded(value, objectType, isList)`, `EntityHydrator#resolveJsonUuidArray(value, childType)`, `EntityHydrator#ensureConceptCache()`.

- [ ] **Step 1: Write the failing tests**

```js
    describe("embedded values", () => {
        it("parses observations only when read", () => {
            const group = encounterGroup();
            group.buildAll();
            expect(db.hydrator.lazyStats.embeddedParsed).toBe(0);

            const observations = group.buildAt(0).observations;
            expect(db.hydrator.lazyStats.embeddedParsed).toBe(1);
            expect(JSON.parse(observations[0].valueJSON)).toEqual({answer: 51});
        });

        it("resolves observation concepts from the concept cache, built once on first need", () => {
            delete db.hydrator.referenceDataCache.Concept;
            const group = encounterGroup();
            const names = [0, 1, 2].map(i => group.buildAt(i).observations[0].concept.name);

            expect(names).toEqual(["Weight", "Weight", "Weight"]);
            expect(selectsFrom(db.selects, "concept")).toBe(1);
        });

        it("resolves a JSON uuid-array list through the reference cache", () => {
            const card = db.hydrator.createLazyGroup("ReportCard", db.rowsOf("report_card")).buildAt(0);
            expect(card.standardReportCardInputSubjectTypes.map(st => st.name)).toEqual(["Person"]);
        });

        it("gives a user subject without an address the placeholder address, and a person none", () => {
            const group = db.hydrator.createLazyGroup("Individual", db.rowsOf("individual"));
            expect(group.buildAt(3).lowestAddressLevel.locationProperties).toEqual([]);
            expect(group.buildAt(0).lowestAddressLevel).toBeNull();
        });
    });
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: FAIL with `this.hydrator.parseEmbedded is not a function` and the placeholder test failing on `null`.

- [ ] **Step 3: Add the three hydrator methods** (after `selectIn`)

```js
    parseEmbedded(value, objectType, isList) {
        this.lazyStats.embeddedParsed++;
        if (objectType === "Observation") this.ensureConceptCache();
        const parsed = parseJsonSafe(value);
        if (isList) return (parsed || []).map(item => item != null ? this._hydrateEmbedded(item, objectType) : null);
        return parsed != null ? this._hydrateEmbedded(parsed, objectType) : null;
    }

    resolveJsonUuidArray(value, childType) {
        const parsed = parseJsonSafe(value) || [];
        if (!childType) return parsed;
        return parsed.map(uuid => this.resolveReference(childType, uuid, 0)).filter(ref => !isUnresolvedReference(ref));
    }

    // Sync builds this after every sync; after an app restart the first observation read builds it.
    ensureConceptCache() {
        if (this.referenceDataCache.Concept || !this.tableMetaMap.get("Concept")) return;
        this.buildReferenceCache([{schemaName: "Concept", depth: 2, skipLists: false}]);
    }
```

- [ ] **Step 4: Placeholder address in `LazyGroup._build`** — at the end of `_build`, before `return target;`, add the import `import {Individual, SubjectType} from "openchs-models";` and `placeholderAddressLevel` to the `./HydrationValues` import, then:

```js
        if (this.schemaName === Individual.schema.name && _.isNil(row.lowest_address_level_uuid)) {
            defineLazy(target, state, "lowestAddressLevel", () =>
                _.get(target, "subjectType.type") === SubjectType.types.User ? placeholderAddressLevel() : null);
        }
```

- [ ] **Step 5: Run the tests**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: PASS (21 tests).

---

### Task 6: Getter semantics and writes

**Files:**
- Modify: `src/framework/db/EntityHydrator.js` (`flatten`)
- Test: `test/integration/framework/db/LazyGroupTest.js`

**Interfaces:**
- Consumes: `LAZY_STATE` from Task 2.
- Produces: `flatten()` that, for a property of a lazy object not yet read or assigned, writes the stored column value without triggering the load.

- [ ] **Step 1: Write the failing tests**

```js
    describe("getters and writes", () => {
        it("lets a failed read be retried", () => {
            const encounter = encounterGroup().buildAt(0);
            const selectIn = jest.spyOn(db.hydrator, "selectIn").mockImplementationOnce(() => { throw new Error("database is locked"); });

            expect(() => encounter.individual).toThrow("database is locked");
            expect(encounter.individual.firstName).toBe("Asha");
            selectIn.mockRestore();
        });

        it("keeps an assigned value", () => {
            const encounter = encounterGroup().buildAt(0);
            encounter.individual = {uuid: "ind-2"};
            expect(encounter.individual).toEqual({uuid: "ind-2"});
            expect(selectsFrom(db.selects, "individual")).toBe(0);
        });

        it("flattens an unread lazy object to its stored row without loading anything", () => {
            const stored = db.rowsOf("encounter")[0];
            const encounter = encounterGroup().buildAt(0);

            const flat = db.hydrator.flatten("Encounter", encounter);

            expect(db.selects).toEqual([]);
            expect(flat.individual_uuid).toBe(stored.individual_uuid);
            expect(flat.latest_entity_approval_status_uuid).toBe(stored.latest_entity_approval_status_uuid);
            expect(flat.observations).toBe(stored.observations);
            expect(flat.encounter_date_time).toBe(stored.encounter_date_time);
        });

        it("saves an edited lazy object with every unread value unchanged", () => {
            const before = db.rowsOf("encounter")[0];
            const encounter = encounterGroup().buildAt(0);
            encounter.voided = true;

            db.proxy.write(() => db.proxy.create("Encounter", encounter, true, {skipHydration: true}));

            expect(db.rowsOf("encounter")[0]).toEqual({...before, voided: 1});
        });

        it("costs at most one query per property when a one-row object is copied", () => {
            const individual = db.hydrator.createLazyGroup("Individual", db.rowsOf("individual").slice(0, 1)).buildAt(0);
            const copy = {...individual};

            expect(copy.encounters.map(e => e.uuid)).toEqual(["enc-1a", "enc-1b"]);
            const perTable = db.selects.reduce((acc, sql) => {
                const table = sql.match(/FROM (\w+)/)[1];
                return {...acc, [table]: (acc[table] || 0) + 1};
            }, {});
            Object.values(perTable).forEach(count => expect(count).toBeLessThanOrEqual(2));
        });
    });
```

(The last test allows 2 per table because `Individual` has two lists on `group_subject` — `groups` and `groupSubjects` — each loaded once.)

- [ ] **Step 2: Run them to see them fail**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: the flatten test FAILS (flatten reads the getters, so `db.selects` is not empty). The retry, assignment, save and copy tests already PASS — the save test passes today only because reading the getters happens to load the right values; it stays as the guard that Step 3 keeps them right.

- [ ] **Step 3: Teach `flatten()` about unread lazy properties**

Add `import {LAZY_STATE} from "./LazyGroup";` (merge with the existing `LazyGroup` import). In `flatten`, after `const data = entity.that || entity;`:

```js
        const lazy = data[LAZY_STATE];
        const unread = (propName) => lazy && !lazy.resolved.has(propName) && Object.getOwnPropertyDescriptor(data, propName)?.get;
```

In the referenced-object branch replace `const ref = data[propName];` and the `fkUuid` lines with:

```js
                    const fkColName = `${camelToSnake(propName)}_uuid`;
                    let fkUuid = null;
                    if (unread(propName)) {
                        fkUuid = lazy.row[fkColName];
                    } else {
                        const ref = data[propName];
                        if (ref && ref.uuid) fkUuid = ref.uuid;
                        else if (ref && typeof ref === "string") fkUuid = ref;
                    }
                    result[fkColName] = (fkUuid && DUMMY_UUIDS.has(fkUuid)) ? null : fkUuid;
```

An unread embedded or JSON-array property is written as its stored column, falling back to what the eager write produces for a missing value. As the first statement of the embedded-object branch (`if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {` under `resolvedType === "object"`):

```js
                    if (unread(propName)) {
                        result[camelToSnake(propName)] = lazy.row[camelToSnake(propName)] ?? null;
                        return;
                    }
```

As the first statement of the JSON-uuid-array branch (`if (Object.prototype.hasOwnProperty.call(JSON_UUID_ARRAY_LIST_PROPERTIES, jsonArrayKey)) {`):

```js
                    if (unread(propName)) {
                        result[camelToSnake(propName)] = lazy.row[camelToSnake(propName)] ?? "[]";
                        return;
                    }
```

As the first statement of the embedded-list branch (`} else if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {` under `resolvedType === "list"`):

```js
                    if (unread(propName)) {
                        result[camelToSnake(propName)] = lazy.row[camelToSnake(propName)] ?? "[]";
                        return;
                    }
```

(`return` inside the `forEach` callback skips to the next property.)

- [ ] **Step 4: Run the tests**

Run: `yarn jest --selectProjects integration --testPathPattern LazyGroupTest`
Expected: PASS (26 tests).

- [ ] **Step 5: Run the hydrator unit suites to confirm eager flatten is unchanged**

Run: `yarn jest --selectProjects unit test/framework/db/EntityHydratorTest.js`
Expected: PASS.

---

### Task 7: Results proxy serves rows from the group

**Files:**
- Modify: `src/framework/db/SqliteResultsProxy.js` (`_execute`, accessors, collection methods, iterator, `count()`)
- Modify: `src/framework/db/EntityHydrator.js` (constructor: `eagerReferenceMode`)
- Modify: `test/framework/db/SqliteResultsProxyTest.js` (mock hydrator; the "should call hydrator for each row" test)
- Modify: `test/framework/db/SqliteResultsProxyFallbackTest.js` (mock hydrator)
- Create: `test/integration/framework/db/LazyResultsProxyTest.js`

**Interfaces:**
- Consumes: `EntityHydrator#createLazyGroup` and the `LazyGroup` interface (`size`, `buildAt`, `buildAll`).
- Produces: `EntityHydrator#eagerReferenceMode` (boolean, default `false`, set only by parity tests); proxy internals `_group`, `_materialised`, `_entityCount()`, `_entityAt(index)`, `_getEntities()`.

- [ ] **Step 1: Give both mock hydrators a lazy group** — replace the whole `createMockHydrator` function in `SqliteResultsProxyTest.js` and in `SqliteResultsProxyFallbackTest.js` with this one (the fallback file's parameter was called `entityEnricher`; its call sites pass it positionally, so the rename is safe):

```js
function createMockHydrator(transform) {
    const hydrate = jest.fn((schemaName, row, opts) => transform ? transform(row) : {...row});
    return {
        beginHydrationSession: jest.fn(),
        endHydrationSession: jest.fn(),
        hydrate,
        createLazyGroup: jest.fn((schemaName, rows) => {
            const built = [];
            return {
                size: rows.length,
                buildAt(index) {
                    if (index < 0 || index >= rows.length) return null;
                    if (!(index in built)) built[index] = hydrate(schemaName, rows[index], {});
                    return built[index];
                },
                buildAll() {
                    return rows.map((row, index) => this.buildAt(index));
                },
            };
        }),
    };
}
```

- [ ] **Step 2: Replace the depth-3 hydration test** in `SqliteResultsProxyTest.js` ("should call hydrator for each row with correct options") with:

```js
        it("builds rows only when read", () => {
            const rows = [{uuid: "1"}, {uuid: "2"}];
            const {proxy, hydrator} = createProxy({rows});

            expect(proxy.length).toBe(2);
            expect(hydrator.hydrate).not.toHaveBeenCalled();

            expect(proxy[1].uuid).toBe("2");
            expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
            expect(hydrator.createLazyGroup).toHaveBeenCalledWith("Individual", rows);
        });
```

- [ ] **Step 3: Write the failing integration tests**

`test/integration/framework/db/LazyResultsProxyTest.js`:

```js
import {openSeededDb, selectsFrom} from "./lazyFixture";

describe("SqliteResultsProxy over lazy groups", () => {
    let db;

    beforeEach(() => {
        db = openSeededDb();
        db.hydrator.takeLazyStats();
        db.selects.length = 0;
    });

    afterEach(() => db.rawDb.close());

    it("answers .length from the query alone, and indexing builds one row", () => {
        const visits = db.proxy.objects("Encounter");
        expect(visits.length).toBe(4);
        expect(db.hydrator.lazyStats.rowsBuilt).toBe(0);

        expect(visits[2].uuid).toBe("enc-2a");
        expect(db.hydrator.lazyStats.rowsBuilt).toBe(1);
        expect(db.selects.length).toBe(1);
    });

    it("runs a rule-shaped filter with one query per level", () => {
        const visits = db.proxy.objects("Encounter")
            .filter(e => e.encounterType.name === "Visit" && e.individual.firstName === "Asha");

        expect(visits.map(e => e.uuid)).toEqual(["enc-1a", "enc-1b"]);
        expect(selectsFrom(db.selects, "encounter")).toBe(1);
        expect(selectsFrom(db.selects, "individual")).toBe(1);
    });

    it("applies a JS fallback filter to built rows", () => {
        const withWeight = db.proxy.objects("Encounter")
            .filtered('SUBQUERY(observations, $o, $o.concept.uuid = "c-weight").@count > 0');
        expect(withWeight.map(e => e.uuid)).toEqual(["enc-1a", "enc-1b", "enc-2a"]);
        expect(withWeight.length).toBe(3);
    });

    it("keeps today's order and slices lazily", () => {
        const sorted = db.proxy.objects("Individual").sorted("firstName", true);
        expect(sorted.slice(0, 2).map(i => i.firstName)).toEqual(["Worker", "Home"]);
        expect(db.hydrator.lazyStats.rowsBuilt).toBe(2);
        expect(Array.from(sorted).map(i => i.firstName)).toEqual(["Worker", "Home", "Bina", "Asha"]);
    });

    it("shares a cached group between identical queries, and still resolves after the cache ends", () => {
        db.proxy.beginQueryCache();
        const first = db.proxy.objects("Encounter").filtered("voided = false");
        const second = db.proxy.objects("Encounter").filtered("voided = false");
        expect(first.length).toBe(4);
        expect(second.length).toBe(4);
        db.proxy.endQueryCache();

        expect(selectsFrom(db.selects, "encounter")).toBe(1);
        expect(second[0].individual.firstName).toBe("Asha");
    });

    it("handles an empty result without building or querying further", () => {
        const none = db.proxy.objects("Encounter").filtered("uuid = $0", "nope");
        expect(none.length).toBe(0);
        expect(none.isEmpty()).toBe(true);
        expect([...none]).toEqual([]);
        expect(none[0]).toBeNull();
        expect(db.selects.length).toBe(1);
    });

    it("still materialises eagerly when the parity tests ask for the old path", () => {
        db.hydrator.eagerReferenceMode = true;
        const visits = db.proxy.objects("Encounter");
        expect(visits.length).toBe(4);
        expect(db.hydrator.lazyStats.rowsBuilt).toBe(0);
        expect(visits[0].individual.firstName).toBe("Asha");
    });
});
```

- [ ] **Step 4: Run them to see them fail**

Run: `yarn jest --selectProjects integration --testPathPattern LazyResultsProxyTest`
Expected: FAIL — `.length` builds rows today (`rowsBuilt` stays 0 only because the lazy path is not used; the first test fails on `selects.length` > 1 from the eager pre-load).

- [ ] **Step 5: Add the test-only switch to `EntityHydrator`'s constructor**

```js
        // Eager path kept only as the parity tests' reference; remove with #2080's follow-up once lazy hydration has proven out in the field.
        this.eagerReferenceMode = false;
```

- [ ] **Step 6: Rewrite execution in `SqliteResultsProxy.js`**

In the constructor, replace the `// Cached results` block with:

```js
        this._rows = null;
        this._group = null;
        this._materialised = null;
        this._executed = false;
```

Rename today's `_execute()` to `_executeEager()`, put the removal comment above it, and change it to end by setting `this._materialised = this._entities;` before `this._executed = true;` (every branch that sets `_executed = true`, including the cache-hit branch). Add the new `_execute()` above it:

```js
    _execute() {
        if (this._executed) return;
        if (this.hydrator && this.hydrator.eagerReferenceMode) return this._executeEager();

        const {sql, params} = this._buildSql();
        if (this.logQueries) {
            console.log("SqliteResultsProxy SQL:", sql, "params:", params);
        }

        const cacheKey = this._queryCache ? `${sql}|${JSON.stringify(params)}|lazy` : null;
        let group = cacheKey ? this._queryCache.get(cacheKey) : undefined;
        if (group) {
            General.logDebug("HydrationProfile", ` CACHE HIT ${this.schemaName} (${group.size} rows)`);
        } else {
            const t0 = Date.now();
            this._rows = this.executeQuery(sql, params) || [];
            if (!this.hydrator) {
                this._materialised = this._rows;
                this._executed = true;
                return;
            }
            group = this.hydrator.createLazyGroup(this.schemaName, this._rows);
            const elapsed = Date.now() - t0;
            if (elapsed > 2000) {
                General.logDebug("HydrationProfile", ` ${this.schemaName} (${this._rows.length} rows, lazy): query=${elapsed}ms`);
            }
            if (cacheKey) this._queryCache.set(cacheKey, group);
        }
        this._group = group;

        if (this.jsFallbackFilters.length > 0) {
            const tFallbackStart = Date.now();
            let entities = JsFallbackFilterEvaluator.apply(group.buildAll(), this.jsFallbackFilters, this.schemaName);
            const tFallbackEnd = Date.now();
            if (tFallbackEnd - tFallbackStart > 1000) {
                General.logDebug("HydrationProfile", ` ${this.schemaName} JS fallback: ${tFallbackEnd - tFallbackStart}ms (${this.jsFallbackFilters.map(f => f.query?.substring(0, 60)).join('; ')})`);
            }
            if (this.limitClause != null) entities = entities.slice(0, this.limitClause);
            this._materialised = entities;
        }
        this._executed = true;
    }

    _entityCount() {
        this._execute();
        return this._materialised ? this._materialised.length : this._group.size;
    }

    _entityAt(index) {
        this._execute();
        return this._materialised ? this._materialised[index] : this._group.buildAt(index);
    }
```

Replace `_getEntities()` with:

```js
    _getEntities() {
        this._execute();
        if (!this._materialised) this._materialised = this._group.buildAll();
        return this._materialised;
    }
```

- [ ] **Step 7: Route the accessors through it**

```js
    getAt(index) {
        if (index < 0 || index >= this._entityCount()) return null;
        const obj = this._entityAt(index);
        return _.isNil(obj) ? null : this.createEntity(obj);
    }

    getLength() {
        return this._entityCount();
    }
```

In `count()`, replace the fallback branch body with `return this._entityCount();`.

Replace `find`, `slice` and `[Symbol.iterator]` so they build only what they reach:

```js
    find(filterCallback, thisArg) {
        const count = this._entityCount();
        for (let i = 0; i < count; i++) {
            const entity = this.createEntity(this._entityAt(i));
            const result = thisArg
                ? filterCallback.call(thisArg, entity, i, this)
                : filterCallback(entity, i, this);
            if (result) return entity;
        }
        return undefined;
    }

    slice(start, end) {
        return _.range(this._entityCount()).slice(start, end).map(index => this.createEntity(this._entityAt(index)));
    }

    [Symbol.iterator]() {
        const count = this._entityCount();
        let index = 0;
        const self = this;
        return {
            next() {
                if (index < count) {
                    return {value: self.createEntity(self._entityAt(index++)), done: false};
                }
                return {done: true};
            },
        };
    }
```

Then run `grep -n "_entities\|_rows" src/framework/db/SqliteResultsProxy.js` and confirm the only remaining uses are inside `_executeEager()` and the constructor. `forEach`, `map`, `mapInternal`, `filter`, `filterInternal`, `some`, `every`, `join`, `asArray`, `distinctValues` and the raw-collection delegates keep calling `_getEntities()`.

- [ ] **Step 8: Move three existing tests from "prefetched" to "batched"**

Three integration tests assert that an opted-in list is a plain array (`isPrefetched(...) === true`). That was today's means of avoiding a query per row; the contract it protected is "one batched query, none per row", which lazy groups meet with a getter. Change exactly these lines:

`test/integration/framework/db/IncludedListBatchPreloadTest.js` — in `loadSubjects`, read every row's enrolments while statements are recorded:

```js
    const loadSubjects = () => {
        statements = [];
        const subjects = [...proxy.objects('Individual').withHydration(BADGES).filtered('voided = false')];
        subjects.forEach(subject => subject.enrolments.length);
        const sent = statements;
        statements = null;
        return {subjects, sent};
    };
```

in `'fetches the kept list without a query per row'` add after the existing expectations:

```js
        expect(sent.filter(sql => /FROM program_enrolment WHERE "individual_uuid" IN/.test(sql))).toHaveLength(1);
```

and in `'still gives every row its own enrolments'` delete the line `expect(isPrefetched(subject, 'enrolments')).toBe(true);`.

`test/integration/framework/db/SubjectListHydrationTest.js` — in `'prefetches the badge list with its programs resolved'` delete `expect(isPrefetched(individual, 'enrolments')).toBe(true);` and rename the test to `'resolves the badge list with its programs'`.

`test/integration/framework/db/SearchHydrationTest.js` — in `'resolves enrolments (with program) but leaves other lists skipped'` delete `expect(isPrefetched(result, 'enrolments')).toBe(true);`.

The `isPrefetched(...) === false` assertions in all three files stay: they still hold.

- [ ] **Step 9: Run the proxy suites and the hydration integration tests**

Run: `yarn jest --selectProjects integration --testPathPattern 'LazyResultsProxyTest|IncludedListBatchPreloadTest|SubjectListHydrationTest|SearchHydrationTest|UserSubjectAddressTest' && yarn jest --selectProjects unit test/framework/db`
Expected: PASS for all.

---

### Task 8: Point lookups and the rule-time counters

**Files:**
- Modify: `src/framework/db/SqliteProxy.js` (`objectForPrimaryKey`, the re-read at the end of `create`, new `takeLazyStats`)
- Modify: `src/service/RuleEvaluationService.js` (`runEvalRule`)
- Test: `test/integration/framework/db/LazyResultsProxyTest.js`

**Interfaces:**
- Consumes: `EntityHydrator#createLazyGroup`, `eagerReferenceMode`, `takeLazyStats`.
- Produces: `SqliteProxy#takeLazyStats() → {rowsBuilt, inQueries, embeddedParsed}`.

- [ ] **Step 1: Write the failing tests** (append to the `describe` in `LazyResultsProxyTest.js`)

```js
    it("looks a subject up by primary key without loading its graph", () => {
        const asha = db.proxy.objectForPrimaryKey("Individual", "ind-1");
        expect(asha.uuid).toBe("ind-1");
        expect(db.selects.length).toBe(1);
        expect(asha.encounters.length).toBe(2);
    });

    it("re-reads a saved entity lazily", () => {
        const saved = db.proxy.write(() => db.proxy.create("Encounter", {uuid: "enc-new", encounterType: {uuid: "et-visit"}, individual: {uuid: "ind-2"}, voided: false, observations: []}, true));
        db.selects.length = 0;
        expect(saved.individual.firstName).toBe("Bina");
        expect(selectsFrom(db.selects, "individual")).toBe(1);
    });

    it("reports and resets the counters", () => {
        db.proxy.objects("Encounter")[0].individual;
        expect(db.proxy.takeLazyStats()).toEqual({rowsBuilt: 2, inQueries: 1, embeddedParsed: 0});
        expect(db.proxy.takeLazyStats()).toEqual({rowsBuilt: 0, inQueries: 0, embeddedParsed: 0});
    });
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn jest --selectProjects integration --testPathPattern LazyResultsProxyTest`
Expected: FAIL — `objectForPrimaryKey` runs the eager pre-load (more than one SELECT), and `takeLazyStats is not a function`.

- [ ] **Step 3: Build point lookups through a one-row group** — in `objectForPrimaryKey`, replace the session block with:

```js
        if (this.hydrator.eagerReferenceMode) {
            // Eager path kept only as the parity tests' reference; remove with #2080's follow-up once lazy hydration has proven out in the field.
            this.hydrator.beginHydrationSession();
            try {
                return new entityClass(this.hydrator.hydrate(type, rows[0], this.hydrator.getDefaultHydrationOptions()));
            } finally {
                this.hydrator.endHydrationSession();
            }
        }
        return new entityClass(this.hydrator.createLazyGroup(type, rows).buildAt(0));
```

In `create`'s re-read, replace the two lines building `hydrated` with:

```js
            if (rows.length > 0) {
                const hydrated = this.hydrator.eagerReferenceMode
                    ? this.hydrator.hydrate(schemaName, rows[0], {skipLists: true, depth: 1})
                    : this.hydrator.createLazyGroup(schemaName, rows).buildAt(0);
                return new entityClass(hydrated);
            }
```

Add next to `setShallowMode`:

```js
    takeLazyStats() {
        return this.hydrator.takeLazyStats();
    }
```

- [ ] **Step 4: Print the counters with slow rules** — in `RuleEvaluationService.runEvalRule`:

```js
    runEvalRule(ruleFunc, params, ruleLabel) {
        const lazyStatsBefore = this.db && this.db.takeLazyStats ? this.db.takeLazyStats() : null;
        const start = Date.now();
        const result = ruleFunc(params);
        const elapsed = Date.now() - start;
        const lazyStats = lazyStatsBefore ? this.db.takeLazyStats() : null;
        if (elapsed > 50) {
            General.logWarn("RulePerf", `Eval rule [${ruleLabel}] took ${elapsed}ms${lazyStats ? ` (rowsBuilt=${lazyStats.rowsBuilt}, inQueries=${lazyStats.inQueries}, embeddedParsed=${lazyStats.embeddedParsed})` : ""}`);
        }
        return result;
    }
```

- [ ] **Step 5: Run the tests**

Run: `yarn jest --selectProjects integration --testPathPattern LazyResultsProxyTest`
Expected: PASS (10 tests).

---

### Task 9: Parity sweep — every property of every row, lazy against eager

**Files:**
- Create: `test/integration/framework/db/LazyEagerParitySweepTest.js`

**Interfaces:**
- Consumes: `openSeededDb` (Task 2), `eagerReferenceMode` (Task 7), `ensureConceptCache` (Task 5).
- Produces: a sweep that runs on the seeded database by default, and on any SQLite file given in `LAZY_PARITY_DB` (opened read-only; `LAZY_PARITY_MAX_ROWS` caps rows per table, default all).

- [ ] **Step 1: Write the sweep**

```js
/**
 * Every property of every row, read through the lazy path and through the eager path,
 * must be identical — list order included. Runs on a seeded database; point
 * LAZY_PARITY_DB at a device snapshot to sweep real data:
 *   LAZY_PARITY_DB=/path/avni_sqlite.db yarn jest --selectProjects integration --testPathPattern LazyEagerParitySweepTest
 */
import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {openSeededDb} from "./lazyFixture";

const Database = require("better-sqlite3");
const SNAPSHOT_DEPTH = 3;

function openSnapshot(path) {
    const db = new Database(path, {readonly: true, fileMustExist: true});
    const rawDb = {
        executeSync: (sql, params = []) => ({rows: /^\s*(SELECT|PRAGMA)/i.test(sql) ? db.prepare(sql).all(...params) : []}),
        close: () => db.close(),
    };
    const cfg = EntityMappingConfig.getInstance();
    const proxy = new SqliteProxy(rawDb, cfg, SchemaGenerator.generateAll(cfg), SchemaGenerator.buildRealmSchemaMap(cfg));
    proxy.ensureReferenceCacheBuilt();
    return {rawDb, proxy, hydrator: proxy.hydrator};
}

function snapshot(value, depth) {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) return {$date: value.getTime()};
    if (Array.isArray(value)) return value.map(item => snapshot(item, depth));
    if (typeof value === "object") {
        if (depth === 0) return {$uuid: value.uuid === undefined ? "?" : value.uuid};
        const out = {};
        Object.keys(value).sort().forEach(key => out[key] = snapshot(value[key], depth - 1));
        return out;
    }
    return value;
}

function rowsOf(proxy, schemaName, maxRows) {
    const results = proxy.objects(schemaName);
    const limited = maxRows ? results.filtered(`limit(${maxRows})`) : results;
    return Array.from(limited).map(entity => snapshot(entity.that, SNAPSHOT_DEPTH));
}

describe("lazy against eager, every row of every table", () => {
    const fromSnapshot = !!process.env.LAZY_PARITY_DB;
    const maxRows = Number(process.env.LAZY_PARITY_MAX_ROWS || 0);
    let db;

    beforeAll(() => {
        db = fromSnapshot ? openSnapshot(process.env.LAZY_PARITY_DB) : openSeededDb();
        db.hydrator.ensureConceptCache();
    });

    afterAll(() => db.rawDb.close());

    it("reads identically on both paths", () => {
        const mismatches = [];
        let rowsCompared = 0;
        Array.from(db.proxy.tableMetaMap.keys()).sort().forEach(schemaName => {
            db.hydrator.eagerReferenceMode = true;
            const eager = rowsOf(db.proxy, schemaName, maxRows);
            db.hydrator.eagerReferenceMode = false;
            const lazy = rowsOf(db.proxy, schemaName, maxRows);
            rowsCompared += eager.length;
            if (JSON.stringify(lazy) !== JSON.stringify(eager)) {
                const index = lazy.findIndex((row, i) => JSON.stringify(row) !== JSON.stringify(eager[i]));
                mismatches.push({schemaName, rows: [eager.length, lazy.length], firstDifferentRow: index, eager: eager[index], lazy: lazy[index]});
            }
        });
        console.log(`LazyEagerParitySweep: compared ${rowsCompared} rows across ${db.proxy.tableMetaMap.size} tables`);
        expect(mismatches).toEqual([]);
    }, fromSnapshot ? 60 * 60 * 1000 : 30 * 1000);
});
```

- [ ] **Step 2: Run it on the seeded database**

Run: `yarn jest --selectProjects integration --testPathPattern LazyEagerParitySweepTest`
Expected: PASS, with a log line `compared N rows across M tables` where N ≥ 30. If it fails, the `mismatches` entry names the schema, the first differing row and both snapshots: fix the lazy path in the task that owns that property, never the sweep.

- [ ] **Step 3: Run it on the local device dump**

Run: `LAZY_PARITY_DB=$(cd ../../.. && pwd)/db/avni_sqlite.db LAZY_PARITY_MAX_ROWS=500 yarn jest --selectProjects integration --testPathPattern LazyEagerParitySweepTest`
Expected: PASS. (`../db/avni_sqlite.db` relative to the repo root is the dump `make get_sqlite_db` writes; skip this step if it is absent and note it for the post-development run.)

---

### Task 10: Rule parity harness for a supplied snapshot

**Files:**
- Create: `test/integration/rules/ReportCardLazyParityTest.js`

**Interfaces:**
- Consumes: `eagerReferenceMode`; a read-only snapshot opened as in Task 9 (the `openSnapshot` function is repeated here because the files must stand alone).
- Produces: a harness that skips unless `LAZY_PARITY_DB` is set, runs every non-voided custom report card's rule on both paths, and requires identical outcomes.

- [ ] **Step 1: Write the harness**

```js
/**
 * Runs every custom report-card rule in a snapshot on the eager path and on the lazy
 * path, and requires the same card numbers and line-list uuids (or the same error).
 *   LAZY_PARITY_DB=/path/jscs.db yarn jest --selectProjects integration --testPathPattern ReportCardLazyParityTest
 */
import _ from "lodash";
import moment from "moment";
import * as rulesConfig from "rules-config";
import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";

const Database = require("better-sqlite3");

function healthModules() {
    try {
        return require("avni-health-modules");
    } catch (e) {
        return {};
    }
}

function openSnapshot(path) {
    const db = new Database(path, {readonly: true, fileMustExist: true});
    const rawDb = {
        executeSync: (sql, params = []) => ({rows: /^\s*(SELECT|PRAGMA)/i.test(sql) ? db.prepare(sql).all(...params) : []}),
        close: () => db.close(),
    };
    const cfg = EntityMappingConfig.getInstance();
    const proxy = new SqliteProxy(rawDb, cfg, SchemaGenerator.generateAll(cfg), SchemaGenerator.buildRealmSchemaMap(cfg));
    proxy.ensureReferenceCacheBuilt();
    return {rawDb, proxy};
}

const uuidsOf = (list) => Array.from(list || [], item => item && item.uuid);

function describeResult(result) {
    if (_.isNil(result)) return {value: null};
    if (typeof result === "number") return {count: result};
    if (Array.isArray(result.reportCards)) {
        return {cards: result.reportCards.map(card => ({
            primaryValue: card.primaryValue,
            secondaryValue: card.secondaryValue,
            lineList: _.isFunction(card.lineListFunction) ? uuidsOf(card.lineListFunction()) : null,
        }))};
    }
    if (result.length !== undefined) return {count: result.length, uuids: uuidsOf(result)};
    return {
        primaryValue: result.primaryValue,
        secondaryValue: result.secondaryValue,
        lineList: _.isFunction(result.lineListFunction) ? uuidsOf(result.lineListFunction()) : null,
    };
}

function outcome(run) {
    try {
        return describeResult(run());
    } catch (e) {
        return {error: String(e && e.message)};
    }
}

const describeIfSnapshot = process.env.LAZY_PARITY_DB ? describe : describe.skip;

describeIfSnapshot("report-card rules, lazy against eager", () => {
    let db;

    beforeAll(() => {
        db = openSnapshot(process.env.LAZY_PARITY_DB);
    });

    afterAll(() => db.rawDb.close());

    it("gives every card the same result on both paths", () => {
        const {common = {}, motherCalculations = {}} = healthModules();
        const imports = {rulesConfig, common, lodash: _, moment, motherCalculations, log: () => {}, globalFn: undefined};
        const cards = db.proxy.objects("ReportCard").filtered("voided = false").filter(card => !_.isEmpty(card.query));
        const user = db.proxy.objects("UserInfo")[0];
        const myUserGroups = db.proxy.objects("MyGroups");

        const runOn = (eager, card) => {
            db.proxy.hydrator.eagerReferenceMode = eager;
            const params = {ruleInput: null, db: db.proxy, services: {}, user, myUserGroups};
            const started = Date.now();
            const result = outcome(() => eval(card.query)({params, imports}));
            return {result, ms: Date.now() - started};
        };

        const report = cards.map(card => {
            const eager = runOn(true, card);
            const lazy = runOn(false, card);
            return {card: card.name, eagerMs: eager.ms, lazyMs: lazy.ms, same: _.isEqual(eager.result, lazy.result), eager: eager.result, lazy: lazy.result};
        });

        console.table(report.map(({card, eagerMs, lazyMs, same, eager}) => ({card, eagerMs, lazyMs, same, error: eager.error || ""})));
        expect(report.filter(row => !row.same)).toEqual([]);
    }, 60 * 60 * 1000);
});
```

- [ ] **Step 2: Confirm it skips cleanly without a snapshot**

Run: `yarn jest --selectProjects integration --testPathPattern ReportCardLazyParityTest`
Expected: `Tests: 1 skipped`.

- [ ] **Step 3: Run it on the local device dump**

Run: `LAZY_PARITY_DB=$(cd ../../.. && pwd)/db/avni_sqlite.db yarn jest --selectProjects integration --testPathPattern ReportCardLazyParityTest`
Expected: PASS with a table of cards (possibly empty if that dump's organisation has no custom cards). The JSCS and AKRSP snapshots are run after development, by the team, with the same command.

---

### Task 11: Docs, full suite, removal comments

**Files:**
- Modify: `docs/RealmToSqliteOverview.md` (section "Hydration Modes & Depths")

- [ ] **Step 1: Rewrite the hydration section** — replace the body of "Hydration Modes & Depths" with:

```markdown
## Hydration

SQLite reads are lazy. A query runs its SQL and keeps the raw rows in a `LazyGroup` (`src/framework/db/LazyGroup.js`). A row becomes a plain object only when it is indexed or iterated. Scalars are converted at once; references, lists and embedded JSON (observations) are getters that load on first read and are then memoised.

The first read of a reference or list on any row of a group loads it for every row of the group with one `IN (…)` query, chunked at 999, and the loaded rows form a child group, so nested reads batch the same way. A child reached through a list answers its reference back to the parent from the parent group without a query.

Reference data (Gender, SubjectType, Program, EncounterType, AddressLevel at first query; Concept on the first observation read; the post-sync set after every sync) is built eagerly once and served from `referenceDataCache`.

`withHydration(...)`, `depth`, `skipLists`, `listsToInclude` and sync's shallow mode no longer change what a read returns. `count()`, `max`, `min`, `sum` and `distinctValues` run as SQL and build no rows.

`flatten()` writes a lazy object's unread properties straight from its stored row, so saving an object never loads what the code did not read.

`EntityHydrator.eagerReferenceMode` switches back to the old depth-3 eager build. It exists only so the parity tests can compare against it and is not set by the app.
```

- [ ] **Step 2: Check every kept eager piece carries the removal comment**

Run: `grep -rn "Eager path kept only as the parity tests' reference" src/framework/db`
Expected: three hits — `EntityHydrator.js` (constructor), `SqliteResultsProxy.js` (above `_executeEager`), `SqliteProxy.js` (`objectForPrimaryKey`). Add the line wherever one is missing.

- [ ] **Step 3: Check what a backend switch does to rows already handed out**

Read `GlobalContext.switchBackend` (`src/GlobalContext.js`, around `:148`) and `SqliteProxy.close`. Record in the hand-back whether switching away from SQLite closes the connection. If it does, a lazy getter read afterwards on a row a screen still holds throws `database is closed`; today's lazy lists (#2061) already share that exposure, so it is reported, not fixed here, unless the switch path renders lists after closing — in which case report the screen.

- [ ] **Step 4: Run the whole suite**

Run: `cd packages/openchs-android && source ~/.nvm/nvm.sh && nvm use 24 && yarn jest`
Expected: all suites pass except known skips (`Test Suites: … passed`, the parity harness counted as skipped).

- [ ] **Step 5: Hand back for the post-development checks**

Report to the user: the diff summary (`git diff --stat`), test counts, the sweep's "compared N rows" line, the backend-switch finding from Step 3, and that the following are theirs to run next — the parity sweep and rule parity on the JSCS and AKRSP snapshots (`LAZY_PARITY_DB=…`), then the on-device runs (JSCS Facilities, Total Screened, search; AKRSP WIMC card open and the first card after start; Realm, SQLite eager and SQLite lazy in one sitting, reading the `RulePerf … rowsBuilt=… inQueries=…` lines). Do not commit.
