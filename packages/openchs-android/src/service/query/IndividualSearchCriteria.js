import moment from "moment";
import _ from "lodash";
import {BaseEntity} from 'openchs-models';

class IndividualSearchCriteria {
    //to be made configurable perhaps later
    static ageBufferForSearchInYears = 4;
    includeVoided = false;

    static empty() {
        let individualSearchCriteria = new IndividualSearchCriteria();
        individualSearchCriteria.lowestAddressLevels = [];
        return individualSearchCriteria;
    }

    getFilterCriteria() {
        let criteria = [];
        if (!_.isEmpty(this.name)) {
            _.chain(this.name)
                .split(' ')
                .map((token) => token.trim()).filter((token) => !_.isEmpty(token))
                .forEach((token) => {
                    criteria.push(`name CONTAINS[c] "${token}"`)
                }).value();
        }

        if (!_.isEmpty(this.ageInYears)) {
            criteria.push(`(dateOfBirth <= $0 AND dateOfBirth >= $1 )`);
        }

        if(!this.includeVoided) {
            criteria.push("(voided=false)");
        }

        if (!_.isEmpty(this.obsKeyword)) {
            let trimmedKeyword = this.obsKeyword.trim();
            criteria.push(`(observations.valueJSON contains[c] "${trimmedKeyword}" OR enrolments.observations.valueJSON contains[c] "${trimmedKeyword}")`);
        }

        if (this.lowestAddressLevels.length !== 0) {
            let addressLevelCriteria = [];
            this.lowestAddressLevels.forEach((addressLevel) => {
                addressLevelCriteria.push(`lowestAddressLevel.uuid == "${addressLevel.uuid}"`)
            });
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

    addObsCriteria(obsKeyword) {
        this.obsKeyword = obsKeyword;
    }

    addVoidedCriteria(includeVoided) {
        this.includeVoided = includeVoided;
    }

    toggleLowestAddress(lowestAddress) {
        if (BaseEntity.collectionHasEntity(this.lowestAddressLevels, lowestAddress))
            BaseEntity.removeFromCollection(this.lowestAddressLevels, lowestAddress);
        else
            this.lowestAddressLevels.push(lowestAddress);
    }

    toggleLowestAddresses(lowestAddresses) {
        this.lowestAddressLevels = lowestAddresses;
    }

    getMaxDateOfBirth() {
        const maxAgeInYears = parseInt(this.ageInYears) + IndividualSearchCriteria.ageBufferForSearchInYears;
        return moment().subtract(maxAgeInYears, 'years').toDate();
    }

    getMinDateOfBirth() {
        const minAgeInYears = this.ageInYears - IndividualSearchCriteria.ageBufferForSearchInYears;
        return moment().subtract(minAgeInYears, 'years').toDate();
    }

    clone() {
        const individualSearchCriteria = IndividualSearchCriteria.empty();
        individualSearchCriteria.lowestAddressLevels = [...this.lowestAddressLevels];
        individualSearchCriteria.name = this.name;
        individualSearchCriteria.ageInYears = this.ageInYears;
        individualSearchCriteria.obsKeyword = this.obsKeyword;
        individualSearchCriteria.includeVoided = this.includeVoided;
        return individualSearchCriteria;
    }
}

export default IndividualSearchCriteria;