import {EntityMappingConfig} from "openchs-models";
import {SchemaGenerator} from "../../../src/framework/db/SchemaGenerator";
import RealmQueryParser from "../../../src/framework/db/RealmQueryParser";
import EntityHydrator from "../../../src/framework/db/EntityHydrator";
import JsFallbackFilterEvaluator from "../../../src/framework/db/JsFallbackFilterEvaluator";
import SqliteResultsProxy from "../../../src/framework/db/SqliteResultsProxy";
import {camelToSnake, schemaNameToTableName} from "../../../src/framework/db/SqliteUtils";

// --- Helpers ---

function generateMockRow(tableMeta) {
    const row = {};
    tableMeta.columns.forEach(col => {
        if (col.isPrimaryKey) row[col.name] = `uuid-${Math.random().toString(36).substring(7)}`;
        else if (col.sqlType === "TEXT") row[col.name] = col.fkTable ? `fk-${Math.random().toString(36).substring(7)}` : "test-value";
        else if (col.sqlType === "INTEGER") row[col.name] = col.name === "voided" ? 0 : Date.now();
        else if (col.sqlType === "REAL") row[col.name] = Math.random() * 100;
        else row[col.name] = null;
    });
    return row;
}

function generateMockRows(tableMeta, count) {
    return Array.from({length: count}, () => generateMockRow(tableMeta));
}

function timeIt(label, fn, iterations = 1) {
    const start = Date.now();
    let result;
    for (let i = 0; i < iterations; i++) {
        result = fn();
    }
    const elapsed = Date.now() - start;
    const perIteration = iterations > 1 ? ` (${(elapsed / iterations).toFixed(2)}ms/iter)` : "";
    console.log(`  ${label}: ${elapsed}ms${perIteration}`);
    return {elapsed, result};
}

// --- Tests ---

describe("Performance benchmarks", () => {
    let entityMappingConfig, tableMetaMap, realmSchemaMap;

    beforeAll(() => {
        entityMappingConfig = EntityMappingConfig.getInstance();
        tableMetaMap = SchemaGenerator.generateAll(entityMappingConfig);
        realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(entityMappingConfig);
    });

    describe("SchemaGenerator", () => {
        it("generateAll for all ~90 schemas", () => {
            const {elapsed, result} = timeIt("generateAll", () => {
                return SchemaGenerator.generateAll(entityMappingConfig);
            }, 100);

            expect(result.size).toBeGreaterThan(70);
            expect(elapsed / 100).toBeLessThan(50); // < 50ms per call
        });

        it("generateCreateTableStatements for all tables", () => {
            const {elapsed, result} = timeIt("generateCreateTableStatements", () => {
                return SchemaGenerator.generateCreateTableStatements(tableMetaMap);
            }, 100);

            expect(result.length).toBeGreaterThan(70);
            expect(elapsed / 100).toBeLessThan(20);
        });

        it("generateIndexStatements for all tables", () => {
            const {elapsed, result} = timeIt("generateIndexStatements", () => {
                return SchemaGenerator.generateIndexStatements(tableMetaMap);
            }, 100);

            expect(result.length).toBeGreaterThan(50);
            expect(elapsed / 100).toBeLessThan(10);
        });
    });

    describe("RealmQueryParser", () => {
        it("simple equality query", () => {
            const {elapsed} = timeIt("simple eq parse", () => {
                return RealmQueryParser.parse("uuid = $0", ["abc-123"], "Individual", realmSchemaMap, 0);
            }, 1000);

            expect(elapsed / 1000).toBeLessThan(1); // < 1ms per parse
        });

        it("complex AND/OR query", () => {
            const {elapsed} = timeIt("complex AND/OR parse", () => {
                return RealmQueryParser.parse(
                    'voided = false AND (name CONTAINS[c] $0 OR firstName CONTAINS[c] $0)',
                    ["john"], "Individual", realmSchemaMap, 0
                );
            }, 1000);

            expect(elapsed / 1000).toBeLessThan(2);
        });

        it("dot-notation FK traversal query", () => {
            const {elapsed, result} = timeIt("dot-path FK parse", () => {
                return RealmQueryParser.parse(
                    "subjectType.uuid = $0 AND voided = false",
                    ["st-uuid"], "Individual", realmSchemaMap, 0
                );
            }, 1000);

            expect(result.joins.length).toBeGreaterThan(0);
            expect(elapsed / 1000).toBeLessThan(2);
        });

        it("IN list query with 100 values", () => {
            const uuids = Array.from({length: 100}, (_, i) => `uuid-${i}`);
            const inClause = `uuid IN {${uuids.map(u => `"${u}"`).join(",")}}`;

            const {elapsed} = timeIt("IN-100 parse", () => {
                return RealmQueryParser.parse(inClause, [], "Individual", realmSchemaMap, 0);
            }, 100);

            expect(elapsed / 100).toBeLessThan(10);
        });

        it("detects SUBQUERY as unsupported (routes to fallback)", () => {
            const {elapsed, result} = timeIt("SUBQUERY detection", () => {
                return RealmQueryParser.parse(
                    'SUBQUERY(enrolments, $enrolment, $enrolment.program.uuid = "abc").@count > 0',
                    [], "Individual", realmSchemaMap, 0
                );
            }, 1000);

            expect(result.unsupported || result.partialParse).toBe(true);
            expect(elapsed / 1000).toBeLessThan(2);
        });
    });

    describe("EntityHydrator", () => {
        let hydrator, individualMeta;

        beforeEach(() => {
            const mockExecuteQuery = jest.fn().mockReturnValue([]);
            hydrator = new EntityHydrator(tableMetaMap, realmSchemaMap, mockExecuteQuery, {});
            individualMeta = tableMetaMap.get("Individual");
        });

        it("flatten 1000 simple rows", () => {
            const entity = {
                uuid: "test-uuid",
                name: "Test",
                firstName: "Test",
                dateOfBirth: new Date(),
                voided: false,
                subjectType: {uuid: "st-uuid"},
                lowestAddressLevel: {uuid: "addr-uuid"},
                observations: [],
                registrationLocation: null,
            };

            const {elapsed} = timeIt("flatten x1000", () => {
                for (let i = 0; i < 1000; i++) {
                    hydrator.flatten("Individual", {...entity, uuid: `uuid-${i}`});
                }
            });

            expect(elapsed).toBeLessThan(500); // < 0.5ms per flatten
        });

        it("hydrate 1000 simple rows (depth 0, no FK resolution)", () => {
            const rows = generateMockRows(individualMeta, 1000);

            const {elapsed} = timeIt("hydrate x1000 depth-0", () => {
                hydrator.beginHydrationSession();
                for (const row of rows) {
                    hydrator.hydrate("Individual", row, {skipLists: true, depth: 0});
                }
                hydrator.endHydrationSession();
            });

            expect(elapsed).toBeLessThan(500);
        });
    });

    describe("JsFallbackFilterEvaluator", () => {
        it("DISTINCT on 1000 entities", () => {
            const entities = Array.from({length: 1000}, (_, i) => ({
                uuid: `uuid-${i}`, subjectType: {uuid: `st-${i % 10}`},
            }));

            const {elapsed, result} = timeIt("DISTINCT x1000", () => {
                return JsFallbackFilterEvaluator.apply(
                    entities,
                    [{query: "TRUEPREDICATE DISTINCT(subjectType.uuid)", args: []}],
                    "Individual"
                );
            }, 100);

            expect(result.length).toBe(10); // 10 unique subjectType UUIDs
            expect(elapsed / 100).toBeLessThan(20);
        });

        it("@count filter on 1000 entities with lists", () => {
            const entities = Array.from({length: 1000}, (_, i) => ({
                uuid: `uuid-${i}`,
                enrolments: Array.from({length: i % 5}, (_, j) => ({uuid: `enr-${i}-${j}`})),
            }));

            const {elapsed, result} = timeIt("@count filter x1000", () => {
                return JsFallbackFilterEvaluator.apply(
                    entities,
                    [{query: "enrolments.@count > 0", args: []}],
                    "Individual"
                );
            }, 100);

            expect(result.length).toBe(800); // 4 out of 5 have enrolments > 0
            expect(elapsed / 100).toBeLessThan(20);
        });
    });

    describe("camelToSnake", () => {
        it("convert 10000 field names", () => {
            const fields = [
                "dateOfBirth", "subjectType", "lowestAddressLevel", "firstName",
                "middleName", "lastName", "registrationDate", "voided",
                "createdByUUID", "lastModifiedByUUID",
            ];

            const {elapsed} = timeIt("camelToSnake x10000", () => {
                for (let i = 0; i < 10000; i++) {
                    camelToSnake(fields[i % fields.length]);
                }
            });

            expect(elapsed).toBeLessThan(50); // < 5µs per conversion
        });
    });

    describe("schemaNameToTableName", () => {
        it("convert all schema names", () => {
            const schemas = entityMappingConfig.getRealmConfig().schema;

            const {elapsed} = timeIt("schemaNameToTableName x90 * 1000", () => {
                for (let i = 0; i < 1000; i++) {
                    schemas.forEach(s => schemaNameToTableName(s.name));
                }
            });

            expect(elapsed).toBeLessThan(200);
        });
    });
});
