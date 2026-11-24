import FileSystem from "../model/FileSystem";
import {Observation, Point} from "openchs-models";
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import GlobalContext from "../GlobalContext";
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
        // Active backend for visibility in server-side sync telemetry. Lets ops
        // queries compare admin intent (group membership) vs reality on device.
        try {
            appInfo.activeBackend = GlobalContext.getInstance().getActiveBackend() || 'realm';
        } catch (e) {
            appInfo.activeBackend = 'unknown';
        }
        // Always a present key, null included: its presence is what marks a row as one that
        // reports phase durations at all, now that the phases themselves are sparse.
        appInfo.pageSize = this.getService(SettingsService).getSettings().pageSize ?? null;
        return appInfo;
    }
}
