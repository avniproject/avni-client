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
        this.transactionManager.write(() => {
            const dashboardCache = this.getCache();
            dashboardCache.setCard(card);
            this.repository.create(dashboardCache, true);
        });
    }

    updateFilter(filter) {
        this.transactionManager.write(() => {
            const dashboardCache = this.getCache();
            dashboardCache.setFilter(filter);
            this.repository.create(dashboardCache, true);
        });
    }

    clear() {
        this.transactionManager.write(() => {
            const dashboardCache = this.findOnly();
            if (!_.isNil(dashboardCache))
                this.repository.deleteInTransaction(dashboardCache);
        });
    }
}

export default DashboardCacheService;
