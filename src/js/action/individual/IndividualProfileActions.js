import IndividualService from "../../service/IndividualService";
import EntityTypeChoiceState from "../common/EntityTypeChoiceState";
import _ from "lodash";
import ProgramEnrolment from "../../models/ProgramEnrolment";

export class IndividualProfileActions {
    static setProgram(entityType) {
        this.entity.program = entityType;
    }

    static cloneEntity(entity) {
        if (!_.isNil(entity))
            return entity.cloneForEdit();
    }

    static getInitialState() {
        return new EntityTypeChoiceState(null, IndividualProfileActions.setProgram, IndividualProfileActions.cloneEntity);
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
}

const actions = {
    INDIVIDUAL_SELECTED: "5ed53620-ca04-451a-a3e5-fe99b83c2cbb",
    LAUNCH_CHOOSE_ENTITY_TYPE: "c18669dc-5ad2-40e2-a4b9-7734df0c88dc",
    ENTITY_TYPE_SELECTED: "1c12b17b-b9ba-43a1-b42a-83c863969943",
    CANCELLED_ENTITY_TYPE_SELECTION: "3d221cbb-37aa-42e0-b27d-19eb0eb99e91",
    ENTITY_TYPE_SELECTION_CONFIRMED: "bfff0282-c33f-47c5-9bee-ed129e1097cc",
    VIEW_GENERAL_HISTORY: "6be9e4a9-ba87-4055-8bfa-cac6d0795c03"
};

export default new Map([
    [actions.INDIVIDUAL_SELECTED, IndividualProfileActions.individualSelected],
    [actions.LAUNCH_CHOOSE_ENTITY_TYPE, IndividualProfileActions.launchChooseProgram],
    [actions.ENTITY_TYPE_SELECTED, IndividualProfileActions.selectedProgram],
    [actions.CANCELLED_ENTITY_TYPE_SELECTION, IndividualProfileActions.cancelledProgramSelection],
    [actions.ENTITY_TYPE_SELECTION_CONFIRMED, IndividualProfileActions.programSelectionConfirmed]
]);

export {actions as Actions};