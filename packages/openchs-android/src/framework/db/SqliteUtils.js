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

// SQLCipher derives the cipher key from the passphrase string itself, so the same
// hex string must be used everywhere a key is supplied (open and ATTACH ... KEY).
function encryptionKeyToHex(encryptionKey) {
    if (typeof encryptionKey === "string") return encryptionKey;
    const bytes = encryptionKey instanceof ArrayBuffer ? new Uint8Array(encryptionKey) : encryptionKey;
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

export {camelToSnake, schemaNameToTableName, normalizeRealmType, encryptionKeyToHex};
