import IndividualService from "../../service/IndividualService";
import EntityTypeChoiceState from "../common/EntityTypeChoiceState";
import _ from "lodash";
import {ProgramEnrolment} from "openchs-models";
import Individual from "../../../../openchs-models/src/Individual";

export class IndividualProfileActions {
    static setProgram(entityType) {
        this.entity.program = entityType;
    }

    static cloneEntity(entity) {
        if (!_.isNil(entity))
            return entity.cloneForEdit();
    }

    static getInitialState() {
        return new EntityTypeChoiceState(Individual.createEmptyInstance(), IndividualProfileActions.setProgram, IndividualProfileActions.cloneEntity);
    }

    static individualSelected(state, action, beans) {
        const individualService = beans.get(IndividualService);
        if (_.isNil(individualService.findByUUID(action.value.uuid))) return state;

        const newState = state.clone();
        const enrolment = ProgramEnrolment.createEmptyInstance();
        enrolment.individual = action.value;
        return newState.entityParentSelected(individualService.eligiblePrograms(action.value.uuid), enrolment);
    }

    static launchChooseProgram(state, action) {
        return state.clone().launchChooseEntityType();
    }

    static selectedProgram(state, action) {
        return state.clone().selectedEntityType(action.value);
    }

    static cancelledProgramSelection(state) {
        return state.clone().cancelledEntityTypeSelection();
    }

    static programSelectionConfirmed(state, action) {
        return state.clone().entityTypeSelectionConfirmed(action);
    }

    static voidIndividual(state, action, beans) {
        console.log("voidIndividual action.value", action.individualUUID);
        const individualService = beans.get(IndividualService);
        individualService.voidIndividual(action.individualUUID);
        return state.clone();
    }
}

const actions = {
    INDIVIDUAL_SELECTED: "IPA.INDIVIDUAL_SELECTED",
    LAUNCH_CHOOSE_ENTITY_TYPE: "IPA.LAUNCH_CHOOSE_ENTITY_TYPE",
    ENTITY_TYPE_SELECTED: "IPA.ENTITY_TYPE_SELECTED",
    CANCELLED_ENTITY_TYPE_SELECTION: "IPA.CANCELLED_ENTITY_TYPE_SELECTION",
    ENTITY_TYPE_SELECTION_CONFIRMED: "IPA.ENTITY_TYPE_SELECTION_CONFIRMED",
    VIEW_GENERAL_HISTORY: "IPA.VIEW_GENERAL_HISTORY",
    VOID_INDIVIDUAL: "IPA.VOID_INDIVIDUAL"
};

export default new Map([
    [actions.INDIVIDUAL_SELECTED, IndividualProfileActions.individualSelected],
    [actions.LAUNCH_CHOOSE_ENTITY_TYPE, IndividualProfileActions.launchChooseProgram],
    [actions.ENTITY_TYPE_SELECTED, IndividualProfileActions.selectedProgram],
    [actions.CANCELLED_ENTITY_TYPE_SELECTION, IndividualProfileActions.cancelledProgramSelection],
    [actions.ENTITY_TYPE_SELECTION_CONFIRMED, IndividualProfileActions.programSelectionConfirmed],
    [actions.VOID_INDIVIDUAL, IndividualProfileActions.voidIndividual]
]);

export {actions as Actions};