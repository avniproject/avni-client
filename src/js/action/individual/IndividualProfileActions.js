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

    static programConfirmation(state) {
        return G.setNewState(state, function (newState) {
            newState.confirmedProgram = true;
        });
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
};

export default new Map([
    [actions.INDIVIDUAL_SELECTED, IndividualProfileActions.individualSelected],
    [actions.NEW_ENROLMENT, IndividualProfileActions.newEnrolment],
    [actions.PROGRAM_SELECTION, IndividualProfileActions.programSelection],
    [actions.CHOOSE_PROGRAM, IndividualProfileActions.programConfirmation],
]);

export {actions as Actions};