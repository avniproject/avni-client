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
        var criteria = "";
        if(!_.isUndefined(this.name)) {
            criteria = `name CONTAINS[c] "${this.name}"`;
        }
        if (!_.isNil(this.ageInYears)) {
            if(!_.isEmpty(criteria)) {
                criteria = criteria + ' AND '
            }
            criteria = criteria + `(dateOfBirth <= $0 AND dateOfBirth >= $1 )`;
        }
        if (!_.isNil(this.lowestAddressLevel)) {
            if(!_.isEmpty(criteria)) {
                criteria = criteria + ' AND '
            }
            criteria = criteria + `lowestAddressLevel.title == "${this.lowestAddressLevel}"`;
        }
        console.log(criteria);
        return criteria;
    }

    getMaxDateOfBirth() {
        const maxAgeInYears = parseInt(this.ageInYears) + IndividualSearchCriteria.ageBufferForSearchInYears;
        return moment().subtract(maxAgeInYears, 'years').toDate();
    }

    getMinDateOfBirth() {
        const minAgeInYears = this.ageInYears - IndividualSearchCriteria.ageBufferForSearchInYears;
        return moment().subtract(minAgeInYears, 'years').toDate();
    }
}

export default IndividualSearchCriteria;