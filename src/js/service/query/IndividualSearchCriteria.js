import moment from "moment";
import _ from "lodash";
import BaseEntity from '../../models/BaseEntity';

class IndividualSearchCriteria {
    //to be made configurable perhaps later
    static ageBufferForSearchInYears = 4;

    static empty(){
        let individualSearchCriteria = new IndividualSearchCriteria();
        individualSearchCriteria.lowestAddressLevels = [];
        return individualSearchCriteria;
    }

    static create(name, age, lowestAddressLevels) {
        let individualSearchCriteria = new IndividualSearchCriteria();
        individualSearchCriteria.name = name;
        individualSearchCriteria.ageInYears = age;
        individualSearchCriteria.lowestAddressLevels = lowestAddressLevels;
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
        if (this.lowestAddressLevels.length != 0) {
            let addressLevelCriteria = [];
            this.lowestAddressLevels.forEach((addressLevel) =>
            {addressLevelCriteria.push(`lowestAddressLevel.name == "${addressLevel}"`)});
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

    toggleLowestAddress(lowestAddress) {
        if (BaseEntity.collectionHasEntity(this.lowestAddressLevels, lowestAddress))
            BaseEntity.removeFromCollection(this.lowestAddressLevels, lowestAddress);
        else
            this.lowestAddressLevels.push(lowestAddress);
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