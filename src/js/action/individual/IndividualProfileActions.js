import IndividualService from "../../service/IndividualService";
import ProgramEnrolment from "../../models/ProgramEnrolment";

export class IndividualProfileActions {
    static enrolFlow = {
        NotStarted: 1,
        LaunchedEnrol: 2,
        ProgramSelected: 3,
        ProgramConfirmed: 4
    };

    static clone(state) {
        const newState = {};
        newState.enrolment = state.enrolment.cloneForEdit();
        newState.enrolFlowState = state.enrolFlowState;
        newState.programs = state.programs;
        return newState;
    }

    static getInitialState() {
        return {
            enrolment: null,
            programs: [],
            enrolFlowState: IndividualProfileActions.enrolFlow.NotStarted
        };
    }

    static individualSelected(state, action, beans) {
        const newState = {};
        newState.enrolFlowState = IndividualProfileActions.enrolFlow.NotStarted;
        newState.enrolment = ProgramEnrolment.createSafeInstance();
        newState.enrolment.individual = action.value;
        newState.programs = beans.get(IndividualService).eligiblePrograms(action.value.uuid);
        return newState;
    }

    static launchChooseProgram(state, action) {
        const newState = IndividualProfileActions.clone(state);
        newState.enrolFlowState = IndividualProfileActions.enrolFlow.LaunchedEnrol;
        return newState;
    }

    static selectedProgram(state, action) {
        const newState = IndividualProfileActions.clone(state);
        newState.enrolment.program = action.value;
        newState.enrolFlowState = IndividualProfileActions.enrolFlow.ProgramSelected;
        return newState;
    }

    static cancelledProgramSelection(state) {
        const newState = IndividualProfileActions.clone(state);
        newState.enrolFlowState = IndividualProfileActions.enrolFlow.NotStarted;
        newState.enrolment.program = null;
        return newState;
    }

    static programSelectionConfirmed(state, action) {
        const newState = IndividualProfileActions.clone(state);
        newState.enrolFlowState = IndividualProfileActions.enrolFlow.ProgramConfirmed;
        action.cb(newState);
        return newState;
    }

    static viewGeneralHistory(state, action, context) {
        action.cb();
        return IndividualProfileActions.clone(state);
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