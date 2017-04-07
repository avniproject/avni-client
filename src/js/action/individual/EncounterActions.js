import IndividualEncounterService from "../../service/IndividualEncounterService";
import EntityService from "../../service/EntityService";
import Form from "../../models/application/Form";
import EncounterActionState from "../../state/EncounterActionState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import _ from "lodash";
import Encounter from "../../models/Encounter";

export class EncounterActions {
    static getInitialState(context) {
        const form = context.get(EntityService).findByKey('formType', Form.formTypes.Encounter, Form.schema.name);
        return {form: form};
    }

    static onEncounterLandingViewLoad(state, action, context) {
        const isNewEncounter = _.isNil(action.encounterUUID);
        const encounter = isNewEncounter ? context.get(IndividualEncounterService).newEncounter(action.individualUUID) : context.get(EntityService).findByUUID(action.encounterUUID, Encounter.schema.name);
        return EncounterActionState.createOnLoadState(state.form, encounter, isNewEncounter);
    }

    static onNext(state, action, context) {
        const newState = state.clone();
        newState.handleNext(action, context);
        return newState;
    }

    static onEncounterViewLoad(state, action, context) {
        return state.clone();
    }

    static onEncounterDateTimeChange(state, action, context) {
        const newState = state.clone();
        newState.encounter.encounterDateTime = action.value;
        return newState;
    }

    static onToggleShowingPreviousEncounter(state, action, context) {
        const newState = state.clone();
        newState.wizard.toggleShowPreviousEncounter();
        newState.encounters = context.get(IndividualEncounterService).getEncounters(state.encounter.individual);
        return newState;
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(IndividualEncounterService).saveOrUpdate(newState.encounter);
        action.cb();
        return state;
    }
}

const individualEncounterViewActions = {
    ON_ENCOUNTER_LANDING_LOAD: 'EA.ON_ENCOUNTER_LANDING_LOAD',
    ENCOUNTER_DATE_TIME_CHANGE: 'EA.',
    PREVIOUS: 'EA.PREVIOUS',
    NEXT: 'EA.NEXT',
    TOGGLE_MULTISELECT_ANSWER: "EA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "EA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'EA.PRIMITIVE_VALUE_CHANGE',
    ON_LOAD: 'EA.ON_LOAD',
    TOGGLE_SHOWING_PREVIOUS_ENCOUNTER: 'EA.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER',
    SAVE: 'EA.SAVE'
};

const individualEncounterViewActionsMap = new Map([
    [individualEncounterViewActions.PREVIOUS, ObservationsHolderActions.onPrevious],
    [individualEncounterViewActions.NEXT, EncounterActions.onNext],
    [individualEncounterViewActions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [individualEncounterViewActions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [individualEncounterViewActions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObs],
    [individualEncounterViewActions.ON_LOAD, EncounterActions.onEncounterViewLoad],
    [individualEncounterViewActions.ON_ENCOUNTER_LANDING_LOAD, EncounterActions.onEncounterLandingViewLoad],
    [individualEncounterViewActions.ENCOUNTER_DATE_TIME_CHANGE, EncounterActions.onEncounterDateTimeChange],
    [individualEncounterViewActions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER, EncounterActions.onToggleShowingPreviousEncounter],
    [individualEncounterViewActions.SAVE, EncounterActions.onSave]
]);

export {
    individualEncounterViewActions as IndividualEncounterViewActions,
    individualEncounterViewActionsMap as IndividualEncounterViewActionsMap
};