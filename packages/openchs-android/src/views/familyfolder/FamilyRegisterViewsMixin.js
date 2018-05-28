import TypedTransition from "../../framework/routing/TypedTransition";
import FamilyRegisterFormView from "./FamilyRegisterFormView";
import {Actions} from "../../action/familyFolder/FamilyRegisterActions";
import FamilyRegisterView from "./FamilyRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import {BaseEntity} from "openchs-models";
import FamilyFolderView from "../familyfolder/FamilyFolderView";

class FamilyRegisterViewsMixin {
    static next(view) {
        view.dispatchAction(Actions.NEXT, {
            completed: (state, decisions, ruleValidationErrors) => {
                const onSaveCallback = (source) => {
                    TypedTransition.from(source).wizardCompleted([SystemRecommendationView, FamilyRegisterFormView, FamilyRegisterView], FamilyFolderView, {familyUUID: view.state.family.uuid}, true);
                };
                const headerMessage = `${view.I18n.t('familyRegistration')} - ${view.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(view, decisions, ruleValidationErrors, view.state.family, state.family.observations, Actions.SAVE, onSaveCallback, headerMessage);
            },
            movedNext: (state) => {
                if (state.wizard.isFirstFormPage())
                    TypedTransition.from(view).to(FamilyRegisterFormView);
            },
            validationFailed: (newState) => {
                if (AbstractDataEntryState.hasValidationError(view.state, BaseEntity.fieldKeys.EXTERNAL_RULE)) {
                    view.showError(newState.validationResults[0].message);
                }
            }
        });
    }
}

export default FamilyRegisterViewsMixin;