import _ from 'lodash'

class ProgressbarStatus {

    constructor(onprogress, progressSteps) {
        this.progressSteps = progressSteps;
        this.initialCount = progressSteps.length;
        this.onprogress = onprogress;
        this.progress = 0.0;
    }

    onComplete(event, numberOfPages) {
        const entityMetaData = _.head(this.progressSteps.filter((step) => step.name === event));
        //SyncTelemetry is called twice during sync
        const syncWeight = !_.isNil(entityMetaData) ? (entityMetaData.name === 'SyncTelemetry' ? entityMetaData.syncWeight / 2 : entityMetaData.syncWeight) : 0;
        this.progress += (syncWeight / ((numberOfPages === 0 ? 1 : numberOfPages) * 100));
        this.onprogress(this.progress);
    }

}

export default ProgressbarStatus
