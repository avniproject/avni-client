import _ from 'lodash';
import {EditFormRuleResponse} from "rules-config";
import {firebaseEvents, logEvent} from "../../utility/Analytics";
import FormMappingService from "../../service/FormMappingService";
import RuleEvaluationService from "../../service/RuleEvaluationService";

class CompletedEncountersActions {
    static getInitialState() {
        return {
            encountersInfo: [],
            encounterTypes: [],
            selectedEncounterTypes: [],
            editFormRuleResponse: EditFormRuleResponse.createEditAllowedResponse()
        };
    }

    static onLoad(state, action, context) {
        const encountersInfo = action.encountersInfo;
        const encounterTypes = _.uniqBy(_.map(encountersInfo, ({encounter}) => encounter.encounterType), 'uuid');
        return {...state, encountersInfo, encounterTypes};
    }

    static onExpandToggle(state, action, context) {
        const nonEqual = _.filter(state.encountersInfo, (e) => !_.isEqualWith(e, action.encounterInfo, (e1, e2) => e1.encounter.uuid === e2.encounter.uuid));
        const encountersInfo = [...nonEqual, action.encounterInfo];
        return {...state, encountersInfo};
    }

    static onFilterApply(state, action) {
        const selectedEncounterTypes = action.selectedEncounterTypes;
        return {...state, selectedEncounterTypes}
    }

    static resetAppliedFilters(state) {
        return {...state, selectedEncounterTypes: []}
    }

    static onEditEncounterViaFormElementGroup(state, action, context) {
        logEvent(firebaseEvents.EDIT_ENCOUNTER);
        const {encounter, formType} = action;
        const form = context.get(FormMappingService).findFormForEncounterType(encounter.encounterType, formType, encounter.individual.subjectType);
        const editFormRuleResponse = context.get(RuleEvaluationService).runEditFormRule(form, encounter, encounter.getName());

        if (editFormRuleResponse.isEditAllowed()) {
            action.onEncounterEditAllowed();
            return state;
        } else {
            const newState = {...state};
            newState.editFormRuleResponse = editFormRuleResponse;
            return newState;
        }
    }

    static onEditEncounterViaFormElementGroupErrorShown(state) {
        return {...state, editFormRuleResponse: EditFormRuleResponse.createEditAllowedResponse()}
    }
}

const ActionPrefix = 'CEA';
const CompletedEncountersActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_EXPAND_TOGGLE: `${ActionPrefix}.ON_EXPAND_TOGGLE`,
    ON_FILTER_APPLY: `${ActionPrefix}.ON_FILTER_APPLY`,
    RESET_FILTERS: `${ActionPrefix}.RESET_FILTERS`,
    ON_EDIT_ENCOUNTER_VIA_FORM_ELEMENT_GROUP: `${ActionPrefix}.ON_EDIT_ENCOUNTER_VIA_FORM_ELEMENT_GROUP`,
    ON_EDIT_ENCOUNTER_VIA_FORM_ELEMENT_GROUP_ERROR_SHOWN: `${ActionPrefix}.ON_EDIT_ENCOUNTER_VIA_FORM_ELEMENT_GROUP_ERROR_SHOWN`,
};

const CompletedEncountersActionMap = new Map([
    [CompletedEncountersActionNames.ON_LOAD, CompletedEncountersActions.onLoad],
    [CompletedEncountersActionNames.ON_EXPAND_TOGGLE, CompletedEncountersActions.onExpandToggle],
    [CompletedEncountersActionNames.ON_FILTER_APPLY, CompletedEncountersActions.onFilterApply],
    [CompletedEncountersActionNames.RESET_FILTERS, CompletedEncountersActions.resetAppliedFilters],
    [CompletedEncountersActionNames.ON_EDIT_ENCOUNTER_VIA_FORM_ELEMENT_GROUP, CompletedEncountersActions.onEditEncounterViaFormElementGroup],
    [CompletedEncountersActionNames.ON_EDIT_ENCOUNTER_VIA_FORM_ELEMENT_GROUP_ERROR_SHOWN, CompletedEncountersActions.onEditEncounterViaFormElementGroupErrorShown],
]);

export {CompletedEncountersActions, CompletedEncountersActionNames, CompletedEncountersActionMap}
