import _ from 'lodash';

class FormMetaDataSelection {
    subjectTypes;
    programs;
    encounterTypes;

    constructor(subjectTypes, programs, encounterTypes) {
        this.subjectTypes = subjectTypes;
        this.programs = programs;
        this.encounterTypes = encounterTypes;
    }

    clone() {
        return new FormMetaDataSelection(this.subjectTypes, this.programs, this.encounterTypes);
    }

    static createNew() {
        return new FormMetaDataSelection([], [], []);
    }

    updateSubjectTypes(selectedSubjectTypes, programsForSubjectTypes, encounterTypesForSubjectTypesAndPrograms) {
        this.subjectTypes = selectedSubjectTypes;
        this.programs = _.intersectionBy(this.programs, programsForSubjectTypes, "uuid");
        this.encounterTypes = _.intersectionBy(this.encounterTypes, encounterTypesForSubjectTypesAndPrograms, "uuid");
    }

    updatePrograms(selectedPrograms, encounterTypesForSubjectTypesAndPrograms) {
        this.programs = selectedPrograms;
        this.encounterTypes = _.intersectionBy(this.encounterTypes, encounterTypesForSubjectTypesAndPrograms, "uuid");
    }

    isEmpty() {
        return _.isEmpty(this.subjectTypes) && _.isEmpty(this.programs) && _.isEmpty(this.encounterTypes);
    }
}

export default FormMetaDataSelection;
