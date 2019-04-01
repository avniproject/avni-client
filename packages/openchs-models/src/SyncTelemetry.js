import BaseEntity from "./BaseEntity";
import _ from "lodash";
import General from "./utility/General";
import EntityMetaData from "./EntityMetaData";

class SyncTelemetry extends BaseEntity {
    static schema = {
        name: "SyncTelemetry",
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            appVersion: 'string',
            androidVersion: 'string',
            deviceName: 'string',
            syncStatus: 'string',
            syncStartTime: 'date',
            syncEndTime: 'date?',
            entityStatus: 'string',
        }
    };

    static fromResource() {
        throw new Error('This should never be called because server always returns an empty array for this resource')
    }

    static newInstance() {
        const syncTelemetry = new SyncTelemetry();
        syncTelemetry.uuid = General.randomUUID();
        syncTelemetry.syncStartTime = new Date();
        syncTelemetry.syncStatus = "incomplete";
        const allEntitiesMetaData = EntityMetaData.model();
        const initialEntityStatus = {
            push: allEntitiesMetaData.map(e => ({entity: e.entityName, todo: 0, done: 0})),
            pull: allEntitiesMetaData.map(e => ({entity: e.entityName, todo: 0, done: 0}))
        };
        syncTelemetry.setEntityStatus(initialEntityStatus);
        return syncTelemetry;
    }

    setEntityStatus(statusObject) {
        this.entityStatus = JSON.stringify(statusObject);
    }

    getEntityStatus() {
        return JSON.parse(this.entityStatus);
    }

    get toResource() {
        const resource = _.pick(this, ["uuid", "syncStatus", "syncStartTime", "syncEndTime", "appVersion", "androidVersion", "deviceName"]);
        resource.entityStatus = this.getEntityStatus();
        return resource;
    }

    clone() {
        const syncTelemetry = new SyncTelemetry();
        syncTelemetry.uuid = this.uuid;
        syncTelemetry.syncStatus = this.syncStatus;
        syncTelemetry.syncStartTime = this.syncStartTime;
        syncTelemetry.syncEndTime = this.syncEndTime;
        syncTelemetry.entityStatus = this.entityStatus;
        syncTelemetry.createdAt = this.createdAt;
        syncTelemetry.appVersion = this.appVersion;
        syncTelemetry.androidVersion = this.androidVersion;
        syncTelemetry.deviceName = this.deviceName;
        return syncTelemetry;
    }

}

export default SyncTelemetry;