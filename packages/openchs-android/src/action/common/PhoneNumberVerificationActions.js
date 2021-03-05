export default class PhoneNumberVerificationActions {
    static onSuccessVerification(state, action) {
        const newState = state.clone();
        const observation = action.observation;
        newState.observationsHolder.updatePhoneNumberValue(observation.concept, observation.getValue(), true);
        return newState;
    }

    static onSkipVerification(state, action) {
        const newState = state.clone();
        const {observation, skipVerification} = action;
        if (observation) {
            const phoneNumber = observation.getValueWrapper();
            newState.observationsHolder.updatePhoneNumberValue(observation.concept, phoneNumber.getValue(), phoneNumber.isVerified(), skipVerification);
        }
        return newState;
    }
}
