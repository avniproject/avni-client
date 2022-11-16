import Filter from "./Filter";

export default class MultiSelectFilterModel extends Filter {
  constructor(label, optsFnMap, optsQueryMap, options) {
    super(label, Filter.types.MultiSelect, optsFnMap, optsQueryMap, options);
  }

  selectOption(option) {
    if (this.selectedOptions.indexOf(option) > -1) {
      return new MultiSelectFilterModel(
        this.label,
        this.optsFnMap,
        this.optsQueryMap,
        this.selectedOptions.filter((so) => so !== option)
      );
    }
    return new MultiSelectFilterModel(this.label, this.optsFnMap, this.optsQueryMap, [
      ...this.selectedOptions,
      option,
    ]);
  }

  isApplied() {
    return this.selectedOptions.length > 0;
  }

  toString() {
    return `${this.label} - ${this.selectedOptions.join(", ")}`;
  }

  clone() {
    return new MultiSelectFilterModel(
      this.label,
      this.optsFnMap,
      this.optsQueryMap,
      this.selectedOptions
    );
  }
}
