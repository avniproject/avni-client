import _ from 'lodash'

class ProgressbarStatus {
    constructor(onprogress, progressSteps) {
        this.progressSteps = progressSteps;
        this.onprogress = onprogress;
        this.progress = 0.0;
    }

    onComplete(event, totalNumberOfPages, currentPageNumber) {
        const entityMetaData = _.head(this.progressSteps.filter((step) => step.name === event));
        //SyncTelemetry is called twice during sync
        const syncWeight = !_.isNil(entityMetaData) ? (entityMetaData.name === 'SyncTelemetry' ? entityMetaData.syncWeight / 2 : entityMetaData.syncWeight) : 0;
        this.progress += (syncWeight / ((totalNumberOfPages === 0 ? 1 : totalNumberOfPages) * 100));
        this.onprogress(this.progress, totalNumberOfPages, currentPageNumber);
    }

    onSyncComplete() {
        this.onprogress(this.progress = 1);
    }

    updateProgressSteps(entitiesMetadata, syncDetails) {
        this.progressSteps = this.progressSteps.map(step => {
            const metadata = _.find(entitiesMetadata, (metadata) => metadata.entityName === step.name);
            const entityTypeCount = _.filter(syncDetails, sd => sd.entityName === step.name).length;
            if (metadata && metadata.privilegeParam && entityTypeCount > 1) {
                return {name: step.name, syncWeight: step.syncWeight / entityTypeCount}
            } else {
                return step;
            }
        });
    }

}

export default ProgressbarStatus
