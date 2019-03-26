import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualRegisterFormView from "./IndividualRegisterFormView";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import IndividualRegisterView from "./IndividualRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import {BaseEntity, ProgramEnrolment} from "openchs-models";
import ProgramEnrolmentDashboardView from "../program/ProgramEnrolmentDashboardView";
import ProgramService from "../../service/program/ProgramService";
import ObservationsHolder from "openchs-models/src/ObservationsHolder";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";

class IndividualRegisterViewsMixin {
    static next(view) {
        if (view.scrollToTop)
            view.scrollToTop();

        view.dispatchAction(Actions.NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits, context) => {
                const onSaveCallback = (source) => {
                    TypedTransition.from(source).wizardCompleted([SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView], ProgramEnrolmentDashboardView, {individualUUID: view.state.individual.uuid}, true);
                };
                const link = IndividualRegisterViewsMixin.getLink(view, view.state.individual, context);
                const headerMessage = `${view.I18n.t('registration', {subjectName:'Individual'})} - ${view.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(view, decisions, ruleValidationErrors, view.state.individual, state.individual.observations, Actions.SAVE, onSaveCallback, headerMessage,null,null,null,link);
            },
            movedNext: (state) => {
                if (state.wizard.isFirstFormPage())
                    TypedTransition.from(view).to(IndividualRegisterFormView);
            },
            validationFailed: (newState) => {
                if (AbstractDataEntryState.hasValidationError(view.state, BaseEntity.fieldKeys.EXTERNAL_RULE)) {
                    view.showError(newState.validationResults[0].message);
                }
            }
        });
    }

    static getLink(source, individual, context) {
        if(_.isEmpty(source.intent)) {
            return;
            // source.intent = source.intent || {};
            // source.intent.program = _.first(context.get(ProgramService).findAll());
        }
        const program = context.get(ProgramService).findByUUID(source.intent.program.uuid);
        const enrolments = context.get(ProgramEnrolmentService).findAllByCriteria(`individual.uuid="${individual.uuid}" AND program.uuid="${source.intent.program.uuid}"`);
        if(!_.isNil(program) && _.isEmpty(enrolments)) {
            return {
                key: 'saveAndEnrol',
                callback: (systemRecommendationView) => {
                    const enrolment = ProgramEnrolment.createEmptyInstance();
                    enrolment.individual = individual.cloneForEdit();
                    enrolment.program = program;
                    ObservationsHolder.convertObsForSave(enrolment.individual.observations);
                    CHSNavigator.navigateToProgramEnrolmentView(source, enrolment);
                }
            };
        }
        return;
    }
}

export default IndividualRegisterViewsMixin;

//1. enrol only when no enrolment exists
//2. provide back function to go back to the Initial page. can be MenuPage/SearchPage
