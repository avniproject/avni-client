class IndividualSearchCriteria {
    constructor(name, age, lowestAddressLevel) {
        this.name = name;
        this.age = age;
        this.lowestAddressLevel = lowestAddressLevel;
    }

    getFilterCriteria() {
        return `name CONTAINS[c] "${this.name}" AND age == 23 AND lowestAddressLevel.title == "${this.lowestAddressLevel}"`;
    }
}

export default IndividualSearchCriteria;