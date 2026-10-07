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
