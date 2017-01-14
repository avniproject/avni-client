import G from '../../utility/General';
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import ProgramEnrolment from "../../models/ProgramEnrolment";

export class ProgramEnrolmentActions {
    static getInitialState(context) {
        return {};
    }

    static confirm(state, action, context) {
        return G.setNewState(state, function (newState) {
            context.get(ProgramEnrolmentService).enrol(state.enrolment, action.value);
        });
    }

    static cancel(state, action, context) {
        return state;
    }

    static newEnrolment(state, action, context) {
        return G.setNewState(state, function(newState) {
            newState.enrolment = new ProgramEnrolment();
            newState.enrolment.program = action.value;
        });
    }
}

const actions = {
    CONFIRM: "6dd7b7bd-55ca-4b9b-8406-fe6ae2ea41c1",
    CANCEL: "3f4c5299-95c8-4d36-8f09-43caf686e03a",
    NEW_ENROLMENT_FOR_PROGRAM: "fbb2cd34-184a-4501-a39a-d5bcfb82f75d"
};

const _ProgramEnrolmentActions = new ProgramEnrolmentActions();

export default new Map([
    [actions.CONFIRM, ProgramEnrolmentActions.confirm],
    [actions.CANCEL, ProgramEnrolmentActions.cancel],
    [actions.NEW_ENROLMENT_FOR_PROGRAM, ProgramEnrolmentActions.newEnrolment]
]);

export {actions as Actions};