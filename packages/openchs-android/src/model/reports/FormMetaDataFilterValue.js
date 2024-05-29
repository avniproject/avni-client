class FormMetaDataFilterValue {
    subjectTypes;
    programs;
    encounterTypes;

    clone() {
        const formMetaDataFilterValue = new FormMetaDataFilterValue();
        formMetaDataFilterValue.subjectTypes = this.subjectTypes;
        formMetaDataFilterValue.programs = this.programs;
        formMetaDataFilterValue.encounterTypes = this.encounterTypes;
        return formMetaDataFilterValue;
    }
}

export default FormMetaDataFilterValue;
