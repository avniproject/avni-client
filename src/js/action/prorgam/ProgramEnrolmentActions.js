import ProgramEnrolmentState from "./ProgramEnrolmentState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import FormMappingService from "../../service/FormMappingService";
import Wizard from "../../state/Wizard";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import _ from 'lodash';

export class ProgramEnrolmentActions {
    static getInitialState(context) {
        return new ProgramEnrolmentState([], null, null);
    }

    static onLoad(state, action, context) {
        if (!_.isNil(state.wizard)) return state.clone();

        const form = context.get(FormMappingService).findFormForProgramEnrolment(action.enrolment.program);
        const programEnrolmentState = new ProgramEnrolmentState([], form.firstFormElementGroup, new Wizard(form.numberOfPages, 1));
        programEnrolmentState.enrolment = action.enrolment;
        return programEnrolmentState;
    }

    static enrolmentDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.enrolment.enrolmentDateTime = action.value;
        newState.handleValidationResults(newState.enrolment.validate());
        return newState;
    }

    static onNext(state, action, context) {
        const newState = state.clone();
        return newState.handleNext(action, (enrolment) => context.get(ProgramEnrolmentService).enrol(enrolment));
    }
}

const actions = {
    ON_LOAD: "PEA.ON_LOAD",
    ENROLMENT_DATE_TIME_CHANGED: "PEA.ENROLMENT_DATE_TIME_CHANGED",
    TOGGLE_MULTISELECT_ANSWER: "PEA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "PEA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'PEA.PRIMITIVE_VALUE_CHANGE',
    NEXT: 'PEA.NEXT'
};

export default new Map([
    [actions.ON_LOAD, ProgramEnrolmentActions.onLoad],
    [actions.ENROLMENT_DATE_TIME_CHANGED, ProgramEnrolmentActions.enrolmentDateTimeChanged],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObs],
    [actions.NEXT, ProgramEnrolmentActions.onNext]
]);

export {actions as Actions};