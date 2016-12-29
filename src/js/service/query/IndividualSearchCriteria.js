import moment from "moment";
import _ from "lodash";

class IndividualSearchCriteria {
    //to be made configurable perhaps later
    static ageBufferForSearchInYears = 4;

    static empty(){
        let individualSearchCriteria = new IndividualSearchCriteria();
        individualSearchCriteria.lowestAddressLevels = new Set();
        return individualSearchCriteria;
    }

    static create(name, age, lowestAddressLevels) {
        let individualSearchCriteria = new IndividualSearchCriteria();
        individualSearchCriteria.name = name;
        individualSearchCriteria.ageInYears = age;
        individualSearchCriteria.lowestAddressLevels = new Set(lowestAddressLevels);
        return individualSearchCriteria;
    }

    getFilterCriteria() {
        let criteria = [];
        if (!_.isEmpty(this.name)) {
            criteria.push(`name CONTAINS[c] "${this.name}"`);
        }
        if (!_.isEmpty(this.ageInYears)) {
            criteria.push(`(dateOfBirth <= $0 AND dateOfBirth >= $1 )`);
        }
        if (this.lowestAddressLevels.size != 0) {
            let addressLevelCriteria = [];
            this.lowestAddressLevels.forEach((addressLevel) =>
            {addressLevelCriteria.push(`lowestAddressLevel.title == "${addressLevel}"`)});
            criteria.push("( " + addressLevelCriteria.join(" OR ") + ")");
        }
        return criteria.join(" AND ");
    }

    addAgeCriteria(age) {
        this.ageInYears = age;
    }

    addNameCriteria(name) {
        this.name = name;
    }

    addLowestAddress(lowestAddress) {
        this.lowestAddressLevels.add(lowestAddress);
    }

    removeLowestAddress(lowestAddress) {
        this.lowestAddressLevels.delete(lowestAddress);
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