export default class PhoneNumberVerificationActions {
    static onSuccessVerification(state, action) {
        const newState = state.clone();
        if (action.parentFormElement) {
            const observation = newState.observationsHolder.findQuestionGroupObservation(action.formElement.concept, action.parentFormElement, action.questionGroupIndex);
            const value = observation ? observation.getValueWrapper().getValue() : null;
            if (value) {
                action.parentFormElement.repeatable ?
                    newState.observationsHolder.updateRepeatableGroupQuestion(action.questionGroupIndex, action.parentFormElement, action.formElement, value, action.action, true) :
                    newState.observationsHolder.updateGroupQuestion(action.parentFormElement, action.formElement, value, true);
            }
        } else {
            const observation = action.observation;
            newState.observationsHolder.updatePhoneNumberValue(observation.concept, observation.getValue(), true);
        }
        return newState;
    }

    static onSkipVerification(state, action) {
        const newState = state.clone();
        const {observation, skipVerification} = action;
        if (action.parentFormElement) {
            const observation = newState.observationsHolder.findQuestionGroupObservation(action.formElement.concept, action.parentFormElement, action.questionGroupIndex, skipVerification);
            const value = observation ? observation.getValueWrapper().getValue() : null;
            const isVerified = observation ? observation.getValueWrapper().isVerified() : false;
            if (value) {
                action.parentFormElement.repeatable ?
                    newState.observationsHolder.updateRepeatableGroupQuestion(action.questionGroupIndex, action.parentFormElement, action.formElement, value, action.action, isVerified, skipVerification) :
                    newState.observationsHolder.updateGroupQuestion(action.parentFormElement, action.formElement, value, isVerified, skipVerification);
            }
        } else {
            if (observation) {
                const phoneNumber = observation.getValueWrapper();
                newState.observationsHolder.updatePhoneNumberValue(observation.concept, phoneNumber.getValue(), phoneNumber.isVerified(), skipVerification);
            }
        }
        return newState;
    }
}
