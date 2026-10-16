import _ from "lodash";
import {Individual, ModelGeneral, Point, SubjectLocation} from "openchs-models";
import {camelToSnake, normalizeRealmType} from "./SqliteUtils";
import {convertToSqliteValue, DUMMY_UUIDS, flattenEmbedded, unwrapThat} from "./EntityHydrator";

// What each model's fromResource assigns, field for field (avni-models v1.33.86), so a row carries
// exactly the columns flatten(fromResource(resource)) carries. One difference is intended: a link is
// read from the download, so a parent that is not on the phone keeps its uuid, where fromResource,
// finding no parent, leaves the column NULL (#2145).
const AUDIT_LINKS = {createdBy: "createdBy", createdByUUID: "createdByUUID", lastModifiedBy: "lastModifiedBy", lastModifiedByUUID: "lastModifiedByUUID"};

const SPECS = {
    // Individual.js:415-452
    Individual: {
        direct: ["uuid", "firstName", "middleName", "lastName", "profilePicture", "dateOfBirthVerified", "voided"],
        dates: ["dateOfBirth", "registrationDate"],
        observations: ["observations"],
        links: {gender: "genderUUID", lowestAddressLevel: "addressUUID", subjectType: "subjectTypeUUID"},
        locations: {registrationLocation: Point, subjectLocation: SubjectLocation},
        linkValues: AUDIT_LINKS,
        // fromResource sets the name before the subject type (Individual.js:444, 449), so nameString
        // always takes the person branch: every subject, households and users included, gets the full name.
        computed: {name: (resource) => Individual.getFullName(resource)},
    },
};

export const DIRECT_ROW_SCHEMAS = Object.keys(SPECS);

// ResourceUtil.getFieldValue (avni-models src/utility/ResourceUtil.js:8-10)
const linkValue = (resource, name) => _.get(resource, ["_links", name, "href"]);

class SqliteRowMapper {
    constructor(realmSchemaMap, entityService) {
        this.realmSchemaMap = realmSchemaMap;
        this.entityService = entityService;
        this.plans = new Map();
    }

    static covers(schemaName) {
        return _.has(SPECS, schemaName);
    }

    mapResourceToRow(schemaName, resource) {
        const plan = this._planFor(schemaName);
        const row = {};
        plan.scalars.forEach(({column, type, defaultValue, read}) => {
            const value = read(resource);
            // flatten applies the schema default to a nil value (EntityHydrator.js:1002-1006)
            row[column] = convertToSqliteValue(type, _.isNil(value) && defaultValue !== undefined ? defaultValue : value);
        });
        plan.links.forEach(({column, link}) => {
            const uuid = linkValue(resource, link);
            row[column] = (!uuid || DUMMY_UUIDS.has(uuid)) ? null : uuid;
        });
        plan.locations.forEach(({column, property, embeddedSchema, fromResource}) => {
            if (_.isNil(resource[property])) return;
            row[column] = JSON.stringify(flattenEmbedded(unwrapThat(fromResource(resource[property])), embeddedSchema, this.realmSchemaMap));
        });
        plan.observations.forEach(({column, property, embeddedSchema}) => {
            const holder = ModelGeneral.assignObsFields(resource, {}, [property], this.entityService);
            row[column] = JSON.stringify(holder[property].map((observation) => flattenEmbedded(unwrapThat(observation), embeddedSchema, this.realmSchemaMap)));
        });
        return row;
    }

    _planFor(schemaName) {
        if (this.plans.has(schemaName)) return this.plans.get(schemaName);
        const spec = SPECS[schemaName];
        if (!spec) throw new Error(`SqliteRowMapper: no row plan for "${schemaName}"`);
        const properties = this.realmSchemaMap.get(schemaName).properties;
        const definition = (property) => {
            const def = properties[property];
            if (_.isNil(def)) throw new Error(`SqliteRowMapper: ${schemaName} has no property "${property}"`);
            return typeof def === "string" ? {type: def} : def;
        };
        const scalar = (property, read) => {
            const def = definition(property);
            return {column: camelToSnake(property), type: normalizeRealmType(def.type), defaultValue: def.default, read};
        };
        const plan = {
            scalars: [
                ...(spec.direct || []).map((property) => scalar(property, (resource) => resource[property])),
                ...(spec.dates || []).map((property) => scalar(property, (resource) => _.isNil(resource[property]) ? null : new Date(resource[property]))),
                ..._.map(spec.linkValues || {}, (link, property) => scalar(property, (resource) => linkValue(resource, link))),
                ..._.map(spec.computed || {}, (compute, property) => scalar(property, compute)),
            ],
            links: _.map(spec.links || {}, (link, property) => {
                definition(property);
                return {column: `${camelToSnake(property)}_uuid`, link};
            }),
            locations: _.map(spec.locations || {}, (entityClass, property) => ({
                column: camelToSnake(property), property, embeddedSchema: definition(property).objectType,
                fromResource: (value) => entityClass.fromResource(value),
            })),
            observations: (spec.observations || []).map((property) => ({
                column: camelToSnake(property), property, embeddedSchema: definition(property).objectType,
            })),
        };
        this.plans.set(schemaName, plan);
        return plan;
    }
}

export default SqliteRowMapper;
