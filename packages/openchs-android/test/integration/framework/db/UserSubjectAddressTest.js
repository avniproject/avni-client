/**
 * A user-type subject has no real address. Realm stores the placeholder AddressLevel models
 * give it; SQLite writes NULL in its place, so reads must hand the placeholder back or the
 * subject profile crashes in fullAddress().
 *
 *   npx jest --selectProjects integration --testPathPattern UserSubjectAddressTest
 */

import {open} from '@op-engineering/op-sqlite';
import {EntityMappingConfig, Individual, SubjectType} from 'openchs-models';
import {SchemaGenerator} from '../../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../../src/framework/db/SqliteProxy';

describe('user subject address on SQLite', () => {
    let rawDb, proxy;

    const USER_ST = 'usa-st-user', PERSON_ST = 'usa-st-person';
    const USER_SUBJECT = 'usa-ind-user', PERSON_SUBJECT = 'usa-ind-person';
    const ENROLMENT = 'usa-enl-1', PROGRAM = 'usa-prog-1', ENCOUNTER = 'usa-enc-1', ET = 'usa-et-1';
    const i18n = {t: (key) => key};

    beforeAll(async () => {
        rawDb = open({name: `user_subject_address_${Date.now()}.db`});
        const emc = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(emc);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(emc);
        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, emc, tableMetaMap, realmSchemaMap);

        await proxy.bulkCreate('SubjectType', [
            {uuid: USER_ST, name: 'TIMS for Poshan Sathi', type: SubjectType.types.User, voided: false},
            {uuid: PERSON_ST, name: 'Beneficiary', type: SubjectType.types.Person, voided: false},
        ]);
        await proxy.bulkCreate('Program', [{uuid: PROGRAM, name: 'Training', colour: '#ff0000', voided: false}]);
        await proxy.bulkCreate('EncounterType', [{uuid: ET, name: 'Monthly Training', voided: false}]);
        // As sync saves them: Individual.fromResource gives a user subject the placeholder address.
        await proxy.bulkCreate('Individual', [
            {uuid: USER_SUBJECT, firstName: 'mahatestnew', subjectType: {uuid: USER_ST}, lowestAddressLevel: Individual.getPlaceholderAddressLevel(), voided: false},
            {uuid: PERSON_SUBJECT, firstName: 'Kavita', subjectType: {uuid: PERSON_ST}, voided: false},
        ]);
        await proxy.bulkCreate('ProgramEnrolment', [{uuid: ENROLMENT, individual: {uuid: USER_SUBJECT}, program: {uuid: PROGRAM}, voided: false}]);
        await proxy.bulkCreate('Encounter', [{uuid: ENCOUNTER, individual: {uuid: USER_SUBJECT}, encounterType: {uuid: ET}, voided: false}]);
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    const realmFullAddress = () => Individual.createEmptyInstance().fullAddress(i18n);
    const byUuid = (uuid) => proxy.objects('Individual').filtered(`uuid = "${uuid}"`)[0];

    it('stores no address level for the placeholder', () => {
        const [row] = rawDb.executeSync('SELECT lowest_address_level_uuid FROM individual WHERE uuid = ?', [USER_SUBJECT]).rows;
        expect(row.lowest_address_level_uuid).toBeNull();
    });

    it('reads a user subject back with the placeholder address, as on Realm', () => {
        const subject = proxy.objectForPrimaryKey('Individual', USER_SUBJECT);

        expect(subject.lowestAddressLevel.uuid).toBe(Individual.getAddressLevelDummyUUID());
        expect(subject.fullAddress(i18n)).toBe(realmFullAddress());
    });

    it('gives the placeholder to a user subject found by a query', () => {
        expect(byUuid(USER_SUBJECT).fullAddress(i18n)).toBe(realmFullAddress());
    });

    it('gives the placeholder to a user subject reached through a reference', () => {
        const enrolment = proxy.objects('ProgramEnrolment').withHydration({skipLists: true, depth: 2}).filtered(`uuid = "${ENROLMENT}"`)[0];
        expect(enrolment.individual.fullAddress(i18n)).toBe(realmFullAddress());

        // depth 1 puts the individual at depth 0, where its subject type comes from the reference cache.
        const encounter = proxy.objects('Encounter').withHydration({skipLists: true, depth: 1}).filtered(`uuid = "${ENCOUNTER}"`)[0];
        expect(encounter.individual.fullAddress(i18n)).toBe(realmFullAddress());
    });

    it('leaves a non-user subject without an address as it is on Realm', () => {
        expect(byUuid(PERSON_SUBJECT).lowestAddressLevel).toBeFalsy();
    });
});
