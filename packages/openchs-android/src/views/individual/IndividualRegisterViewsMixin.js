import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualRegisterFormView from "./IndividualRegisterFormView";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import IndividualRegisterView from "./IndividualRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import {BaseEntity} from "openchs-models";
import ProgramEnrolmentDashboardView from "../program/ProgramEnrolmentDashboardView";

class IndividualRegisterViewsMixin {
    static next(view) {
        if (view.scrollToTop)
            view.scrollToTop();

        view.dispatchAction(Actions.NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits, context) => {
                const onSaveCallback = (source) => {
                    TypedTransition.from(source).wizardCompleted([SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView], ProgramEnrolmentDashboardView, {individualUUID: view.state.individual.uuid}, true);
                };
                const headerMessage = `${view.I18n.t('registration', {subjectName:'Individual'})} - ${view.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(view, decisions, ruleValidationErrors, view.state.individual, state.individual.observations, Actions.SAVE, onSaveCallback, headerMessage, null, null, null,
                    view.props.params.stitches);
            },
            movedNext: (state) => {
                if (state.wizard.isFirstFormPage())
                    TypedTransition.from(view).with({stitches: view.props.params.stitches}).to(IndividualRegisterFormView);
            },
            validationFailed: (newState) => {
                if (AbstractDataEntryState.hasValidationError(view.state, BaseEntity.fieldKeys.EXTERNAL_RULE)) {
                    view.showError(newState.validationResults[0].message);
                }
            }
        });
    }
}

export default IndividualRegisterViewsMixin;

//1. enrol only when no enrolment exists
//2. provide back function to go back to the Initial page. can be MenuPage/SearchPage
