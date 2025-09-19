import moment from "moment";
import _ from "lodash";

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

        if (!this.includeVoided) {
            criteria.push("(voided=false)");
        }

        if (!_.isEmpty(this.obsKeyword)) {
            let trimmedKeyword = this.obsKeyword.trim();
            criteria.push(`(observations.valueJSON contains[c] "${trimmedKeyword}" OR enrolments.observations.valueJSON contains[c] "${trimmedKeyword}" OR name contains[c] "${trimmedKeyword}")`);
        }

        if (!_.isEmpty(this.qrValue)) {
            let trimmedQrValue = this.qrValue.trim();
            criteria.push(`(observations.valueJSON contains[c] "${trimmedQrValue}" AND observations.concept.datatype = "QR")`);
        }

        if (!_.isEmpty(this.searchAddressLevels)) {
            let addressLevelCriteria = [];
            this.searchAddressLevels.forEach((addressLevel) => {
                addressLevelCriteria.push(`lowestAddressLevel.uuid == "${addressLevel.uuid}"`)
            });
            criteria.push("( " + addressLevelCriteria.join(" OR ") + ")");
        }

        if (!_.isEmpty(this.subjectType)) {
            criteria.push(`subjectType.uuid = "${this.subjectType.uuid}"`);
        }

        if (!_.isEmpty(this.allowedSubjectUUIDs)) {
            const subjectQuery = _.map(this.allowedSubjectUUIDs, subjectUUID => `uuid = "${subjectUUID}"`).join(" OR ");
            criteria.push("( " + subjectQuery + " )");
        }

        if (!_.isEmpty(this.genders)) {
            const genderQuery = _.map(this.genders, gender => `gender.name = "${gender.name}"`).join(" OR ");
            criteria.push("( " + genderQuery + " )");
        }

        return criteria.join(" AND ");
    }

    getAllAddressLevelUUIDs() {
        return _.map(this.lowestAddressLevels, 'uuid');
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

    addQrCriteria(qrValue) {
        this.qrValue = qrValue;
    }

    addGenderCriteria(genders) {
        this.genders = genders;
    }

    addCustomFilters(filters){
        this.selectedCustomFilters = filters;
    }

    addSubjectTypeCriteria(subjectType) {
        this.subjectType = subjectType;
    }

    addAllowedSubjectUUIDsCriteria(subjectUUIDs) {
        this.allowedSubjectUUIDs = subjectUUIDs;
    }

    toggleLowestAddresses(lowestAddresses) {
        this.lowestAddressLevels = lowestAddresses;
    }

    toggleSearchAddresses(searchAddresses) {
        this.searchAddressLevels = searchAddresses;
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
        individualSearchCriteria.qrValue = this.qrValue;
        individualSearchCriteria.includeVoided = this.includeVoided;
        individualSearchCriteria.subjectType = this.subjectType;
        individualSearchCriteria.allowedSubjectUUIDs = this.allowedSubjectUUIDs;
        individualSearchCriteria.genders = this.genders;
        individualSearchCriteria.selectedCustomFilters = this.selectedCustomFilters;
        return individualSearchCriteria;
    }
}

export default IndividualSearchCriteria;
