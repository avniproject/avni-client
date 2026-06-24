/**
 * RuleService.writeMediaIntoGroup — copies a media value into a Repeatable Question Group row via a
 * debounced, self-triggering dispatch (RULE_SERVICE.OBSERVATION_WRITE_BATCH → onObservationWriteBatch),
 * the same mechanism the inference path uses. These tests cover the dedup + queue behaviour; the obs
 * write itself is exercised by the inference-batch handler tests.
 */

// The @Service decorator needs a no-op so the module loads outside the app container.
jest.mock('../../src/framework/bean/Service', () => () => (target) => target);

import RuleService from '../../src/service/RuleService';

describe('RuleService.writeMediaIntoGroup', () => {
    let service;

    // rows[i][concept] = stored value; a missing key (or null row) means the child obs is absent.
    const fakeRqgEntity = (uuid, rows) => ({
        uuid,
        findObservation: jest.fn(() => rows == null ? undefined : ({
            getValueWrapper: () => ({
                size: () => rows.length,
                getGroupObservationAtIndex: (idx) => {
                    const row = rows[idx];
                    return row == null ? null : ({
                        findObservationByConceptUUID: (target) =>
                            Object.prototype.hasOwnProperty.call(row, target)
                                ? {getValue: () => row[target]}
                                : undefined,
                    });
                },
            }),
        })),
    });

    const getFileName = (u) => {
        const m = String(u).trim().match(/[0-9A-Fa-f-]{36}\.\w+$/);
        return m ? m[0] : u;
    };

    beforeEach(() => {
        service = new RuleService(null, null);
        // init() does heavy rule-dependency loading; inject the only collaborator the write path needs.
        service.mediaService = {getFileName};
        service.dispatchAction = jest.fn();
    });

    afterEach(() => {
        if (service && service._flushTimer) {
            clearTimeout(service._flushTimer);
            service._flushTimer = null;
        }
    });

    // Flush the trailing debounce deterministically instead of waiting on the real timer.
    const flushWrites = () => service._flushPendingWrites();

    it('queues a write for a row that has no image yet', () => {
        service.writeMediaIntoGroup('uuid.jpg', fakeRqgEntity('e1', [{}]), 'Summary', 'Oral Image', 0);
        flushWrites();
        expect(service.dispatchAction).toHaveBeenCalledWith(
            'RULE_SERVICE.OBSERVATION_WRITE_BATCH',
            {results: [{questionGroupConceptName: 'Summary', conceptName: 'Oral Image', questionGroupIndex: 0, value: 'uuid.jpg'}]}
        );
    });

    it('skips when the row already holds the same image — even if stored as a full S3 URL vs a bare filename', () => {
        const stored = 'https://s3.ap-south-1.amazonaws.com/prod-user-media/tanuh_uat/9458f3da-495d-43ed-81b3-b412ca33aa69.jpg';
        const entity = fakeRqgEntity('e1', [{'Oral Image': stored}]);
        // Source value is the bare filename for the SAME image — normalised compare must treat them equal.
        service.writeMediaIntoGroup('9458f3da-495d-43ed-81b3-b412ca33aa69.jpg', entity, 'Summary', 'Oral Image', 0);
        flushWrites();
        expect(service.dispatchAction).not.toHaveBeenCalled();
    });

    it('dedups repeated calls for the same row+image (rules re-fire) — one dispatch', () => {
        const entity = fakeRqgEntity('e1', [{}]);
        service.writeMediaIntoGroup('uuid.jpg', entity, 'Summary', 'Oral Image', 0);
        service.writeMediaIntoGroup('uuid.jpg', entity, 'Summary', 'Oral Image', 0);
        service.writeMediaIntoGroup('uuid.jpg', entity, 'Summary', 'Oral Image', 0);
        flushWrites();
        expect(service.dispatchAction).toHaveBeenCalledTimes(1);
        expect(service.dispatchAction.mock.calls[0][1].results).toHaveLength(1);
    });

    it('re-copies when the image actually changes (retake → different filename)', () => {
        const entity = fakeRqgEntity('e1', [{}]);
        service.writeMediaIntoGroup('old.jpg', entity, 'Summary', 'Oral Image', 0);
        service.writeMediaIntoGroup('new.jpg', entity, 'Summary', 'Oral Image', 0); // different file → re-dispatch
        flushWrites();
        expect(service.dispatchAction.mock.calls[0][1].results.map(r => r.value)).toEqual(['old.jpg', 'new.jpg']);
    });

    it('skips on missing args (no uri / bad rqgIdx) without queuing', () => {
        const entity = fakeRqgEntity('e1', [{}]);
        service.writeMediaIntoGroup(null, entity, 'Summary', 'Oral Image', 0);
        service.writeMediaIntoGroup('uuid.jpg', entity, 'Summary', 'Oral Image', undefined);
        flushWrites();
        expect(service.dispatchAction).not.toHaveBeenCalled();
    });
});
