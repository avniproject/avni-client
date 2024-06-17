import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {DashboardCache} from "openchs-models";
import _ from 'lodash';

@Service('dashboardCacheService')
class DashboardCacheService extends BaseService {
    constructor(db, props) {
        super(db, props);
    }

    getSchema() {
        return DashboardCache.schema.name;
    }

    getCache() {
        const cache = this.findOnly();
        if (_.isNil(cache)) {
            this.saveOrUpdate(DashboardCache.createEmptyInstance());
        }
        return this.findOnly();
    }

    updateCard(card) {
        this.db.write(() => {
            const dashboardCache = this.getCache();
            dashboardCache.setCard(card);
        });
    }

    updateFilter(filter) {
        this.db.write(() => {
            const dashboardCache = this.getCache();
            dashboardCache.setFilter(filter);
        });
    }

    clear() {
        const db = this.db;
        this.db.write(() => {
            const dashboardCache = this.findOnly();
            db.delete(dashboardCache);
        });
    }
}

export default DashboardCacheService;
