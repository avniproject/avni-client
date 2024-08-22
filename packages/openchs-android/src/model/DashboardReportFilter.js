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

    static getAsOnDate(reportFilters = []) {
        const asOnDateFilter = _.find(reportFilters, (x: DashboardReportFilter) => x.type === CustomFilter.type.AsOnDate);
        if (_.isNil(asOnDateFilter) || _.isNil(asOnDateFilter.filterValue)) return new Date();

        return asOnDateFilter.filterValue;
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
        switch (this.type) {
            case CustomFilter.type.Gender:
            case CustomFilter.type.Address:
            case CustomFilter.type.GroupSubject:
            case CustomFilter.type.Concept:
                return this.dataType === CustomFilter.widget.Range ? !this.filterValue.isEmpty() : !_.isEmpty(this.filterValue);
            case CustomFilter.type.AsOnDate:
            case CustomFilter.type.RegistrationDate:
            case CustomFilter.type.EnrolmentDate:
            case CustomFilter.type.ProgramEncounterDate:
            case CustomFilter.type.EncounterDate:
                return this.dataType === CustomFilter.widget.Range ? !this.filterValue.isEmpty() : !_.isNil(this.filterValue);
            case CustomFilter.type.SubjectType:
                return !this.filterValue.isEmpty();
            default:
                return false;
        }
    }

    toDisplayText() {
        let s = `Type: ${this.type}. DataType: ${this.dataType}.`;
        if (this.type === CustomFilter.type.Concept) {
            s += ` Concept: ${this.observationBasedFilter.concept.name}`;
        }
        return s;
    }
}
