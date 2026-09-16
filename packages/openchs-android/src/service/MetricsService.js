import FileSystem from "../model/FileSystem";
import {Observation, Point} from "openchs-models";
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import SettingsService from "./SettingsService";

@Service("metricsService")
export default class MetricsService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    async getAppInfo() {
        const appInfo = {};
        appInfo.dbSize = await FileSystem.getRealmDBSize();
        appInfo.observationCount = this.getCount(Observation.schema.name);
        appInfo.pointCount = this.getCount(Point.schema.name);
        // Always a present key, null included: its presence is what marks a row as one that
        // reports phase durations at all, now that the phases themselves are sparse.
        appInfo.pageSize = this.getService(SettingsService).getSettings().pageSize ?? null;
        return appInfo;
    }

    getDanglingCount(schemaName) {
        return this.db.objects(schemaName).filtered("@links.@count == 0").length;
    }
}