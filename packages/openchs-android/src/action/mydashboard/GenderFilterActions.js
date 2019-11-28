import EntityService from "../../service/EntityService";
import {Gender} from "avni-models";
import _ from "lodash";

class GenderFilterActions {
    static getInitialState(context) {
        const genders = context.get(EntityService).getAll(Gender.schema.name);
        const gendersSortedByName = _.sortBy(genders, "name");
        return {
            selectedGenders: [],
            genders: gendersSortedByName
        }
    }

    static onLoad(state, action) {
        const selectedGenders = action.selectedGenders || [];
        return {...state, selectedGenders};
    }

    static onGenderSelect(state, action) {
        const selectedGender = _.filter(state.genders, gender => gender.name === action.gender);
        if (_.findIndex(state.selectedGenders, g => g.name === action.gender) !== -1) {
            const removeSelected = _.filter(state.selectedGenders, g => g.name !== action.gender);
            return {...state, selectedGenders: removeSelected}
        }
        return {...state, selectedGenders: [...state.selectedGenders, ...selectedGender]}
    }

}

const ActionPrefix = 'GenderFilters';

const GenderFilterNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_GENDER_SELECT: `${ActionPrefix}.ON_GENDER_SELECT`
};

const GenderFilterMap = new Map([
    [GenderFilterNames.ON_LOAD, GenderFilterActions.onLoad],
    [GenderFilterNames.ON_GENDER_SELECT, GenderFilterActions.onGenderSelect]
]);

export {GenderFilterActions, GenderFilterNames, GenderFilterMap, ActionPrefix}