import TypedTransition from "../../framework/routing/TypedTransition";
import LandingView from "../LandingView";
import IndividualRegisterFormView from "./IndividualRegisterFormView";
import {Alert} from "react-native";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import IndividualRegisterView from "./IndividualRegisterView";

class IndividualRegisterViewsMixin {
    static next(view) {
        view.dispatchAction(Actions.NEXT, {
            completed: () => {
                TypedTransition.from(view).wizardCompleted([IndividualRegisterFormView, IndividualRegisterView]);
            },
            movedNext: () => {
                TypedTransition.from(view).to(IndividualRegisterFormView);
            },
            validationFailed: (message) => {
            }
        });
    }
}

export default IndividualRegisterViewsMixin;