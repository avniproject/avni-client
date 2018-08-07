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
            completed: (state, decisions, ruleValidationErrors) => {
                const onSaveCallback = (source) => {
                    TypedTransition.from(source).wizardCompleted([SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView], ProgramEnrolmentDashboardView, {individualUUID: view.state.individual.uuid}, true);
                };
                const headerMessage = `${view.I18n.t('registration')} - ${view.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(view, decisions, ruleValidationErrors, view.state.individual, state.individual.observations, Actions.SAVE, onSaveCallback, headerMessage);
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
}

export default IndividualRegisterViewsMixin;