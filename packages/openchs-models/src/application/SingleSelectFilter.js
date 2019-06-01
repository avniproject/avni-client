// @flow
import Filter from "./Filter";
import {SingleSelectFilter as SingleSelectFilterModel} from "../../index";
import SubjectType from "../SubjectType";

export default class SingleSelectFilter extends Filter {
    constructor(label, optsFnMap, optsQueryMap, options) {
        super(label, Filter.types.SingleSelect, optsFnMap, optsQueryMap, options);
    }

    selectOption(option) {
        return new SingleSelectFilter(this.label, this.optsFnMap, this.optsQueryMap, this.selectedOptions.indexOf(option) > -1 ? [] : [option]);
    }

    isApplied() {
        return this.selectedOptions.length > 0;
    }

    toString() {
        return `${this.label} - ${this.selectedOptions.join(", ")}`;
    }

    clone() {
        return new SingleSelectFilter(this.label, this.optsFnMap, this.optsQueryMap, this.selectedOptions);
    }

    static forSubjectTypes(subjectTypes : Array<SubjectType>, selectedSubjectType: SubjectType): SingleSelectFilter {
        const filterModel = new SingleSelectFilterModel(
            "Choose type",
            subjectTypes.reduce(
                (subjectTypesMap, subjectType) => subjectTypesMap.set(subjectType.name, subjectType),
                new Map())
        );

        return filterModel.selectOption(selectedSubjectType.name)
    }
}