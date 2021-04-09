import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {SyncTelemetry} from 'avni-models';
import _ from 'lodash';

@Service("syncTelemetryService")
export default class SyncTelemetryService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    atLeastOneSyncCompleted() {
        let results = this.db.objects(SyncTelemetry.schema.name).filtered("syncStatus = $0", "complete");
        return !_.isEmpty(results);
    }
}
