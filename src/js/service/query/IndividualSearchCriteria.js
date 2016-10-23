class IndividualSearchCriteria {
    constructor(name, age, village) {
        this.name = name;
        this.age = age;
        this.village = village;
    }

    getFilterCriteria() {
        return `name CONTAINS[c] "${this.name}" AND age == 23 AND lowestAddressLevel.title == "${this.village}"`;
    }
}

export default IndividualSearchCriteria;