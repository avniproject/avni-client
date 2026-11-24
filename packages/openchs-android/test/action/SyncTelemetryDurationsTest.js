import {expect} from 'chai';
import _ from 'lodash';
import {SyncTelemetryActions} from '../../src/action/SyncTelemetryActions';
import EntityService from '../../src/service/EntityService';

const stubContext = () => {
    const saved = [];
    return {
        saved,
        get: (service) => (service === EntityService
            ? {saveAndPushToEntityQueue: (entity) => saved.push(entity), getCount: () => 0, getAll: () => []}
            : {})
    };
};

const pullEntry = (state, name) => _.find(state.entityStatus.pull, e => e.entity === name);
const pushEntry = (state, name) => _.find(state.entityStatus.push, e => e.entity === name);

describe('SyncTelemetryActions phase durations', () => {
    let state, pulledEntity, pushedEntity;

    beforeEach(() => {
        state = SyncTelemetryActions.getInitialState();
        pulledEntity = state.entityStatus.pull[0].entity;
        pushedEntity = state.entityStatus.push[0].entity;
    });

    it('sums each pull phase across pages instead of keeping per-page samples', () => {
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 100, durations: {networkMs: 300, parseMs: 40, persistMs: 700}}, {});
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 60, durations: {networkMs: 200, parseMs: 10, persistMs: 500}}, {});

        const entry = pullEntry(state, pulledEntity);
        expect(entry.done).to.equal(160);
        expect(entry.networkMs).to.equal(500);
        expect(entry.parseMs).to.equal(50);
        expect(entry.persistMs).to.equal(1200);
        expect(entry.pages).to.equal(2);
        expect(entry.posts).to.equal(undefined, 'pull entries carry no push-only keys');
    });

    it('sums each push phase across records', () => {
        const action = (durations) => ({entityMetadata: {entityName: pushedEntity}, durations});
        state = SyncTelemetryActions.entityPushCompleted(state, action({serializeMs: 5, networkMs: 120, persistMs: 3}), {});
        state = SyncTelemetryActions.entityPushCompleted(state, action({serializeMs: 7, networkMs: 80, persistMs: 2}), {});

        const entry = pushEntry(state, pushedEntity);
        expect(entry.done).to.equal(2);
        expect(entry.serializeMs).to.equal(12);
        expect(entry.networkMs).to.equal(200);
        expect(entry.persistMs).to.equal(5);
        expect(entry.posts).to.equal(2);
        expect(entry.pages).to.equal(undefined, 'push entries carry no pull-only keys');
    });

    it('records the round trip for an entity that had nothing to pull', () => {
        // ~79 entities are requested every sync; the empty ones still cost a round trip each.
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 0, durations: {networkMs: 180, parseMs: 1, persistMs: 0}}, {});

        const entry = pullEntry(state, pulledEntity);
        expect(entry.done).to.equal(0);
        expect(entry.networkMs).to.equal(180);
        expect(entry.pages).to.equal(1);
    });

    it('writes no phase keys onto entities that never moved', () => {
        // An absent key reads as zero in a query. Whether a row reports phases at all is settled
        // by app_info.pageSize, so nothing is lost by keeping the untouched entries small.
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 5, durations: {networkMs: 10, parseMs: 1, persistMs: 2}}, {});

        const untouched = _.find(state.entityStatus.pull, e => e.entity !== pulledEntity);
        expect(untouched).to.deep.equal({entity: untouched.entity, todo: 0, done: 0});

        const untouchedPush = _.find(state.entityStatus.push, e => e.entity !== pushedEntity);
        expect(untouchedPush).to.deep.equal({entity: untouchedPush.entity, todo: 0, done: 0});
    });

    it('does not count a dispatch that carried no timings', () => {
        // dropOnFailure completes a push without a round trip, so there is nothing to attribute.
        state = SyncTelemetryActions.entityPushCompleted(state, {entityMetadata: {entityName: pushedEntity}}, {});

        const entry = pushEntry(state, pushedEntity);
        expect(entry.done).to.equal(1);
        expect(entry.posts).to.equal(undefined);
    });

    it('does not count a dropped post, which never completed a round trip', () => {
        // dropOnFailure pops the record and reports back with no timings, so the pop is the only
        // phase present. Counting it would deflate networkMs per post for that entity.
        const action = (durations) => ({entityMetadata: {entityName: pushedEntity}, durations});
        state = SyncTelemetryActions.entityPushCompleted(state, action({serializeMs: 4, networkMs: 100, persistMs: 2}), {});
        state = SyncTelemetryActions.entityPushCompleted(state, action({persistMs: 3}), {});

        const entry = pushEntry(state, pushedEntity);
        expect(entry.done).to.equal(2);
        expect(entry.posts).to.equal(1);
        expect(entry.networkMs).to.equal(100);
        expect(entry.persistMs).to.equal(5);
    });

    it('ignores a non-numeric duration rather than poisoning the sum with NaN', () => {
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 1, durations: {networkMs: 10, parseMs: undefined, persistMs: 2}}, {});

        const entry = pullEntry(state, pulledEntity);
        expect(entry.networkMs).to.equal(10);
        expect(entry.parseMs).to.equal(undefined);
    });

    it('keeps fractional sums at one decimal rather than trailing binary noise', () => {
        // performance.now gives sub-millisecond phases; naively summing 0.1 ten times stores
        // 1.0000000000000002 and pays for those digits in every upload.
        _.times(10, () => {
            state = SyncTelemetryActions.entityPullCompleted(state,
                {entityName: pulledEntity, numberOfPulledEntities: 1, durations: {networkMs: 0.1, parseMs: 0.2}}, {});
        });

        const entry = pullEntry(state, pulledEntity);
        expect(entry.networkMs).to.equal(1);
        expect(entry.parseMs).to.equal(2);
        expect(JSON.stringify(entry)).to.not.match(/\d\.\d{3,}/);
    });

    it('counts a page only once however many phases it carried', () => {
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 1, durations: {networkMs: 10}}, {});
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 1, durations: {networkMs: 10, parseMs: 1, persistMs: 3}}, {});

        expect(pullEntry(state, pulledEntity).pages).to.equal(2);
    });

    it('records the queue read cost against the push entry, without counting it as a post', () => {
        // getAllQueuedItems converts every queued record to its resource before any post is made.
        state = SyncTelemetryActions.recordPushTodoTelemetry(state, {
            entitiesToPost: [{metaData: {entityName: pushedEntity}, entities: [{}, {}, {}]}],
            readDurations: {[pushedEntity]: 4200}
        }, {});

        const entry = pushEntry(state, pushedEntity);
        expect(entry.todo).to.equal(3);
        expect(entry.readMs).to.equal(4200);
        expect(entry.posts).to.equal(undefined);
    });

    it('records the queue read cost for an entity that turned out to have nothing to push', () => {
        state = SyncTelemetryActions.recordPushTodoTelemetry(state,
            {entitiesToPost: [], readDurations: {[pushedEntity]: 15}}, {});

        const entry = pushEntry(state, pushedEntity);
        expect(entry.todo).to.equal(0);
        expect(entry.readMs).to.equal(15);
    });

    it('splits a pulled entity by type, so one slow encounter type is visible', () => {
        const typeA = 'enc-type-a', typeB = 'enc-type-b';
        state = SyncTelemetryActions.recordFirstPageOfPull(state, {entityName: pulledEntity, totalElements: 900, entityTypeUuid: typeA}, {});
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 900, durations: {networkMs: 8000, parseMs: 300, persistMs: 12000}, entityTypeUuid: typeA}, {});
        state = SyncTelemetryActions.recordFirstPageOfPull(state, {entityName: pulledEntity, totalElements: 10, entityTypeUuid: typeB}, {});
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 10, durations: {networkMs: 200, parseMs: 5, persistMs: 40}, entityTypeUuid: typeB}, {});

        const entry = pullEntry(state, pulledEntity);
        expect(entry.done).to.equal(910);
        expect(entry.persistMs).to.equal(12040);
        expect(entry.byType[typeA]).to.deep.equal({todo: 900, done: 900, networkMs: 8000, parseMs: 300, persistMs: 12000, pages: 1});
        expect(entry.byType[typeB]).to.deep.equal({todo: 10, done: 10, networkMs: 200, parseMs: 5, persistMs: 40, pages: 1});
    });

    it('leaves byType off an entity that has no subtypes', () => {
        // EntitySyncStatusService.setup stores an empty entityTypeUuid for those.
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 3, durations: {networkMs: 10}, entityTypeUuid: ''}, {});

        expect(pullEntry(state, pulledEntity).byType).to.equal(undefined);
    });

    it('keeps todo counts and durations on the same entry', () => {
        state = SyncTelemetryActions.recordFirstPageOfPull(state, {entityName: pulledEntity, totalElements: 1200}, {});
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 1000, durations: {networkMs: 900, parseMs: 80, persistMs: 2400}}, {});

        const entry = pullEntry(state, pulledEntity);
        expect(entry.todo).to.equal(1200);
        expect(entry.done).to.equal(1000);
        expect(entry.networkMs).to.equal(900);
    });
});

describe('SyncTelemetryActions entityStatus serialisation', () => {
    let state, pulledEntity;

    beforeEach(() => {
        state = SyncTelemetryActions.onSyncStart(SyncTelemetryActions.getInitialState(), {appInfo: {}, syncSource: 'test'}, {});
        pulledEntity = state.entityStatus.pull[0].entity;
        state = SyncTelemetryActions.entityPullCompleted(state,
            {entityName: pulledEntity, numberOfPulledEntities: 42, durations: {networkMs: 300, parseMs: 20, persistMs: 90}}, {});
    });

    it('does not re-serialise entityStatus on every dispatch', () => {
        // The point of holding the object in state: ENTITY_PUSH_COMPLETED fires once per record.
        const onModel = JSON.parse(state.syncTelemetry.entityStatus);
        expect(_.find(onModel.pull, e => e.entity === pulledEntity).done).to.equal(0);
    });

    it('writes the accumulated status onto the row when the sync completes', () => {
        const newState = SyncTelemetryActions.syncCompleted(state, {}, stubContext());

        const persisted = JSON.parse(newState.syncTelemetry.entityStatus);
        const entry = _.find(persisted.pull, e => e.entity === pulledEntity);
        expect(entry.done).to.equal(42);
        expect(entry.networkMs).to.equal(300);
        expect(persisted.totalCounts).to.not.equal(undefined);
    });

    it('writes the accumulated status onto the row when the sync fails', () => {
        // A failed sync is exactly where the per-entity counts and durations matter.
        const newState = SyncTelemetryActions.syncFailed(state, {error: new Error('Connection reset')}, stubContext());

        const persisted = JSON.parse(newState.syncTelemetry.entityStatus);
        const entry = _.find(persisted.pull, e => e.entity === pulledEntity);
        expect(entry.done).to.equal(42);
        expect(entry.persistMs).to.equal(90);
    });

    it('starts each sync from a clean status', () => {
        const fresh = SyncTelemetryActions.onSyncStart(state, {appInfo: {}, syncSource: 'test'}, {});
        expect(_.find(fresh.entityStatus.pull, e => e.entity === pulledEntity).done).to.equal(0);
        expect(_.find(fresh.entityStatus.pull, e => e.entity === pulledEntity).networkMs).to.equal(undefined);
    });
});
