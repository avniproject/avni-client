import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {DashboardCache} from "avni-models";


@Service('dashboardCacheService')
class DashboardCacheService extends BaseService {

    constructor(db, props) {
        super(db, props);
    }

    getSchema() {
        return DashboardCache.schema.name;
    }

    cachedData() {
        const cache = this.findAll();
        if (cache === undefined || cache.length === 0) return DashboardCache.createEmptyInstance();
        return cache[0];
    }

    cardJSON() {
        return this.cachedData().getCardJSON();
    }

    filterJSON(){
        return this.cachedData().getFilterJSON();
    }

}

export default DashboardCacheService;
