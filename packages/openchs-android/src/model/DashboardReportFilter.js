// Objects has been used in place of arrays to allow for flexibility in contract in the future.

import _ from "lodash";
import {CustomFilter} from "openchs-models";

export class DashboardReportFilter {
    type;
    dataType;
    groupSubjectTypeFilter;
    observationBasedFilter;
    filterValue;

    static getAddressFilter(reportFilters) {
        if (_.isNil(reportFilters)) return null;
        return _.find(reportFilters, (x: DashboardReportFilter) => x.type === CustomFilter.type.Address);
    }

    static getGenderFilterValues(reportFilters = []) {
        const genderFilter = _.find(reportFilters, (x: DashboardReportFilter) => x.type === CustomFilter.type.Gender);
        if (_.isNil(genderFilter)) return [];
        return genderFilter.filterValue;
    }

    getScope() {
        return _.get(this.observationBasedFilter, "scope");
    }

    getConceptUUID() {
        return _.get(this.observationBasedFilter, "concept.uuid");
    }

    getScopeParameters() {
        if (_.isNil(this.observationBasedFilter)) return null;

        return {
            programUUIDs: Object.keys(this.observationBasedFilter.programs),
            encounterTypeUUIDs: Object.keys(this.observationBasedFilter.encounterTypes)
        };
    }
}
