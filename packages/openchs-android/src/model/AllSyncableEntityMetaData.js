import _ from "lodash";

function getFormattedMetadata(metadata, reduceWeightBy) {
    return _.map(metadata, (data) => ({
        name: data.entityName,
        syncWeight: data.syncWeight / reduceWeightBy
    }));
}

class AllSyncableEntityMetaData {
    static getProgressSteps(mediaUploadRequired, allEntitiesMetaData, queuedEntityNames) {
        let allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");

        let mediaEntities = [];
        if (mediaUploadRequired) {
            mediaEntities = ['Media', 'After_Media'].map((media) => ({
                name: media,
                syncWeight: (allReferenceDataMetaData.length * 0.1) / 2
            }));

            //reduce some weights from ref data for media, which will be used two times during sync
            allReferenceDataMetaData = allReferenceDataMetaData.map((entityMetaData) => ({
                name: entityMetaData.entityName,
                syncWeight: Math.max(0, entityMetaData.syncWeight - 0.1) / 2
            }));
        }
        const txMetaData = getFormattedMetadata(allTxEntityMetaData, 1);
        //entities will be used twice during sync
        const entityQueueData = _.map(_.filter(txMetaData, ({name}) => _.includes(queuedEntityNames, name)), (data) => ({
            name: data.name,
            syncWeight: data.syncWeight / 2
        }));
        const steps = _.concat(
            getFormattedMetadata(allReferenceDataMetaData, 1),
            entityQueueData,
            _.differenceBy(txMetaData, entityQueueData, 'name'),
            mediaEntities
        );
        // The model's weights do not add up to 100, so scale them to fill the bar exactly once every step has run
        const totalWeight = _.sumBy(steps, (step) => _.some(entityQueueData, ['name', step.name]) ? step.syncWeight * 2 : step.syncWeight);
        return _.map(steps, (step) => ({...step, syncWeight: step.syncWeight * 100 / totalWeight}));
    }
}

export default AllSyncableEntityMetaData;
