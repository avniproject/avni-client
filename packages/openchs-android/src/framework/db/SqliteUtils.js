/**
 * Utility functions for converting between Realm schema conventions and SQLite naming.
 * Used by SchemaGenerator (Phase 2) and RealmQueryParser (Phase 3+).
 */

function camelToSnake(str) {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")   // ABCDef → ABC_Def
        .replace(/([a-z\d])([A-Z])/g, "$1_$2")        // abcDef → abc_Def
        .toLowerCase();
}

function schemaNameToTableName(schemaName) {
    return camelToSnake(schemaName);
}

function normalizeRealmType(realmType) {
    if (typeof realmType === "string" && realmType.endsWith("?")) {
        return realmType.slice(0, -1);
    }
    return realmType;
}

export {camelToSnake, schemaNameToTableName, normalizeRealmType};
