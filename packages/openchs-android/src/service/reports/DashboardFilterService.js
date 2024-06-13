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
import {DashboardReportFilter} from "../../model/DashboardReportFilter";
import _ from "lodash";
import AddressLevelService from "../AddressLevelService";
import General from "../../utility/General";
import {JSONStringify} from "../../utility/JsonStringify";

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
            filterConfigs[x.uuid] = this.getDashboardFilterConfig(x);
        });
        return filterConfigs;
    }

    getDashboardFilterConfig(dashboardFilter) {
        const obj = JSON.parse(dashboardFilter.filterConfig);
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
        return filterConfig;
    }

    toRuleInputObjects(dashboardUUID, selectedFilterValues) {
        const filterConfigs = this.getFilterConfigsForDashboard(dashboardUUID);
        const thisService = this;
        return Object.entries(selectedFilterValues)
            .map(([filterUUID, filterValue]) => thisService.toRuleInputObject(filterConfigs[filterUUID], filterValue));
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
                const descendants = filterValue.selectedAddresses
                    .filter(location => location.level === _.get(_.minBy(filterValue.selectedAddresses, 'level'), 'level'))
                    .reduce((acc, parent) => acc.concat(addressLevelService.getDescendantsOfNode(parent)), []);
                ruleInput.filterValue = addressFilterValues.concat(descendants
                    .map(addressLevel => _.pick(addressLevel, ['uuid', 'name', 'level', 'type', 'parentUuid'])));
                General.logDebug('DashboardFilterService', `Effective address filters: ${JSON.stringify(_.countBy(ruleInput.filterValue, "type"))}`);
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
