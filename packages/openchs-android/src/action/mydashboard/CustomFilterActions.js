import _ from "lodash";
import CustomFilterService from "../../service/CustomFilterService";


class CustomFilterActions {

    static getInitialState() {
        return {
            selectedCustomFilters: {}

        }
    }

    static onLoad(state, action, context) {
        const customFilterService = context.get(CustomFilterService);
        const selectedCustomFilters = {};
        _.forEach(customFilterService.getFilterNames(), name => selectedCustomFilters[name] = []);
        return {...state, selectedCustomFilters};
    }

    static onCustomFilterSelect(state, action, context) {
        const {conceptAnswerName, conceptAnswers, titleKey} = action;
        const selectedConceptAnswer = conceptAnswers.filter(a => a.concept.name === conceptAnswerName).map(c => ({
            uuid: c.concept.uuid,
            name: conceptAnswerName
        }));
        const addAnswer = [...state.selectedCustomFilters[titleKey], ...selectedConceptAnswer];
        const removeAnswer = state.selectedCustomFilters[titleKey].filter(a => a.name !== conceptAnswerName);
        const selectedCustomFilters = _.intersectionBy(state.selectedCustomFilters[titleKey], selectedConceptAnswer, "uuid").length > 0 ?
            {...state.selectedCustomFilters, [titleKey]: removeAnswer} : {
                ...state.selectedCustomFilters,
                [titleKey]: addAnswer
            };
        return {...state, selectedCustomFilters};
    }
}

const ActionPrefix = 'CustomFilters';
const CustomFilterNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_CUSTOM_FILTER_SELECT: `${ActionPrefix}.ON_CUSTOM_FILTER_SELECT`
};

const CustomFilterMap = new Map([
    [CustomFilterNames.ON_LOAD, CustomFilterActions.onLoad],
    [CustomFilterNames.ON_CUSTOM_FILTER_SELECT, CustomFilterActions.onCustomFilterSelect]
]);

export {
    CustomFilterActions, CustomFilterMap, CustomFilterNames, ActionPrefix
}