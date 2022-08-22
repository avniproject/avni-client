import SubjectProgramEligibilityService from "../../service/program/SubjectProgramEligibilityService";
import FormMappingService from "../../service/FormMappingService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {SubjectProgramEligibility} from 'avni-models';
import _ from 'lodash';
import SubjectProgramEligibilityState from "../../state/SubjectProgramEligibilityState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";

class ManualProgramEligibilityActions {

    static getInitialState() {
        return {}
    }

    static filterFormElements(formElementGroup, context, subjectProgramEligibility) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(subjectProgramEligibility, SubjectProgramEligibility.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    };

    static onLoad(state, action, context) {
        const {subject, program} = action;
        const form = context.get(FormMappingService).getManualEnrolmentEligibilityForm(subject.subjectType, program);
        let subjectProgramEligibility = context.get(SubjectProgramEligibilityService).findBySubjectAndProgram(subject, program);
        const isNewEntity = _.isNil(subjectProgramEligibility);
        if(isNewEntity) {
            subjectProgramEligibility = SubjectProgramEligibility.createEmptyInstance(program, subject);
        }

        const firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(form.nonVoidedFormElementGroups(), [function (o) {
            return o.displayOrder
        }]), (formElementGroup) => ManualProgramEligibilityActions.filterFormElements(formElementGroup, context, subjectProgramEligibility).length !== 0);

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            return SubjectProgramEligibilityState.createOnLoadStateForEmptyForm(subjectProgramEligibility, form)
        }
        const formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(subjectProgramEligibility, SubjectProgramEligibility.schema.name, firstGroupWithAtLeastOneVisibleElement);
        const filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);
        return  SubjectProgramEligibilityState.createOnLoad(subjectProgramEligibility, form, firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses);
    }

    static onNext(state, action, context) {
        return state.clone().handleNext(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        const subjectProgramEligibility = newState.subjectProgramEligibility;
        const ruleEvaluationService = context.get(RuleEvaluationService);
        subjectProgramEligibility.eligible = newState.isEligible(subjectProgramEligibility.subject, subjectProgramEligibility.program, ruleEvaluationService);

        context.get(SubjectProgramEligibilityService).saveOrUpdate(subjectProgramEligibility);
        action.cb();
        return newState;
    }
}

const prefix = 'ManualProgramEligibility';

const ManualProgramEligibilityActionNames = {
    ON_LOAD: `${prefix}_ON_LOAD`,
    ON_NEXT: `${prefix}_ON_NEXT`,
    ON_PREVIOUS: `${prefix}_ON_PREVIOUS`,
    ON_SAVE: `${prefix}_ON_SAVE`,
    TOGGLE_MULTISELECT_ANSWER: `${prefix}_TOGGLE_MULTISELECT_ANSWER`,
    TOGGLE_SINGLESELECT_ANSWER: `${prefix}_TOGGLE_SINGLESELECT_ANSWER`,
    PRIMITIVE_VALUE_CHANGE: `${prefix}_PRIMITIVE_VALUE_CHANGE`,
    PRIMITIVE_VALUE_END_EDITING: `${prefix}_PRIMITIVE_VALUE_END_EDITING`,
    DATE_DURATION_CHANGE: `${prefix}_DATE_DURATION_CHANGE`,
    DURATION_CHANGE: `${prefix}_DURATION_CHANGE`,
    PHONE_NUMBER_CHANGE: `${prefix}_PHONE_NUMBER_CHANGE`,
    GROUP_QUESTION_VALUE_CHANGE: `${prefix}_GROUP_QUESTION_VALUE_CHANGE`,
    REPEATABLE_GROUP_QUESTION_VALUE_CHANGE: `${prefix}_REPEATABLE_GROUP_QUESTION_VALUE_CHANGE`
};
const ManualProgramEligibilityActionMap = new Map([
    [ManualProgramEligibilityActionNames.ON_LOAD, ManualProgramEligibilityActions.onLoad],
    [ManualProgramEligibilityActionNames.ON_NEXT, ManualProgramEligibilityActions.onNext],
    [ManualProgramEligibilityActionNames.ON_PREVIOUS, ManualProgramEligibilityActions.onPrevious],
    [ManualProgramEligibilityActionNames.ON_SAVE, ManualProgramEligibilityActions.onSave],
    [ManualProgramEligibilityActionNames.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [ManualProgramEligibilityActionNames.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [ManualProgramEligibilityActionNames.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [ManualProgramEligibilityActionNames.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [ManualProgramEligibilityActionNames.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [ManualProgramEligibilityActionNames.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [ManualProgramEligibilityActionNames.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [ManualProgramEligibilityActionNames.GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onGroupQuestionChange],
    [ManualProgramEligibilityActionNames.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onRepeatableGroupQuestionChange],
]);

export {
    ManualProgramEligibilityActions,
    ManualProgramEligibilityActionNames,
    ManualProgramEligibilityActionMap
}



