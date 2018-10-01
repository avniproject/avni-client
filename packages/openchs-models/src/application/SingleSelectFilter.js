import Filter from "./Filter";

export default class SingleSelectFilter extends Filter {
    constructor(label, optsFnMap, options) {
        super(label, Filter.types.SingleSelect, optsFnMap, options);
    }

    selectOption(option) {
        return new SingleSelectFilter(this.label, this.optsFnMap, this.selectedOptions.indexOf(option) > -1 ? [] : [option]);
    }

    isApplied() {
        return this.selectedOptions.length > 0;
    }

    toString() {
        return `${this.label} - ${this.selectedOptions.join(", ")}`;
    }

    clone() {
        return new SingleSelectFilter(this.label, this.optsFnMap, this.selectedOptions);
    }
}