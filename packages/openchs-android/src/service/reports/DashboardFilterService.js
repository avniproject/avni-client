import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {
    Concept,
    CustomFilter,
    DashboardFilter,
    DashboardFilterConfig,
    EncounterType,
    GroupSubjectTypeFilter,
    ObservationBasedFilter,
    Program,
    SubjectType
} from 'openchs-models';
import {DashboardReportFilter} from "../../model/DashboardReportFilters";
import _ from "lodash";
import AddressLevelService from "../AddressLevelService";


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

    toRuleInputObject(filterConfig, filterValue) {
        const ruleInput = new DashboardReportFilter();
        ruleInput.type = filterConfig.type;
        ruleInput.dataType = filterConfig.widget;

        if (filterConfig.type === CustomFilter.type.GroupSubject) {
            ruleInput.groupSubjectTypeFilter = {
                subjectType: filterConfig.groupSubjectTypeFilter.subjectType
            }
        } else if (filterConfig.type === CustomFilter.type.Concept) {
            const {scope, concept, programs, encounterTypes} = filterConfig.observationBasedFilter;
            ruleInput.observationBasedFilter = {
                scope: scope,
                concept: concept,
                programs: _.keyBy(programs, (x) => x.uuid),
                encounterTypes: _.keyBy(encounterTypes, (x) => x.uuid)
            };
        }
        if (filterConfig.type === CustomFilter.type.Address) {
            if (_.isEmpty(filterValue.selectedAddresses)) {
                ruleInput.filterValue = filterValue.selectedAddresses;
            } else {
                const addressLevelService = this.getService(AddressLevelService);
                const addressFilterValues = [...filterValue.selectedAddresses];
                const allChildrenOfLowestSelectedLocations = filterValue.selectedAddresses
                    .filter(location => location.level === _.get(_.minBy(filterValue.selectedAddresses, 'level'), 'level'))
                    .reduce((acc, parent) => acc.concat(addressLevelService.getDescendantsOfNode(parent, true)), []);
                ruleInput.filterValue = addressFilterValues.concat(allChildrenOfLowestSelectedLocations
                    .map(addressLevel => _.pick(addressLevel, ['uuid', 'name', 'level', 'type', 'parentUuid'])));
            }
        }
        else
            ruleInput.filterValue = filterValue;
        return ruleInput;
    }

    hasFilters(dashboardUUID) {
        return this.getFilters(dashboardUUID).length > 0;
    }
}

export default DashboardFilterService;
