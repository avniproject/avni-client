import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {DashboardFilter, DashboardFilterConfig, SubjectType, CustomFilter, ObservationBasedFilter, GroupSubjectTypeFilter, Program, EncounterType, Concept, Dashboard} from 'openchs-models';

@Service("dashboardFilterService")
class DashboardFilterService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return DashboardFilter.schema.name;
    }

    getFilters(dashboardUUID) {
        return this.db.objects(this.getSchema()).filtered("dashboard.uuid = $0 and voided = false", dashboardUUID);
    }

    getFilterConfigsForDashboard(dashboardUUID) {
        const dashboardFilters = this.getFilters(dashboardUUID);
        const filterConfigs = {};
        dashboardFilters.forEach((x) => {
            const obj = JSON.parse(x.filterConfig);
            const filterConfig = new DashboardFilterConfig();
            filterConfig.widget = obj.widget;
            filterConfig.type = obj.type;
            filterConfig.subjectType = this.findByUUID(obj.subjectTypeUUID, SubjectType.schema.name);
            if (obj.type === CustomFilter.type.GroupSubject) {
                filterConfig.groupSubjectTypeFilter = new GroupSubjectTypeFilter();
                filterConfig.groupSubjectTypeFilter.subjectType = this.findByUUID(obj.groupSubjectTypeFilter.subjectTypeUUID, SubjectType.schema.name);
            } else if (obj.type === CustomFilter.type.Concept) {
                const observationBasedFilter = new ObservationBasedFilter();
                observationBasedFilter.scope = obj.observationBasedFilter.scope;
                observationBasedFilter.programs = obj.observationBasedFilter.programUUIDs.map(x => this.findByUUID(x, Program.schema.name));
                observationBasedFilter.encounterTypes = obj.observationBasedFilter.encounterTypeUUIDs.map(x => this.findByUUID(x, EncounterType.schema.name));
                observationBasedFilter.concept = this.findByUUID(obj.observationBasedFilter.conceptUUID, Concept.schema.name);
                filterConfig.observationBasedFilter = observationBasedFilter;
            }
            filterConfigs[x.uuid] = filterConfig;
        });
        return filterConfigs;
    }

    hasFilters(dashboardUUID) {
        return this.getFilters(dashboardUUID).length > 0;
    }
}

export default DashboardFilterService;
