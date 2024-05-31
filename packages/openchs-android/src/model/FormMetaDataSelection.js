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
}

export default FormMetaDataSelection;
