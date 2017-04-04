import ProgramEnrolmentState from "./ProgramEnrolmentState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import FormMappingService from "../../service/FormMappingService";
import Wizard from "../../state/Wizard";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import _ from 'lodash';
import EntityService from "../../service/EntityService";
import ProgramEnrolment from '../../models/ProgramEnrolment';
import ObservationsHolder from "../../models/ObservationsHolder";

export class ProgramEnrolmentActions {
    static getInitialState(context) {
        return {};
    }

    static onLoad(state, action, context) {
        if (ProgramEnrolmentState.hasEnrolmentOrItsUsageChanged(state, action)) {
            const formMappingService = context.get(FormMappingService);
            const form = action.usage === ProgramEnrolmentState.UsageKeys.Enrol ? formMappingService.findFormForProgramEnrolment(action.enrolment.program) : formMappingService.findFormForProgramExit(action.enrolment.program);
            const isNewEnrolment = _.isNil(action.enrolment.uuid) ? true : _.isNil(context.get(ProgramEnrolmentService).findByUUID(action.enrolment.uuid));
            return new ProgramEnrolmentState([], form.firstFormElementGroup, new Wizard(form.numberOfPages, 1), action.usage, action.enrolment, isNewEnrolment);
        }
        else {
            return state.clone();
        }
    }

    static enrolmentDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.enrolment.enrolmentDateTime = action.value;
        newState.handleValidationResults(newState.enrolment.validateEnrolment());
        return newState;
    }

    static exitDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.enrolment.programExitDateTime = action.value;
        newState.handleValidationResults(newState.enrolment.validateExit());
        return newState;
    }

    static onNext(state, action, context) {
        const programEnrolmentState = state.clone();
        return programEnrolmentState.handleNext(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        const service = context.get(ProgramEnrolmentService);
        newState.usage === ProgramEnrolmentState.UsageKeys.Enrol ? service.enrol(newState.enrolment) : service.exit(newState.enrolment);
        action.cb();
        return newState;
    }
}

const actions = {
    ON_LOAD: "PEA.ON_LOAD",
    ENROLMENT_DATE_TIME_CHANGED: "PEA.ENROLMENT_DATE_TIME_CHANGED",
    EXIT_DATE_TIME_CHANGED: "PEA.EXIT_DATE_TIME_CHANGED",
    TOGGLE_MULTISELECT_ANSWER: "PEA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "PEA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'PEA.PRIMITIVE_VALUE_CHANGE',
    NEXT: 'PEA.NEXT',
    PREVIOUS: 'PEA.PREVIOUS',
    SAVE: 'PEA.SAVE'
};

export default new Map([
    [actions.ON_LOAD, ProgramEnrolmentActions.onLoad],
    [actions.ENROLMENT_DATE_TIME_CHANGED, ProgramEnrolmentActions.enrolmentDateTimeChanged],
    [actions.EXIT_DATE_TIME_CHANGED, ProgramEnrolmentActions.exitDateTimeChanged],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObs],
    [actions.NEXT, ProgramEnrolmentActions.onNext],
    [actions.PREVIOUS, ObservationsHolderActions.onPrevious],
    [actions.SAVE, ProgramEnrolmentActions.onSave]
]);

export {actions as Actions};