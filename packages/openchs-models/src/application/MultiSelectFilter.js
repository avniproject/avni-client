import Filter from "./Filter";

export default class MultiSelectFilter extends Filter {
    constructor(label, optsFnMap, options) {
        super(label, Filter.types.MultiSelect, optsFnMap, options);
    }

    selectOption(option) {
        if (this.selectedOptions.indexOf(option) > -1) {
            return new Filter(this.label, this.type, this.optsFnMap, this.selectedOptions.filter(so => so !== option));
        }
        return new Filter(this.label, this.type, this.optsFnMap, [...this.selectedOptions, option]);
    }
}