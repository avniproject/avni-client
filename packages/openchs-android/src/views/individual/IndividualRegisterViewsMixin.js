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

        const {stitches, onSaveCallback} = view.props.params;

        view.dispatchAction(Actions.NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits, context) => {
                const _onSaveCallback = onSaveCallback || ((source) => {
                    // CHSNavigator.navigateToProgramEnrolmentDashboardView(source, view.state.individual.uuid);
                    IndividualRegisterViewsMixin.onSaveGoToProgramEnrolmentDashboardView(source, view.state.individual.uuid);
                });
                const headerMessage = `${view.I18n.t('registration', {subjectName:'Individual'})} - ${view.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(view, decisions, ruleValidationErrors, view.state.individual, state.individual.observations, Actions.SAVE, _onSaveCallback, headerMessage, null, null, null, stitches);
            },
            movedNext: (state) => {
                if (state.wizard.isFirstFormPage())
                    TypedTransition.from(view).with({stitches, onSaveCallback}).to(IndividualRegisterFormView);
            },
            validationFailed: (newState) => {
                if (AbstractDataEntryState.hasValidationError(view.state, BaseEntity.fieldKeys.EXTERNAL_RULE)) {
                    view.showError(newState.validationResults[0].message);
                }
            }
        });
    }

    static onSaveGoToProgramEnrolmentDashboardView(recommendationsView, individualUUID) {
        TypedTransition
            .from(recommendationsView)
            .wizardCompleted([SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView],
                ProgramEnrolmentDashboardView, {individualUUID}, true);
    }
}

export default IndividualRegisterViewsMixin;

//1. enrol only when no enrolment exists
//2. provide back function to go back to the Initial page. can be MenuPage/SearchPage
