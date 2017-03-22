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
        const newState = state.clone();
        const enrolment = ProgramEnrolment.createSafeInstance();
        enrolment.individual = action.value;
        return newState.entityParentSelected(beans.get(IndividualService).eligiblePrograms(action.value.uuid), enrolment);
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

    static viewGeneralHistory(state, action, context) {
        action.cb();
        return state.clone();
    }
}

const actions = {
    INDIVIDUAL_SELECTED: "5ed53620-ca04-451a-a3e5-fe99b83c2cbb",
    LAUNCH_CHOOSE_PROGRAM: "c18669dc-5ad2-40e2-a4b9-7734df0c88dc",
    SELECTED_PROGRAM: "1c12b17b-b9ba-43a1-b42a-83c863969943",
    CANCELLED_PROGRAM_SELECTION: "3d221cbb-37aa-42e0-b27d-19eb0eb99e91",
    PROGRAM_SELECTION_CONFIRMED: "bfff0282-c33f-47c5-9bee-ed129e1097cc",
    VIEW_GENERAL_HISTORY: "6be9e4a9-ba87-4055-8bfa-cac6d0795c03"
};

export default new Map([
    [actions.INDIVIDUAL_SELECTED, IndividualProfileActions.individualSelected],
    [actions.LAUNCH_CHOOSE_PROGRAM, IndividualProfileActions.launchChooseProgram],
    [actions.SELECTED_PROGRAM, IndividualProfileActions.selectedProgram],
    [actions.CANCELLED_PROGRAM_SELECTION, IndividualProfileActions.cancelledProgramSelection],
    [actions.PROGRAM_SELECTION_CONFIRMED, IndividualProfileActions.programSelectionConfirmed],
    [actions.VIEW_GENERAL_HISTORY, IndividualProfileActions.viewGeneralHistory]
]);

export {actions as Actions};