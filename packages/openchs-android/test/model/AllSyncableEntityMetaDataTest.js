import _ from "lodash";
import AllSyncableEntityMetaData from "../../src/model/AllSyncableEntityMetaData";
import {EntityMetaData, Individual} from 'openchs-models';

it('getting progress steps should not throw error', function () {
    AllSyncableEntityMetaData.getProgressSteps(false, EntityMetaData.model(), []);
    AllSyncableEntityMetaData.getProgressSteps(true, EntityMetaData.model(), []);
    AllSyncableEntityMetaData.getProgressSteps(false, EntityMetaData.model(), [Individual]);
    AllSyncableEntityMetaData.getProgressSteps(true, EntityMetaData.model(), [Individual]);
});

describe('progress step weights', () => {
    const totalOf = (steps, queued = []) => _.sumBy(steps, ({name, syncWeight}) => _.includes(queued, name) ? syncWeight * 2 : syncWeight);

    [[false, []], [true, []], [false, ['Individual']], [true, ['Individual', 'Encounter']]].forEach(([media, queued]) => {
        it(`add up to 100 across a whole sync (media: ${media}, queued: ${queued})`, () => {
            const steps = AllSyncableEntityMetaData.getProgressSteps(media, EntityMetaData.model(), queued);
            expect(totalOf(steps, queued)).toBeCloseTo(100);
        });
    });

    it('are never negative', () => {
        const steps = AllSyncableEntityMetaData.getProgressSteps(true, EntityMetaData.model(), []);
        expect(_.filter(steps, ({syncWeight}) => syncWeight < 0)).toEqual([]);
    });

    it('halve an entity that is both uploaded and downloaded', () => {
        const plain = _.find(AllSyncableEntityMetaData.getProgressSteps(false, EntityMetaData.model(), []), ['name', 'Individual']);
        const queued = _.find(AllSyncableEntityMetaData.getProgressSteps(false, EntityMetaData.model(), ['Individual']), ['name', 'Individual']);
        expect(queued.syncWeight).toBeCloseTo(plain.syncWeight / 2);
    });
});
