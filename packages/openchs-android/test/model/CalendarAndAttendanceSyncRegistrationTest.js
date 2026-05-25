import {expect} from 'chai';
import {EntityMetaData} from 'openchs-models';

const NEW_ENTITIES = [
    'Calendar',
    'CalendarDateMarker',
    'AttendanceType',
    'Session',
    'AttendanceRecord'
];

const REFERENCE_ENTITIES = ['Calendar', 'CalendarDateMarker', 'AttendanceType'];
const TX_ENTITIES = ['Session', 'AttendanceRecord'];

const findEntity = (schemaName) =>
    EntityMetaData.model().find((e) => e.schemaName === schemaName);

describe('Calendar + Attendance sync registration (issue #1932)', () => {
    describe('pull sync — every new entity is registered for pull', () => {
        NEW_ENTITIES.forEach((name) => {
            it(`${name} is in EntityMetaData.model() with syncPullRequired=true`, () => {
                const entity = findEntity(name);
                expect(entity, `${name} must appear in EntityMetaData.model()`).to.not.be.undefined;
                expect(entity.syncPullRequired).to.equal(true);
            });
        });
    });

    describe('reference vs transactional classification', () => {
        REFERENCE_ENTITIES.forEach((name) => {
            it(`${name} is classified as reference data`, () => {
                expect(findEntity(name).type).to.equal('reference');
            });
        });

        TX_ENTITIES.forEach((name) => {
            it(`${name} is classified as transactional data`, () => {
                expect(findEntity(name).type).to.equal('tx');
            });
        });
    });

    describe('no parent declared (FK references are UUID-only)', () => {
        // These schemas reference their semantic parent by a plain string UUID
        // (calendarUUID, subjectTypeUUID, individualUUID, sessionUUID) and the parent
        // class holds no Realm list of children. Declaring `parent` in EntityMetaData
        // would make SyncService.persistAll invoke parent.entityClass.associateChild
        // which doesn't exist — sync crashed with exactly this signature in 1.33.47
        // before the parent declarations were removed in 1.33.48.
        NEW_ENTITIES.forEach((name) => {
            it(`${name} has no parent metadata`, () => {
                expect(findEntity(name).parent).to.satisfy((p) => p == null);
            });
        });
    });

    describe('push sync — Session and AttendanceRecord travel to server', () => {
        // SyncService.pushData() iterates `EntityMetaData.model().filter(e => e.type === 'tx')`
        // and reverses it so parents push before children. These assertions cover both
        // the "is in the push list" and the "Session pushes before AttendanceRecord"
        // invariants that the existing push pipeline relies on.
        const txEntities = () => EntityMetaData.model().filter((e) => e.type === 'tx');

        TX_ENTITIES.forEach((name) => {
            it(`${name} is in the tx subset that pushData() walks`, () => {
                const schemaNames = txEntities().map((e) => e.schemaName);
                expect(schemaNames).to.include(name);
            });

            it(`${name} has syncPushRequired=true`, () => {
                expect(findEntity(name).syncPushRequired).to.equal(true);
            });
        });

        it('Session is pushed before its child AttendanceRecord (after pushData reverses the tx list)', () => {
            const pushOrder = txEntities().slice().reverse().map((e) => e.schemaName);
            const sessionIdx = pushOrder.indexOf('Session');
            const recordIdx = pushOrder.indexOf('AttendanceRecord');
            expect(sessionIdx).to.be.greaterThan(-1, 'Session must be in push order');
            expect(recordIdx).to.be.greaterThan(-1, 'AttendanceRecord must be in push order');
            expect(sessionIdx).to.be.lessThan(
                recordIdx,
                'Session must push before AttendanceRecord so the parent exists when the child arrives'
            );
        });
    });

    describe('voided rows arrive via the same pull flow as live rows', () => {
        // SyncService.persistAll() runs every resource through entityClass.fromResource;
        // voided rows are persisted as voided=true (a soft delete), not removed. The
        // Realm schemas for these entities must therefore declare a `voided` property
        // so a voided resource round-trips into a queryable voided row that downstream
        // queries can filter on.
        NEW_ENTITIES.forEach((name) => {
            it(`${name}.schema declares a "voided" property so voided pulls round-trip`, () => {
                const entity = findEntity(name);
                expect(entity.entityClass.schema.properties).to.have.property('voided');
            });
        });
    });
});
