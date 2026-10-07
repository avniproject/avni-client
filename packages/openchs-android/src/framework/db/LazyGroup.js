import _ from "lodash";
import {EMBEDDED_SCHEMA_NAMES, JSON_UUID_ARRAY_LIST_PROPERTIES} from "./SchemaGenerator";
import {camelToSnake, normalizeRealmType} from "./SqliteUtils";
import {Individual, SubjectType} from "openchs-models";
import {convertSqliteValue, placeholderAddressLevel} from "./HydrationValues";

export const LAZY_STATE = Symbol("lazyState");

// Matches SQLite's 999-parameter cap, so a window's batched load is one IN query.
export const WINDOW_SIZE = 999;

// Shared by every row until one of its properties resolves; saves a Map per unread row.
const NOTHING_RESOLVED = {has: () => false, get: () => undefined};

// One getter/setter pair per schema property, shared by all rows: per-row closures doubled the heap.
// Memoised once read; a throw leaves it unresolved so the next read retries.
function sharedAccessor(propName, resolve) {
    return {
        enumerable: true,
        configurable: true,
        get() {
            const state = this[LAZY_STATE];
            if (!state.resolved.has(propName)) {
                const value = resolve(state, this);
                if (state.resolved === NOTHING_RESOLVED) state.resolved = new Map();
                state.resolved.set(propName, value);
            }
            return state.resolved.get(propName);
        },
        set(value) {
            const state = this[LAZY_STATE];
            if (state.resolved === NOTHING_RESOLVED) state.resolved = new Map();
            state.resolved.set(propName, value);
        },
    };
}

const placeholderAddressAccessor = sharedAccessor("lowestAddressLevel", (state, target) =>
    _.get(target, "subjectType.type") === SubjectType.types.User ? placeholderAddressLevel() : null);

function buildPlan(schema, schemaName) {
    const properties = schema.properties || {};
    return Object.keys(properties).map(propName => {
        const propDef = properties[propName];
        const type = normalizeRealmType(typeof propDef === "string" ? propDef : propDef.type);
        const objectType = typeof propDef === "object" ? propDef.objectType : null;
        const column = camelToSnake(propName);

        if (type === "object" && objectType) {
            if (EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                return {propName, accessor: sharedAccessor(propName, state => state.group.hydrator.parseEmbedded(state.row[column], objectType, false))};
            }
            const fkColumn = `${column}_uuid`;
            return {
                propName, fkColumn,
                accessor: sharedAccessor(propName, state => state.group._reference(objectType, fkColumn, state.row[fkColumn])),
            };
        }
        if (type === "list") {
            const jsonArrayKey = `${schemaName}.${propName}`;
            if (Object.prototype.hasOwnProperty.call(JSON_UUID_ARRAY_LIST_PROPERTIES, jsonArrayKey)) {
                const childType = JSON_UUID_ARRAY_LIST_PROPERTIES[jsonArrayKey];
                return {propName, accessor: sharedAccessor(propName, state => state.group.hydrator.resolveJsonUuidArray(state.row[column], childType))};
            }
            if (objectType && EMBEDDED_SCHEMA_NAMES.has(objectType)) {
                return {propName, accessor: sharedAccessor(propName, state => state.group.hydrator.parseEmbedded(state.row[column], objectType, true))};
            }
            if (objectType) {
                return {propName, accessor: sharedAccessor(propName, state => state.group._list(propName, objectType, state.row.uuid))};
            }
            return {propName, emptyList: true};
        }
        return {propName, scalarType: type, column};
    });
}

function planFor(hydrator, schemaName) {
    if (!hydrator._lazyPlans) hydrator._lazyPlans = new Map();
    if (!hydrator._lazyPlans.has(schemaName)) {
        const schema = hydrator.realmSchemaMap.get(schemaName);
        hydrator._lazyPlans.set(schemaName, schema ? buildPlan(schema, schemaName) : null);
    }
    return hydrator._lazyPlans.get(schemaName);
}

// Up to WINDOW_SIZE rows. A row holds only its window, so keeping a few rows keeps a window, not the whole result.
class LazyWindow {
    constructor(hydrator, schemaName, rows, parentLink) {
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
        const plan = planFor(this.hydrator, this.schemaName);
        if (!plan) return row;
        const target = {};
        Object.defineProperty(target, LAZY_STATE, {value: {row, group: this, resolved: NOTHING_RESOLVED}, enumerable: false});
        for (const step of plan) {
            if (step.scalarType) target[step.propName] = convertSqliteValue(step.scalarType, row[step.column]);
            else if (step.emptyList) target[step.propName] = [];
            else if (step.fkColumn && _.isNil(row[step.fkColumn])) target[step.propName] = null;
            else Object.defineProperty(target, step.propName, step.accessor);
        }
        if (this.schemaName === Individual.schema.name && _.isNil(row.lowest_address_level_uuid)) {
            Object.defineProperty(target, "lowestAddressLevel", placeholderAddressAccessor);
        }
        return target;
    }

    _reference(objectType, fkColumn, fk) {
        const parent = this.parentLink;
        if (parent && parent.fkColumn === fkColumn && parent.group.schemaName === objectType) {
            const built = parent.group.buildByUuid(fk);
            if (built !== undefined) return built;
        }

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
}

class LazyGroup {
    constructor(hydrator, schemaName, rows, parentLink = null) {
        this.schemaName = schemaName;
        this.size = rows.length;
        this._windows = _.chunk(rows, WINDOW_SIZE).map(chunk => new LazyWindow(hydrator, schemaName, chunk, parentLink));
        this._windowByUuid = null;
    }

    buildAt(index) {
        if (index < 0 || index >= this.size) return null;
        return this._windows[Math.floor(index / WINDOW_SIZE)].buildAt(index % WINDOW_SIZE);
    }

    buildAll() {
        return _.flatMap(this._windows, window => window.rows.map((row, index) => window.buildAt(index)));
    }

    buildByUuid(uuid) {
        if (this._windows.length === 1) return this._windows[0].buildByUuid(uuid);
        if (!this._windowByUuid) {
            this._windowByUuid = new Map();
            this._windows.forEach(window => window.rows.forEach(row => {
                if (!_.isNil(row.uuid) && !this._windowByUuid.has(row.uuid)) this._windowByUuid.set(row.uuid, window);
            }));
        }
        const window = this._windowByUuid.get(uuid);
        return window === undefined ? undefined : window.buildByUuid(uuid);
    }
}

export default LazyGroup;
