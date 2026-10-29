import _ from 'lodash';
import {EntityMetaData} from 'openchs-models';
import ProgressbarStatus from '../../src/service/ProgressbarStatus';
import AllSyncableEntityMetaData from '../../src/model/AllSyncableEntityMetaData';

function runFullSync(mediaUploadRequired, queuedEntityNames) {
    const reported = [];
    const steps = AllSyncableEntityMetaData.getProgressSteps(mediaUploadRequired, EntityMetaData.model(), queuedEntityNames);
    const status = new ProgressbarStatus((progress) => reported.push(progress), steps);

    _.filter(queuedEntityNames, (name) => name !== 'SyncTelemetry').forEach((name) => status.onComplete(name, 0));
    steps.forEach(({name}) => {
        if (name === 'SyncTelemetry') return;
        [0, 1, 2].forEach((page) => status.onComplete(name, 3, page));
    });
    status.onComplete('SyncTelemetry', 0);
    status.onComplete('SyncTelemetry', 0);
    return {reported, status};
}

describe('ProgressbarStatus', () => {
    [
        ['without media or queued uploads', false, []],
        ['with media to upload', true, []],
        ['with queued uploads', false, ['Individual']],
        ['with media and queued uploads', true, ['Individual']],
    ].forEach(([label, media, queued]) => {
        it(`stays below 100% until the sync completes, ${label}`, () => {
            const {reported, status} = runFullSync(media, queued);
            expect(_.max(reported)).toBeLessThan(1);
            status.onSyncComplete();
            expect(_.last(reported)).toBe(1);
        });

        it(`never goes down, ${label}`, () => {
            const {reported} = runFullSync(media, queued);
            reported.forEach((progress, i) => i > 0 && expect(progress).toBeGreaterThanOrEqual(reported[i - 1]));
        });
    });

    it('does not pass 100% when entities are pulled again after a mid-sync backend switch', () => {
        const {reported, status} = runFullSync(false, []);
        ['ResetSync', 'UserInfo', 'MyGroups', 'Concept', 'Form', 'FormElement'].forEach((name) => status.onComplete(name, 1, 0));
        expect(_.max(reported)).toBeLessThan(1);
    });

    it('reaches nearly all of the bar once every entity has been pulled', () => {
        const {reported} = runFullSync(false, []);
        expect(_.last(reported)).toBeGreaterThan(0.95);
    });
});
