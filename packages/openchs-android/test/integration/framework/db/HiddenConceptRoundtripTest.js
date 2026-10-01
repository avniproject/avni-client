/**
 * A form page leaves out a question whose concept is hidden, and it learns that from the
 * concept's key-values, stored as JSON on the concept row. Persists a form, a page, its
 * questions and their concepts the way sync does, reads the form back through the real
 * SqliteProxy, and checks each question's concept still reports whether it is hidden.
 *
 * Runs under the `integration` jest project, where @op-engineering/op-sqlite is
 * rewritten to a real better-sqlite3 DB:
 *   npx jest test/integration/framework/db/HiddenConceptRoundtripTest.js --selectProjects integration
 */

import {open} from '@op-engineering/op-sqlite';
import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../../src/framework/db/SqliteProxy';

let rawDb, proxy;

describe('a hidden concept read back from SQLite', () => {
    beforeAll(() => {
        rawDb = open({name: `hidden_concept_roundtrip_${Date.now()}.db`});
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

    it("still reports the question's concept as hidden when the form is read back", async () => {
        // Sync stores a key-value's value as text, so the marker arrives as the string "true".
        await proxy.bulkCreate('Concept', [
            {uuid: 'hc-verdict', name: 'AI Verdict', datatype: 'Text', voided: false, keyValues: [{key: 'hidden', value: 'true'}]},
            {uuid: 'hc-notes', name: 'Notes', datatype: 'Text', voided: false, keyValues: []},
        ]);
        await proxy.bulkCreate('Form', [{uuid: 'hc-form', name: 'Photo form', formType: 'Encounter', voided: false}]);
        await proxy.bulkCreate('FormElementGroup', [
            {uuid: 'hc-page', name: 'Photo page', displayOrder: 1, form: {uuid: 'hc-form'}, voided: false},
        ]);
        await proxy.bulkCreate('FormElement', [
            {uuid: 'hc-fe-verdict', name: 'AI Verdict', displayOrder: 1, mandatory: false, voided: false,
                concept: {uuid: 'hc-verdict'}, formElementGroup: {uuid: 'hc-page'}},
            {uuid: 'hc-fe-notes', name: 'Notes', displayOrder: 2, mandatory: false, voided: false,
                concept: {uuid: 'hc-notes'}, formElementGroup: {uuid: 'hc-page'}},
        ]);

        const form = proxy.objectForPrimaryKey('Form', 'hc-form');
        const [photoPage] = form.getFormElementGroups();
        const hiddenByQuestion = photoPage.getFormElements().map((formElement) => [formElement.uuid, formElement.concept.isHidden()]);

        expect(hiddenByQuestion).toEqual([['hc-fe-verdict', true], ['hc-fe-notes', false]]);
    });

    it("still reports a recorded value's concept as hidden when a subject is read back", async () => {
        await proxy.bulkCreate('Concept', [
            {uuid: 'hc-obs-verdict', name: 'Recorded verdict', datatype: 'Text', voided: false, keyValues: [{key: 'hidden', value: 'true'}]},
            {uuid: 'hc-obs-notes', name: 'Recorded notes', datatype: 'Text', voided: false, keyValues: []},
        ]);
        await proxy.bulkCreate('Individual', [{uuid: 'hc-subject', firstName: 'Kavita', voided: false,
            observations: [
                {concept: {uuid: 'hc-obs-verdict', name: 'Recorded verdict'}, valueJSON: '{"answer":"Suspicious"}'},
                {concept: {uuid: 'hc-obs-notes', name: 'Recorded notes'}, valueJSON: '{"answer":"Looks fine"}'},
            ]}]);

        const subject = proxy.objectForPrimaryKey('Individual', 'hc-subject');
        const hiddenByValue = Array.from(subject.observations).map((observation) => [observation.concept.uuid, observation.concept.isHidden()]);

        expect(hiddenByValue).toEqual([['hc-obs-verdict', true], ['hc-obs-notes', false]]);
    });
});
