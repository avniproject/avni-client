import Filter from "./Filter";

export default class SingleSelectFilterModel extends Filter {
  constructor(label, optsFnMap, optsQueryMap, options) {
    super(label, Filter.types.SingleSelect, optsFnMap, optsQueryMap, options);
  }

  selectOption(option) {
    return new SingleSelectFilterModel(
      this.label,
      this.optsFnMap,
      this.optsQueryMap,
      this.selectedOptions.indexOf(option) > -1 ? [] : [option]
    );
  }

  isApplied() {
    return this.selectedOptions.length > 0;
  }

  toString() {
    return `${this.label} - ${this.selectedOptions.join(", ")}`;
  }

  clone() {
    return new SingleSelectFilterModel(
      this.label,
      this.optsFnMap,
      this.optsQueryMap,
      this.selectedOptions
    );
  }

  static forSubjectTypes(subjectTypes, selectedSubjectType) {
    const filterModel = new SingleSelectFilterModel(
      "Choose type",
      subjectTypes.reduce(
        (subjectTypesMap, subjectType) => subjectTypesMap.set(subjectType.name, subjectType),
        new Map()
      )
    );

    return filterModel.selectOption(selectedSubjectType.name);
  }
}
