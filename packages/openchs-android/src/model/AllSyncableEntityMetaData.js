import _ from "lodash";
import {EntityMetaData} from 'openchs-models';

function getFormattedMetadata(metadata, reduceWeightBy) {
    return _.map(metadata, (data) => ({
        name: data.entityName,
        syncWeight: data.syncWeight / reduceWeightBy
    }));
}

class AllSyncableEntityMetaData {
    static getProgressSteps(mediaUploadRequired, allEntitiesMetaData, queuedEntityNames) {
        let allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx" || entityMetaData.type === "virtualTx");

        let mediaEntities = [];
        if (mediaUploadRequired) {
            mediaEntities = ['Media', 'After_Media'].map((media) => ({
                name: media,
                syncWeight: (allReferenceDataMetaData.length * 0.1) / 2
            }));

            //reduce some weights from ref data for media, which will be used two times during sync
            allReferenceDataMetaData = allReferenceDataMetaData.map((entityMetaData) => ({
                name: entityMetaData.entityName,
                syncWeight: (entityMetaData.syncWeight - 0.1) / 2
            }));
        }
        const txMetaData = getFormattedMetadata(allTxEntityMetaData, 1);
        const queuedItemsMetaData = allTxEntityMetaData.filter((x: EntityMetaData) => _.some(queuedEntityNames, (y) => y === x.entityName));
        //entities will be used twice during sync
        const entityQueueData = _.map(_.intersectionBy(txMetaData, queuedItemsMetaData, 'name'), (data) => ({
            name: data.name,
            syncWeight: data.syncWeight / 2
        }));
        return _.concat(
            getFormattedMetadata(allReferenceDataMetaData, 1),
            entityQueueData,
            _.differenceBy(txMetaData, entityQueueData, 'name'),
            mediaEntities
        );
    }
}

export default AllSyncableEntityMetaData;
