/**
 * Search results hydrate shallow ({skipLists: true, depth: 1}) for performance,
 * but the result card shows active-program badges from individual.enrolments.
 * The listsToInclude option opts that one child list back in while keeping the
 * rest skipped. Guards IndividualService.search's program badges.
 *
 * Since #2061, skipping a list defers it rather than emptying it: an opted-in list
 * is prefetched into a plain array, a skipped one resolves on access.
 *
 * Tracking issue: avniproject/avni-client#1955.
 *   npx jest --selectProjects integration --testPathPattern SearchHydrationTest
 */

import {open} from '@op-engineering/op-sqlite';
import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../../src/framework/db/SqliteProxy';

describe('search hydration: listsToInclude opts enrolments back in (#1955)', () => {
    let rawDb, proxy;

    beforeAll(() => {
        rawDb = open({name: `search_hydration_${Date.now()}.db`});
        const emc = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(emc);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(emc);
        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, emc, tableMetaMap, realmSchemaMap);
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    it('resolves enrolments (with program) but leaves other lists skipped', async () => {
        const ind = 'sh-ind-1', prog = 'sh-prog-1';
        await proxy.bulkCreate('Program', [{uuid: prog, name: 'ANC', colour: '#ff0000', voided: false}]);
        await proxy.bulkCreate('Individual', [{uuid: ind, firstName: 'Jane', voided: false}]);
        await proxy.bulkCreate('ProgramEnrolment', [
            {uuid: 'sh-enr-1', individual: {uuid: ind}, program: {uuid: prog}, voided: false},
        ]);
        await proxy.bulkCreate('Encounter', [
            {uuid: 'sh-enc-1', individual: {uuid: ind}, voided: false},
        ]);

        const opts = {skipLists: true, depth: 1, listsToInclude: new Set(['enrolments'])};
        const result = proxy.objects('Individual').withHydration(opts).filtered(`uuid = "${ind}"`)[0];

        expect(result).toBeTruthy();
        expect(result.enrolments.length).toBe(1);               // opted in
        expect(result.enrolments[0].program.name).toBe('ANC');  // program resolved at depth 0
        expect(isPrefetched(result, 'enrolments')).toBe(true);
        expect(isPrefetched(result, 'encounters')).toBe(false); // still skipped — deferred, not empty
        expect(result.encounters.length).toBe(1);               // and correct once read
    });

    it('resolves a skipped list on access under plain shallow hydration (no opt-in)', () => {
        const ind = 'sh-ind-2';
        proxy.write(() => {
            proxy.create('Individual', {uuid: ind, firstName: 'Bob', voided: false}, true, {skipHydration: true});
            proxy.create('ProgramEnrolment', {uuid: 'sh-enr-2', individual: {uuid: ind}, voided: false}, true, {skipHydration: true});
        });
        const result = proxy.objects('Individual').withHydration({skipLists: true, depth: 1}).filtered(`uuid = "${ind}"`)[0];

        expect(isPrefetched(result, 'enrolments')).toBe(false);
        expect(Array.from(result.enrolments, e => e.uuid)).toEqual(['sh-enr-2']);
    });

    // A prefetched list is a plain data property; a deferred one is an accessor.
    function isPrefetched(entity, propName) {
        const target = entity.that || entity;
        return !Object.getOwnPropertyDescriptor(target, propName).get;
    }
});
