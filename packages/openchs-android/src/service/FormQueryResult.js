import _ from "lodash";
import General from "../utility/General";

class FormQueryResult {
    constructor(queryResult) {
        this.formMappings = queryResult;
    }

    forEncounterType(encounterType) {
        this.encounterTypeFilter = true;
        this.formMappings = _.filter(this.formMappings, (formMapping) => formMapping.observationsTypeEntityUUID === encounterType.uuid);
        return this;
    }

    forProgram(program) {
        this.programFilter = true;
        this.formMappings = _.filter(this.formMappings, (formMapping) => formMapping.entityUUID === program.uuid);
        return this;
    }

    forFormType(formType) {
        this.formTypeFilter = true;
        this.formMappings = _.filter(this.formMappings, (formMapping) => formMapping.form.formType === formType);
        return this;
    }

    unVoided() {
        this.formMappings = _.filter(this.formMappings, (formMapping)=> !_.get(formMapping, 'voided'));
        return this;
    }

    bestMatch() {
        return _.last(this._sortedMappings());
    }

    all() {
        return this._sortedMappings();
    }

    _weight(filter, item) {
        return this.programFilter && !_.isNil(item) ? 1 : 0;
    }

    _totalWeight(formMapping) {
        return this._weight(this.encounterTypeFilter, formMapping.observationsTypeEntityUuid)
        + this._weight(this.programFilter, formMapping.entityUUID)
        + this._weight(this.formTypeFilter, _.get(formMapping, 'form.formType'))
    }

    _sortedMappings() {
        return _.sortBy(this.formMappings, (formMapping) => this._totalWeight(formMapping));
    }

}

export default FormQueryResult;