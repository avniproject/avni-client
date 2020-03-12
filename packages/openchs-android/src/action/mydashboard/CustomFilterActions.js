import _ from "lodash";
import CustomFilterService from "../../service/CustomFilterService";
import moment from "moment";


class CustomFilterActions {

    static getInitialState() {
        return {
            selectedCustomFilters: {}

        }
    }

    static onLoad(state, action, context) {
        const customFilterService = context.get(CustomFilterService);
        const selectedCustomFilters = {};
        const alreadySelected = action.props.selectedCustomFilters;
        _.forEach(customFilterService.getFilterNames(), name => selectedCustomFilters[name] = alreadySelected && alreadySelected[name] || []);
        return {...state, selectedCustomFilters};
    }

    static onCodedCustomFilterClear(state, action, context) {
        const selectedCustomFilters = {...state.selectedCustomFilters, [action['0']]: [{}]};
        return {...state, selectedCustomFilters};
    }

    static onCodedCustomFilterSelect(state, action, context) {
        const {conceptAnswerName, conceptAnswers, titleKey, subjectTypeUUID} = action;
        const selectedConceptAnswer = conceptAnswers.filter(a => a.concept.name === conceptAnswerName).map(c => ({
            uuid: c.concept.uuid,
            name: conceptAnswerName,
            subjectTypeUUID
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

    static onTextCustomFilterSelect(state, action) {
        const {titleKey, subjectTypeUUID, name} = action;
        const newState = _.isEmpty(name) ? {} : {subjectTypeUUID, name};
        const selectedCustomFilters = {...state.selectedCustomFilters, [titleKey]: [newState]};
        return {...state, selectedCustomFilters};
    }

    static onNumericFilterSelect(state, action) {
        const {titleKey, subjectTypeUUID, minValue, maxValue} = action;
        const prevValue = _.head(state.selectedCustomFilters[titleKey]);
        const newState = _.isEmpty(minValue) && _.isEmpty(maxValue) ? {} : {
            subjectTypeUUID,
            minValue: minValue || prevValue && prevValue.minValue,
            maxValue: maxValue || prevValue && prevValue.maxValue,
        };
        const selectedCustomFilters = {...state.selectedCustomFilters, [titleKey]: [newState]};
        return {...state, selectedCustomFilters};
    }

    static onMinDateFilterSelect(state, action) {
        return CustomFilterActions.dateRangeState(action, state, 'minDate', 'minValue');
    }

    static onMaxDateFilterSelect(state, action) {
        return CustomFilterActions.dateRangeState(action, state, 'maxDate', 'maxValue');
    }

    static onMinTimeSelect(state, action) {
        return CustomFilterActions.timeRangeState(action, state, 'minValue');
    }

    static onMaxTimeSelect(state, action) {
        return CustomFilterActions.timeRangeState(action, state, 'maxValue');
    }

    static dateRangeState(action, state, dateKey, dateValueKey) {
        const {titleKey, subjectTypeUUID, value, validationCb} = action;
        const prevValue = _.head(state.selectedCustomFilters[titleKey]);
        const newState = _.isNil(value) ? {} : {
            ...prevValue,
            subjectTypeUUID,
            [dateKey]: value,
            [dateValueKey]: value && moment(value, "YYYY-MM-DDTHH:mm:ss").utc().format(),
            dateType: true
        };
        const validationError = validationCb(newState);
        const stateWithError = {...newState, validationError};
        const selectedCustomFilters = {...state.selectedCustomFilters, [titleKey]: [stateWithError]};
        return {...state, selectedCustomFilters};
    }

    static timeRangeState(action, state, timeValue) {
        const {titleKey, subjectTypeUUID, value} = action;
        const prevValue = _.head(state.selectedCustomFilters[titleKey]);
        const newState = _.isNil(value) ? {} : {
            ...prevValue,
            subjectTypeUUID,
            [timeValue]: value
        };
        const selectedCustomFilters = {...state.selectedCustomFilters, [titleKey]: [newState]};
        return {...state, selectedCustomFilters};
    }
}

const ActionPrefix = 'CustomFilters';
const CustomFilterNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_CODED_CUSTOM_FILTER_SELECT: `${ActionPrefix}.ON_CODED_CUSTOM_FILTER_SELECT`,
    ON_CODED_CUSTOM_FILTER_CLEAR: `${ActionPrefix}.ON_CODED_CUSTOM_FILTER_CLEAR`,
    ON_TEXT_CUSTOM_FILTER_SELECT: `${ActionPrefix}.ON_TEXT_CUSTOM_FILTER_SELECT`,
    ON_NUMERIC_CUSTOM_FILTER_SELECT: `${ActionPrefix}.ON_NUMERIC_CUSTOM_FILTER_SELECT`,
    ON_MIN_DATE_CUSTOM_FILTER_SELECT: `${ActionPrefix}.ON_MIN_DATE_CUSTOM_FILTER_SELECT`,
    ON_MAX_DATE_CUSTOM_FILTER_SELECT: `${ActionPrefix}.ON_MAX_DATE_CUSTOM_FILTER_SELECT`,
    ON_MIN_TIME_CUSTOM_FILTER_SELECT: `${ActionPrefix}.ON_MIN_TIME_CUSTOM_FILTER_SELECT`,
    ON_MAX_TIME_CUSTOM_FILTER_SELECT: `${ActionPrefix}.ON_MAX_TIME_CUSTOM_FILTER_SELECT`,
};

const CustomFilterMap = new Map([
    [CustomFilterNames.ON_LOAD, CustomFilterActions.onLoad],
    [CustomFilterNames.ON_CODED_CUSTOM_FILTER_SELECT, CustomFilterActions.onCodedCustomFilterSelect],
    [CustomFilterNames.ON_CODED_CUSTOM_FILTER_CLEAR, CustomFilterActions.onCodedCustomFilterClear],
    [CustomFilterNames.ON_TEXT_CUSTOM_FILTER_SELECT, CustomFilterActions.onTextCustomFilterSelect],
    [CustomFilterNames.ON_NUMERIC_CUSTOM_FILTER_SELECT, CustomFilterActions.onNumericFilterSelect],
    [CustomFilterNames.ON_MIN_DATE_CUSTOM_FILTER_SELECT, CustomFilterActions.onMinDateFilterSelect],
    [CustomFilterNames.ON_MAX_DATE_CUSTOM_FILTER_SELECT, CustomFilterActions.onMaxDateFilterSelect],
    [CustomFilterNames.ON_MIN_TIME_CUSTOM_FILTER_SELECT, CustomFilterActions.onMinTimeSelect],
    [CustomFilterNames.ON_MAX_TIME_CUSTOM_FILTER_SELECT, CustomFilterActions.onMaxTimeSelect],
]);

export {
    CustomFilterActions, CustomFilterMap, CustomFilterNames, ActionPrefix
}