import AllSyncableEntityMetaData from "../../src/model/AllSyncableEntityMetaData";
import {EntityMetaData, Individual} from 'openchs-models';

it('getting progress steps should not throw error', function () {
    AllSyncableEntityMetaData.getProgressSteps(false, EntityMetaData.model(), []);
    AllSyncableEntityMetaData.getProgressSteps(true, EntityMetaData.model(), []);
    AllSyncableEntityMetaData.getProgressSteps(false, EntityMetaData.model(), [Individual]);
    AllSyncableEntityMetaData.getProgressSteps(true, EntityMetaData.model(), [Individual]);
});
