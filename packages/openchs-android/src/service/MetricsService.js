import FileSystem from "../model/FileSystem";
import {Observation, Point} from "openchs-models";
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";

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
        appInfo.danglingPointCount = this.getDanglingCount(Point.schema.name);
        appInfo.danglingObservationCount = this.getDanglingCount(Observation.schema.name);
        return appInfo;
    }

    getDanglingCount(schemaName) {
        return this.db.objects(schemaName).filtered("@links.@count == 0").length;
    }
}