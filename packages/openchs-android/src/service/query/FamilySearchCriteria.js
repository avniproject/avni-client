import moment from "moment";
import _ from "lodash";
import {BaseEntity} from 'openchs-models';

class FamilySearchCriteria {
    //to be made configurable perhaps later
    static ageBufferForSearchInYears = 4;

    static empty(){
        let familySearchCriteria = new FamilySearchCriteria();
        familySearchCriteria.lowestAddressLevels = [];
        return familySearchCriteria;
    }

    getFilterCriteria() {
        let criteria = [];
        if (!_.isEmpty(this.headOfFamilyName)) {
            _.chain(this.headOfFamilyName)
                .split(' ')
                .map((token) => token.trim()).filter((token) => !_.isEmpty(token))
                .forEach((token) => {criteria.push(`headOfFamily.name CONTAINS[c] "${token}"` )}).value();
        }

        if (!_.isEmpty(this.ageInYears)) {
            criteria.push(`(dateOfBirth <= $0 AND dateOfBirth >= $1 )`);
        }
        if (this.lowestAddressLevels.length !== 0) {
            let addressLevelCriteria = [];
            this.lowestAddressLevels.forEach((addressLevel) =>
            {addressLevelCriteria.push(`lowestAddressLevel.uuid == "${addressLevel.uuid}"`)});
            criteria.push("( " + addressLevelCriteria.join(" OR ") + ")");
        }
        return criteria.join(" AND ");
    }


    addHeadOfFamilyNameCriteria(name) {
        this.headOfFamilyName = name;
    }

    toggleLowestAddress(lowestAddress) {
        if (BaseEntity.collectionHasEntity(this.lowestAddressLevels, lowestAddress))
            BaseEntity.removeFromCollection(this.lowestAddressLevels, lowestAddress);
        else
            this.lowestAddressLevels.push(lowestAddress);
    }


    clone() {
        const familySearchCriteria = FamilySearchCriteria.empty();
        familySearchCriteria.lowestAddressLevels = [...this.lowestAddressLevels];
        familySearchCriteria.headOfFamilyName = this.headOfFamilyName;
        return familySearchCriteria;
    }
}

export default FamilySearchCriteria;