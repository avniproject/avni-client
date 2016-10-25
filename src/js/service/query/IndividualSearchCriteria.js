import moment from "moment";

class IndividualSearchCriteria {
    //to be made configurable perhaps later
    static ageBufferForSearchInYears = 4;

    constructor(name, age, lowestAddressLevel) {
        this.name = name;
        this.ageInYears = age;
        this.lowestAddressLevel = lowestAddressLevel;
    }

    getFilterCriteria() {
        return `name CONTAINS[c] "${this.name}" AND (dateOfBirth >= $0 OR dateOfBirth <= $1 ) AND lowestAddressLevel.title == "${this.lowestAddressLevel}"`;
    }

    getMaxDateOfBirth() {
        const maxAgeInYears = this.ageInYears + IndividualSearchCriteria.ageBufferForSearchInYears;
        return moment().add(maxAgeInYears, 'years').toDate();
    }

    getMinDateOfBirth() {
        const minAgeInYears = this.ageInYears - IndividualSearchCriteria.ageBufferForSearchInYears;
        return moment().subtract(minAgeInYears, 'years').toDate();
    }
}

export default IndividualSearchCriteria;