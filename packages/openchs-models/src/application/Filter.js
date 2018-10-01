class Filter {
    constructor(label, type, optsFnMap, options = []) {
        this.type = type;
        this.label = label;
        this.optsFnMap = optsFnMap;
        this.selectedOptions = options;
    }

    selectOption(option) {
        return new Filter(this.label, this.type, this.optsFnMap, this.selectedOptions.indexOf(option) > -1 ? [] : [option]);
    }

    isSelected(option) {
        return this.selectedOptions.some((so) => so === option);
    }

    compositeFn(individuals) {
        return this.selectedOptions.map(so => this.optsFnMap.get(so))
            .reduce((acc, fn) => fn(acc), individuals)
    }

    get options() {
        return [...this.optsFnMap.keys()].map((k) => [k, k]);
    }

    isApplied() {
        return this.selectedOptions.length > 0;
    }

    toString() {
        return `${this.label} - ${this.selectedOptions.join(', ')}`;
    }

    static types = {
        SingleSelect: 'SingleSelect',
        MultiSelect: 'MultiSelect',
    };

    clone() {
        return new Filter(this.label, this.type, this.optsFnMap, this.selectedOptions);
    }
}

export default Filter;