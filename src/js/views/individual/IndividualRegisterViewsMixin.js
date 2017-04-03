import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualRegisterFormView from "./IndividualRegisterFormView";
import {Alert} from "react-native";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import IndividualRegisterView from "./IndividualRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import IndividualEncounterLandingView from "./IndividualEncounterLandingView";
import AbstractDataEntryState from '../../state/AbstractDataEntryState';
import Individual from '../../models/Individual';

class IndividualRegisterViewsMixin {
    static next(view) {
        this.dispatchAction(Actions.NEXT, {
            completed: (state, decisions) => {
                CHSNavigator.navigateToSystemsRecommendationView(view, decisions, view.state.individual, Actions.SAVE, (source) => {
                    TypedTransition.from(source).wizardCompleted([SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView], IndividualEncounterLandingView, {individualUUID: view.state.individual.uuid});
                });
            },
            movedNext: () => {
                TypedTransition.from(view).to(IndividualRegisterFormView);
            },
            validationFailed: (newState) => {
                if (AbstractDataEntryState.hasValidationError(view.state, Individual.validationKeys.EXTERNAL_RULE)) {
                    view.showError(newState.validationResults[0].message);
                }
            }
        });
    }
}

export default IndividualRegisterViewsMixin;