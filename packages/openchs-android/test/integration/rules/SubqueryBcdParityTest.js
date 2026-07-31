/**
 * SUBQUERY families B (nested embedded), C (two-hop paths) and D (OR/numeric)
 * — parity test against real SQLite. Each case asserts an exact,
 * hand-computed count so a regression in the RealmQueryParser translation
 * is caught rather than masked by a loose assertion.
 *
 * Run: npx jest --selectProjects integration test/integration/rules/SubqueryBcdParityTest.js --verbose
 */

import {EntityMappingConfig} from 'openchs-models';
import SchemaGenerator from '../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../src/framework/db/SqliteProxy';
import {RealmQueryParser} from '../../../src/framework/db/RealmQueryParser';
import {open} from '@op-engineering/op-sqlite';

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

describe('SUBQUERY B/C/D parity on SQLite', () => {
    let rawDb, proxy;
    const ids = {};

    beforeAll(() => {
        rawDb = open({name: `subquery_bcd_parity_${Date.now()}.db`});
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(entityMappingConfig);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(entityMappingConfig);

        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) {
            rawDb.executeSync(sql);
        }
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) {
            rawDb.executeSync(sql);
        }

        proxy = new SqliteProxy(rawDb, entityMappingConfig, tableMetaMap, realmSchemaMap);
        seedData();

        proxy.buildReferenceCache([
            {schemaName: 'Gender', depth: 1, skipLists: true},
            {schemaName: 'SubjectType', depth: 1, skipLists: true},
            {schemaName: 'AddressLevel', depth: 1, skipLists: true},
            {schemaName: 'Program', depth: 1, skipLists: true},
            {schemaName: 'EncounterType', depth: 1, skipLists: true},
        ]);
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    /**
     * Seed layout (7 individuals):
     *
     *  ind0 (voided=false) -> enrolment0 (Child, voided=false)
     *      programExitObservations: [concept=C1]              <- matches B (2-deep)
     *      encounters: pe0a(encounterDateTime=null), pe0b(encounterDateTime=now, observations:[concept=C3])
     *  ind1 (voided=false) -> enrolment1 (Child, voided=false)
     *      programExitObservations: []                        <- does not match C1
     *      encounters: pe1a(encounterDateTime=now)             <- no null-date encounter
     *  ind2 (voided=TRUE)  -> enrolment2 (Child, voided=false)  <- child-scoping case
     *      programExitObservations: [], encounters: []
     *  ind3 (voided=false) -> enrolment3 (Child, voided=false)
     *      programExitObservations: []
     *      encounters: pe3a(encounterDateTime=null)             <- only encounter, and it's null
     *  ind4 (voided=false) -> enrolment4 (Other, voided=false)   <- D: OR via voided=false branch
     *  ind5 (voided=false) -> enrolment5 (Child, voided=TRUE)    <- D: OR via program=Child branch
     *  ind6 (voided=false) -> enrolment6 (Other, voided=TRUE)    <- D: OR — neither branch true
     */
    function seedData() {
        ids.subjectType = uuid();
        ids.gender = uuid();
        ids.addr = uuid();
        ids.programChild = uuid();
        ids.programOther = uuid();
        ids.encType = uuid();
        ids.C1 = uuid(); // matched exit-observation concept
        ids.C2 = uuid(); // unused/negative concept
        ids.C3 = uuid(); // matched nested encounter-observation concept

        ids.ind0 = uuid();
        ids.ind1 = uuid();
        ids.ind2 = uuid();
        ids.ind3 = uuid();
        ids.ind4 = uuid();
        ids.ind5 = uuid();
        ids.ind6 = uuid();

        ids.enr0 = uuid();
        ids.enr1 = uuid();
        ids.enr2 = uuid();
        ids.enr3 = uuid();
        ids.enr4 = uuid();
        ids.enr5 = uuid();
        ids.enr6 = uuid();
        ids.enrOrphan = uuid();
        ids.peOrphan = uuid();

        ids.pe0a = uuid();
        ids.pe0b = uuid();
        ids.pe1a = uuid();
        ids.pe3a = uuid();

        const now = new Date();

        proxy.write(() => {
            proxy.create('SubjectType', {uuid: ids.subjectType, name: 'Individual', voided: false, active: true, type: 'Person'}, true, {skipHydration: true});
            proxy.create('Gender', {uuid: ids.gender, name: 'Female', voided: false}, true, {skipHydration: true});
            proxy.create('AddressLevel', {uuid: ids.addr, name: 'Village_A', level: 1, voided: false, type: uuid()}, true, {skipHydration: true});

            proxy.create('Program', {uuid: ids.programChild, name: 'Child', voided: false, active: true, colour: '#000'}, true, {skipHydration: true});
            proxy.create('Program', {uuid: ids.programOther, name: 'Other', voided: false, active: true, colour: '#111'}, true, {skipHydration: true});
            proxy.create('EncounterType', {uuid: ids.encType, name: 'Delivery', voided: false, active: true}, true, {skipHydration: true});

            const mkIndividual = (indUuid, name, voided) => proxy.create('Individual', {
                uuid: indUuid,
                name,
                firstName: name,
                lastName: 'Test',
                dateOfBirthVerified: true,
                registrationDate: new Date(2024, 0, 1),
                voided,
                subjectType: {uuid: ids.subjectType},
                gender: {uuid: ids.gender},
                lowestAddressLevel: {uuid: ids.addr},
                observations: [],
            }, true, {skipHydration: true});

            mkIndividual(ids.ind0, 'Ind0', false);
            mkIndividual(ids.ind1, 'Ind1', false);
            mkIndividual(ids.ind2, 'Ind2', true); // voided individual, non-voided enrolment below
            mkIndividual(ids.ind3, 'Ind3', false);
            mkIndividual(ids.ind4, 'Ind4', false);
            mkIndividual(ids.ind5, 'Ind5', false);
            mkIndividual(ids.ind6, 'Ind6', false);

            // enrolment0: Child, active, exit-observation concept=C1
            proxy.create('ProgramEnrolment', {
                uuid: ids.enr0,
                individual: {uuid: ids.ind0},
                program: {uuid: ids.programChild},
                enrolmentDateTime: new Date(2024, 3, 1),
                voided: false,
                observations: [],
                programExitObservations: [{concept: {uuid: ids.C1}, valueJSON: '{"a":1}'}],
            }, true, {skipHydration: true});

            // enrolment1: Child, active, no matching exit-observation
            proxy.create('ProgramEnrolment', {
                uuid: ids.enr1,
                individual: {uuid: ids.ind1},
                program: {uuid: ids.programChild},
                enrolmentDateTime: new Date(2024, 3, 1),
                voided: false,
                observations: [],
                programExitObservations: [],
            }, true, {skipHydration: true});

            // enrolment2: Child, non-voided, belongs to a voided individual
            proxy.create('ProgramEnrolment', {
                uuid: ids.enr2,
                individual: {uuid: ids.ind2},
                program: {uuid: ids.programChild},
                enrolmentDateTime: new Date(2024, 3, 1),
                voided: false,
                observations: [],
                programExitObservations: [],
            }, true, {skipHydration: true});

            // enrolment3: Child, active, single null-date encounter
            proxy.create('ProgramEnrolment', {
                uuid: ids.enr3,
                individual: {uuid: ids.ind3},
                program: {uuid: ids.programChild},
                enrolmentDateTime: new Date(2024, 3, 1),
                voided: false,
                observations: [],
                programExitObservations: [],
            }, true, {skipHydration: true});

            // enrolment4: Other program, non-voided (OR: voided=false branch)
            proxy.create('ProgramEnrolment', {
                uuid: ids.enr4,
                individual: {uuid: ids.ind4},
                program: {uuid: ids.programOther},
                enrolmentDateTime: new Date(2024, 3, 1),
                voided: false,
                observations: [],
                programExitObservations: [],
            }, true, {skipHydration: true});

            // enrolment5: Child program, voided (OR: program=Child branch)
            proxy.create('ProgramEnrolment', {
                uuid: ids.enr5,
                individual: {uuid: ids.ind5},
                program: {uuid: ids.programChild},
                enrolmentDateTime: new Date(2024, 3, 1),
                voided: true,
                observations: [],
                programExitObservations: [],
            }, true, {skipHydration: true});

            // enrolment6: Other program, voided (neither OR branch true)
            proxy.create('ProgramEnrolment', {
                uuid: ids.enr6,
                individual: {uuid: ids.ind6},
                program: {uuid: ids.programOther},
                enrolmentDateTime: new Date(2024, 3, 1),
                voided: true,
                observations: [],
                programExitObservations: [],
            }, true, {skipHydration: true});

            // enrolmentOrphan: individual key omitted, so individual_uuid lands NULL — the DDL
            // declares no NOT NULL on any FK. Belongs to no individual, so it changes no
            // expected count, but it poisons any `NOT IN (SELECT individual_uuid …)`.
            proxy.create('ProgramEnrolment', {
                uuid: ids.enrOrphan,
                program: {uuid: ids.programChild},
                enrolmentDateTime: new Date(2024, 3, 1),
                voided: false,
                observations: [],
                programExitObservations: [],
            }, true, {skipHydration: true});

            // pe0a: enrolment0, encounterDateTime = null
            proxy.create('ProgramEncounter', {
                uuid: ids.pe0a,
                programEnrolment: {uuid: ids.enr0},
                encounterType: {uuid: ids.encType},
                encounterDateTime: null,
                voided: false,
                observations: [],
                name: 'pe0a',
            }, true, {skipHydration: true});

            // pe0b: enrolment0, encounterDateTime = now, observations: [concept=C3]
            proxy.create('ProgramEncounter', {
                uuid: ids.pe0b,
                programEnrolment: {uuid: ids.enr0},
                encounterType: {uuid: ids.encType},
                encounterDateTime: now,
                voided: false,
                observations: [{concept: {uuid: ids.C3}, valueJSON: '{"x":1}'}],
                name: 'pe0b',
            }, true, {skipHydration: true});

            // pe1a: enrolment1, encounterDateTime = now (no null-date encounter for enrolment1)
            proxy.create('ProgramEncounter', {
                uuid: ids.pe1a,
                programEnrolment: {uuid: ids.enr1},
                encounterType: {uuid: ids.encType},
                encounterDateTime: now,
                voided: false,
                observations: [],
                name: 'pe1a',
            }, true, {skipHydration: true});

            // peOrphan: a null-dated encounter under enrolmentOrphan, which itself has a NULL
            // individual FK. It reaches no individual, but it puts a NULL into the outer
            // SELECT of a two-hop negative SUBQUERY.
            proxy.create('ProgramEncounter', {
                uuid: ids.peOrphan,
                programEnrolment: {uuid: ids.enrOrphan},
                encounterType: {uuid: ids.encType},
                encounterDateTime: null,
                voided: false,
                observations: [],
                name: 'peOrphan',
            }, true, {skipHydration: true});

            // pe3a: enrolment3, encounterDateTime = null (only encounter for enrolment3)
            proxy.create('ProgramEncounter', {
                uuid: ids.pe3a,
                programEnrolment: {uuid: ids.enr3},
                encounterType: {uuid: ids.encType},
                encounterDateTime: null,
                voided: false,
                observations: [],
                name: 'pe3a',
            }, true, {skipHydration: true});
        });
    }

    // ── Family B: nested embedded SUBQUERY (2-deep) ──
    it('B (2-deep): enrolment with matching program + exit observation', () => {
        const res = proxy.objects('Individual').filtered(
            "SUBQUERY(enrolments, $e, $e.program.name = 'Child' and SUBQUERY($e.programExitObservations, $o, $o.concept.uuid = $0).@count > 0).@count > 0",
            ids.C1
        );
        // Only enrolment0 (ind0) has program=Child AND a programExitObservation with concept=C1.
        expect(res.length).toBe(1);
        expect(res[0].uuid).toBe(ids.ind0);
    });

    // ── Family B: nested SUBQUERY (3-deep: enrolments -> encounters -> observations) ──
    it('B (3-deep): enrolment with an encounter carrying a matching observation', () => {
        const res = proxy.objects('Individual').filtered(
            "SUBQUERY(enrolments, $e, SUBQUERY($e.encounters, $enc, SUBQUERY($enc.observations, $o, $o.concept.uuid = $0).@count > 0).@count > 0).@count > 0",
            ids.C3
        );
        // Only pe0b (under enrolment0/ind0) carries an observation with concept=C3.
        expect(res.length).toBe(1);
        expect(res[0].uuid).toBe(ids.ind0);
    });

    // ── Family C: list -> list two-hop path ──
    it('C list->list: individuals with an encounter (via enrolments.encounters) having null encounterDateTime', () => {
        const res = proxy.objects('Individual').filtered(
            'SUBQUERY(enrolments.encounters, $enc, $enc.encounterDateTime = null).@count > 0'
        );
        // ind0 (pe0a is null) and ind3 (pe3a is null) qualify; ind1's only encounter (pe1a)
        // is non-null and ind2 has no encounters at all.
        expect(res.length).toBe(2);
        expect(res.map(i => i.uuid).sort()).toEqual([ids.ind0, ids.ind3].sort());
    });

    // ── Family C: object -> list two-hop path, rooted on the child entity ──
    it('C object->list: ProgramEncounter whose sibling encounters (via programEnrolment.encounters) are all null-dated', () => {
        const res = proxy.objects('ProgramEncounter').filtered(
            'SUBQUERY(programEnrolment.encounters, $enc, $enc.encounterDateTime != null).@count == 0'
        );
        // enrolment0's encounters (pe0a, pe0b) include one non-null (pe0b) -> count != 0 for both.
        // enrolment1's encounter (pe1a) is non-null -> count != 0.
        // enrolment3's only encounter (pe3a) is null -> non-null count == 0 -> pe3a matches.
        // enrolmentOrphan's only encounter (peOrphan) is null -> peOrphan matches too.
        expect(res.map(e => e.uuid).sort()).toEqual([ids.pe3a, ids.peOrphan].sort());
    });

    // ── Family D: OR combinator across SUBQUERY predicate ──
    it('D OR: enrolment matching program OR non-voided', () => {
        const res = proxy.objects('Individual').filtered(
            "SUBQUERY(enrolments, $e, $e.program.name = 'Child' OR $e.voided = false).@count > 0"
        );
        // Matches: ind0,ind1,ind2,ind3 (program=Child, voided=false -> both true),
        // ind4 (program=Other but voided=false -> OR true), ind5 (program=Child but voided=true -> OR true).
        // Excluded: ind6 (program=Other AND voided=true -> both false).
        expect(res.length).toBe(6);
        const uuids = res.map(i => i.uuid);
        expect(uuids).not.toContain(ids.ind6);
        expect(uuids.sort()).toEqual([ids.ind0, ids.ind1, ids.ind2, ids.ind3, ids.ind4, ids.ind5].sort());
    });

    // ── NULL back-FK must not empty a negative SUBQUERY (SQL NOT IN is UNKNOWN against NULL) ──
    it('single-hop @count == 0 is unaffected by an enrolment with a NULL individual FK', () => {
        const res = proxy.objects('Individual').filtered(
            'SUBQUERY(enrolments, $e, $e.voided = false).@count == 0'
        );
        // ind0..ind4 each have a non-voided enrolment; ind5 and ind6 have only voided ones.
        // enrolmentOrphan is non-voided but belongs to nobody, so it must not change this.
        expect(res.map(i => i.uuid).sort()).toEqual([ids.ind5, ids.ind6].sort());
    });

    it('two-hop @count == 0 is unaffected by an enrolment with a NULL individual FK', () => {
        const res = proxy.objects('Individual').filtered(
            'SUBQUERY(enrolments.encounters, $enc, $enc.encounterDateTime = null).@count == 0'
        );
        // ind0 and ind3 have a null-dated encounter; everyone else has none.
        expect(res.map(i => i.uuid).sort())
            .toEqual([ids.ind1, ids.ind2, ids.ind4, ids.ind5, ids.ind6].sort());
    });

    // ── Shapes that intentionally stay on the JS fallback, exercised through proxy → evaluator.
    //    Each asserts (a) the parser really does decline it, and (b) the evaluator's answer. ──
    describe('documented stay-fallback classes', () => {
        const realmSchemaMap = () => SchemaGenerator.buildRealmSchemaMap(EntityMappingConfig.getInstance());

        function assertStaysOnFallback(query, rootSchema, args = []) {
            const parsed = RealmQueryParser.parse(query, args, rootSchema, realmSchemaMap());
            expect(parsed.unsupported || parsed.partialParse).toBeTruthy();
        }

        it('multi-hop @count comparison other than >0 / ==0', () => {
            const query = 'SUBQUERY(enrolments.encounters, $enc, $enc.voided = false).@count >= 2';
            assertStaysOnFallback(query, 'Individual');
            const res = proxy.objects('Individual').filtered(query);
            // ind0 alone has two encounters (pe0a, pe0b) across its enrolments; ind1 and ind3
            // have one each, and the rest have none.
            expect(res.map(i => i.uuid)).toEqual([ids.ind0]);
        });

        it('multi-hop @count == 1 counts across the list hop', () => {
            const query = 'SUBQUERY(enrolments.encounters, $enc, $enc.voided = false).@count == 1';
            assertStaysOnFallback(query, 'Individual');
            const res = proxy.objects('Individual').filtered(query);
            expect(res.map(i => i.uuid).sort()).toEqual([ids.ind1, ids.ind3].sort());
        });

        it('dot-path condition that would need a JOIN inside the bare subquery', () => {
            const query = `SUBQUERY(enrolments, $e, $e.individual.subjectType.uuid = $0).@count > 0`;
            assertStaysOnFallback(query, 'Individual', [ids.subjectType]);
            const res = proxy.objects('Individual').filtered(query, ids.subjectType);
            // Every seeded individual carries the same subject type and has at least one enrolment,
            // except ind4..ind6 which also do — so all seven qualify via their own enrolment.
            expect(res.length).toBe(7);
        });

        it('OR mixing an outer predicate with a SUBQUERY returns the union of both branches', () => {
            const query = 'voided = true OR SUBQUERY(encounters, $enc, $enc.voided = false).@count > 0';
            assertStaysOnFallback(query, 'Individual');
            const res = proxy.objects('Individual').filtered(query);
            // ind2 is the only voided individual; no individual has a general encounter, so the
            // SUBQUERY branch adds nobody. Dropping the first branch would return nothing.
            expect(res.map(i => i.uuid)).toEqual([ids.ind2]);
        });

        it('unqualified property not on the child schema stays on fallback and still filters', () => {
            const query = "SUBQUERY(enrolments, $e, firstName = 'nobody').@count > 0";
            assertStaysOnFallback(query, 'Individual');
            const res = proxy.objects('Individual').filtered(query);
            // firstName isn't on ProgramEnrolment, so no enrolment matches under Realm semantics.
            expect(res.length).toBe(0);
        });
    });

    // ── Child-scoping: unqualified property inside SUBQUERY binds to the child alias ──
    it('child-scoping: unqualified "voided" binds to the enrolment, not the individual', () => {
        const res = proxy.objects('Individual').filtered(
            'SUBQUERY(enrolments, $e, voided = false).@count > 0'
        );
        // ind2 is a VOIDED individual whose enrolment (enr2) is non-voided. If "voided" incorrectly
        // bound to the root Individual, ind2 would be excluded. It must be included.
        const uuids = res.map(i => i.uuid);
        expect(uuids).toContain(ids.ind2);
        // Full expected set: ind0,ind1,ind2,ind3,ind4 have a non-voided enrolment; ind5,ind6 do not.
        expect(res.length).toBe(5);
        expect(uuids.sort()).toEqual([ids.ind0, ids.ind1, ids.ind2, ids.ind3, ids.ind4].sort());
    });
});
