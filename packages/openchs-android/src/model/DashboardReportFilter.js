// Objects has been used in place of arrays to allow for flexibility in contract in the future.

import _ from "lodash";
import {CustomFilter} from "openchs-models";
import General from "../utility/General";

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

    hasValue() {
        General.logDebugTemp("DashboardReportFilter", this.type, this.filterValue);

        switch (this.type) {
            case CustomFilter.type.Gender:
            case CustomFilter.type.Address:
                return !_.isEmpty(this.filterValue);
            case CustomFilter.type.RegistrationDate:
            case CustomFilter.type.EnrolmentDate:
            case CustomFilter.type.ProgramEncounterDate:
            case CustomFilter.type.EncounterDate:
                return this.dataType === CustomFilter.widget.Range ? !this.filterValue.isEmpty() : !_.isNil(this.filterValue);
            case CustomFilter.type.GroupSubject:
                return !_.isNil(this.filterValue);
            case CustomFilter.type.SubjectType:
                return this.filterValue.isEmpty();
            case CustomFilter.type.Concept:
                return this.observationBasedFilter.concept.isCodedConcept() ? !_.isEmpty(this.filterValue) : !_.isNil(this.filterValue);
            default:
                return false;
        }
    }
}
