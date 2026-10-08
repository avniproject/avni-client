/**
 * The Tasks and Video screens hand a results proxy's raw collection to ListView, whose
 * data source takes its row ids from Object.keys. On SQLite this must give one row per
 * record, as Realm.Results does, not one per internal field of the proxy.
 *
 * Run: npx jest --selectProjects integration --testPathPattern RawCollectionListViewTest
 */
import {EntityMappingConfig, getUnderlyingRealmCollection, Task} from "openchs-models";
import ListViewDataSource from "deprecated-react-native-listview/ListViewDataSource";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

describe("ListView over a SQLite raw collection", () => {
    let rawDb, proxy;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));
    });

    afterEach(() => rawDb && rawDb.close());

    const dataSourceOver = (results) => new ListViewDataSource({rowHasChanged: () => false})
        .cloneWithRows(getUnderlyingRealmCollection(results));

    it("renders one row per task, each wrapping back into the task", () => {
        ["Call mother", "Visit school", "Collect sample"].forEach((name, i) => proxy.write(() =>
            proxy.create("Task", {uuid: `task-${i}`, name, taskType: {uuid: "tt"}, taskStatus: {uuid: "ts"}, scheduledOn: new Date(2026, 9, i + 1), voided: false}, true, {skipHydration: true})));
        const dataSource = dataSourceOver(proxy.objects("Task").sorted("scheduledOn"));

        expect(dataSource.getRowCount()).toBe(3);
        const names = [0, 1, 2].map(row => new Task(dataSource.getRowData(0, row)).name);
        expect(names).toEqual(["Call mother", "Visit school", "Collect sample"]);
    });

    it("renders no rows when there are no tasks", () => {
        expect(dataSourceOver(proxy.objects("Task")).getRowCount()).toBe(0);
    });
});
