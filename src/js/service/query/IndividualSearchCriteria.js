import moment from "moment";
import _ from "lodash";

class IndividualSearchCriteria {
    //to be made configurable perhaps later
    static ageBufferForSearchInYears = 4;

    constructor(name, age, lowestAddressLevel) {
        this.name = name;
        this.ageInYears = age;
        this.lowestAddressLevel = lowestAddressLevel;
    }

    getFilterCriteria() {
        var criteria = `name CONTAINS[c] "${this.name}"`;
        if (!_.isNil(this.ageInYears))
            criteria = criteria + ` AND (dateOfBirth >= $0 OR dateOfBirth <= $1 )`;
        if (!_.isNil(this.lowestAddressLevel))
            criteria = criteria + ` AND lowestAddressLevel.title == "${this.lowestAddressLevel}"`;
        return criteria;
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