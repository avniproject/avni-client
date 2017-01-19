import G from "../../utility/General";
import IndividualService from "../../service/IndividualService";

export class IndividualProfileActions {
    static individualSelected(state, action, beans) {
        return G.setNewState(state, function (newState) {
            newState.enrolment.programs = beans.get(IndividualService).eligiblePrograms(action.value.uuid);
        });
    }

    static newEnrolment(state) {
        return G.setNewState(state, function (newState) {
            newState.enrolment.enrolling = true;
        });
    }

    static programSelection(state, action) {
        return G.setNewState(state, function (newState) {
            newState.enrolment.selectedProgram = action.value;
        });
    }

    static programConfirmation(state, action) {
        const confirmationState = G.setNewState(state, function (newState) {
            newState.enrolment.enrolling = false;
            newState.confirmedProgram = true;
        });
        action.cb();
        return confirmationState;
    }

    static donotChooseProgram(state) {
        return G.setNewState(state, function (newState) {
            newState.enrolment.enrolling = false;
            newState.enrolment.selectedProgram = undefined;
        });
    }

    static viewGeneralHistory(state, action, context) {
        const nextState = G.setNewState(state, function(newState) {
        });
        action.cb();
        return nextState;
    }

    static getInitialState() {
        return {
            enrolment: {
                enrolling: false,
                selectedProgram: undefined,
                programs: undefined,
            }
        };
    }
}

const actions = {
    INDIVIDUAL_SELECTED: "5ed53620-ca04-451a-a3e5-fe99b83c2cbb",
    NEW_ENROLMENT: "bfff0282-c33f-47c5-9bee-ed129e1097cc",
    PROGRAM_SELECTION: "1c12b17b-b9ba-43a1-b42a-83c863969943",
    CHOOSE_PROGRAM: "c18669dc-5ad2-40e2-a4b9-7734df0c88dc",
    DONOT_CHOOSE_PROGRAM: "3d221cbb-37aa-42e0-b27d-19eb0eb99e91",
    VIEW_GENERAL_HISTORY: "6be9e4a9-ba87-4055-8bfa-cac6d0795c03"
};

export default new Map([
    [actions.INDIVIDUAL_SELECTED, IndividualProfileActions.individualSelected],
    [actions.NEW_ENROLMENT, IndividualProfileActions.newEnrolment],
    [actions.PROGRAM_SELECTION, IndividualProfileActions.programSelection],
    [actions.CHOOSE_PROGRAM, IndividualProfileActions.programConfirmation],
    [actions.DONOT_CHOOSE_PROGRAM, IndividualProfileActions.donotChooseProgram],
    [actions.VIEW_GENERAL_HISTORY, IndividualProfileActions.viewGeneralHistory]
]);

export {actions as Actions};