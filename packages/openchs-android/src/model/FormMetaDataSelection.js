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

    // The selection a Subject Type filter starts on: its preset subject type, and program if it has one.
    static forPreset(presetSubjectType, presetProgram) {
        if (!presetSubjectType) return FormMetaDataSelection.createNew();
        return new FormMetaDataSelection([presetSubjectType], presetProgram ? [presetProgram] : [], []);
    }

    // True only for exactly the selection forPreset gives.
    isPreset(presetSubjectType, presetProgram) {
        if (!presetSubjectType) return false;
        return _.isEqual(this.subjectTypes.map(x => x.uuid), [presetSubjectType.uuid])
            && _.isEqual(this.programs.map(x => x.uuid), presetProgram ? [presetProgram.uuid] : [])
            && _.isEmpty(this.encounterTypes);
    }

    // True when the selection stays within the preset: the preset subject type alone, and the preset program if it has one.
    // Encounter types are not compared, they are the user's to choose.
    agreesWithPreset(presetSubjectType, presetProgram) {
        if (!presetSubjectType) return true;
        return _.isEqual(this.subjectTypes.map(x => x.uuid), [presetSubjectType.uuid])
            && (!presetProgram || _.isEqual(this.programs.map(x => x.uuid), [presetProgram.uuid]));
    }

    sameAs(other) {
        const same = (mine, theirs) => _.isEqual(_.sortBy(mine.map(x => x.uuid)), _.sortBy(theirs.map(x => x.uuid)));
        return same(this.subjectTypes, other.subjectTypes) && same(this.programs, other.programs) && same(this.encounterTypes, other.encounterTypes);
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
