import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import ProgramEnrolmentState from "./ProgramEnrolmentState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import FormMappingService from "../../service/FormMappingService";
import Wizard from "../../state/Wizard";

export class ProgramEnrolmentActions {
    static getInitialState(context) {
        return {};
    }

    static onLoad(state, action, context) {
        const form = context.get(FormMappingService).findForm(action.enrolment.program);
        const programEnrolmentState = new ProgramEnrolmentState([], form.firstFormElementGroup, new Wizard(form.numberOfPages, 1));
        programEnrolmentState.enrolment = action.enrolment;
        return programEnrolmentState;
    }

    static enrolmentDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.enrolment.enrolmentDateTime = action.value;
        return newState;
    }

    static confirm(state, action, context) {
        const newState = state.clone();
        context.get(ProgramEnrolmentService).launchChooseProgram(state.enrolment, action.value);
        return newState;
    }

    static cancel(state, action, context) {
        return state;
    }
}

const actions = {
    ON_LOAD: "PEA.ON_LOAD",
    ENROLMENT_DATE_TIME_CHANGED: "PEA.ENROLMENT_DATE_TIME_CHANGED",
    TOGGLE_MULTISELECT_ANSWER: "PEA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "PEA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'PEA.PRIMITIVE_VALUE_CHANGE',
    CONFIRM: "PEA.CONFIRM",
    CANCEL: "PEA.CANCEL",
};

const _ProgramEnrolmentActions = new ProgramEnrolmentActions();

export default new Map([
    [actions.ON_LOAD, ProgramEnrolmentActions.onLoad],
    [actions.ENROLMENT_DATE_TIME_CHANGED, ProgramEnrolmentActions.enrolmentDateTimeChanged],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObs],
    [actions.CONFIRM, ProgramEnrolmentActions.confirm],
    [actions.CANCEL, ProgramEnrolmentActions.cancel],
]);

export {actions as Actions};