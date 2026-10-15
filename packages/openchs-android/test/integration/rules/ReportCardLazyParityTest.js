// Every custom report-card rule in LAZY_PARITY_DB, eager vs lazy; same numbers and line-list uuids required.
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

const uuidsOf = (list) => Array.from(list || [], item => item && item.uuid !== undefined ? item.uuid : item);

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

        const runOn = (eager, cached, card) => {
            db.proxy.hydrator.eagerReferenceMode = eager;
            if (cached) db.proxy.beginQueryCache();
            try {
                const user = db.proxy.objects("UserInfo")[0];
                const myUserGroups = db.proxy.objects("MyGroups").filtered("voided = false");
                const params = {ruleInput: null, db: db.proxy, services: {}, user, myUserGroups};
                const started = Date.now();
                const result = outcome(() => eval(card.query)({params, imports}));
                return {result, ms: Date.now() - started};
            } finally {
                if (cached) db.proxy.endQueryCache();
                db.proxy.hydrator.eagerReferenceMode = false;
            }
        };

        const report = cards.map(card => {
            const eager = runOn(true, false, card);
            const lazy = runOn(false, false, card);
            const lazyCached = runOn(false, true, card);
            const same = _.isEqual(eager.result, lazy.result) && _.isEqual(eager.result, lazyCached.result);
            const erroredEverywhere = same && !!eager.result.error;
            return {card: card.name, eagerMs: eager.ms, lazyMs: lazy.ms, lazyCachedMs: lazyCached.ms, same, erroredEverywhere, eager: eager.result, lazy: lazy.result, lazyCached: lazyCached.result};
        });

        console.table(report.map(({card, eagerMs, lazyMs, lazyCachedMs, same, erroredEverywhere, eager}) => ({card, eagerMs, lazyMs, lazyCachedMs, same, error: erroredEverywhere ? eager.error : ""})));
        const notCompared = report.filter(row => row.erroredEverywhere).map(row => row.card);
        console.log(`ReportCardLazyParity: compared ${report.length - notCompared.length} cards; ${notCompared.length} errored in every mode and were NOT compared: ${notCompared.join(", ")}`);
        expect(report.filter(row => !row.same)).toEqual([]);
    }, 60 * 60 * 1000);
});
