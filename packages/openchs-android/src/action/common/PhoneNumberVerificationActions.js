export default class PhoneNumberVerificationActions {
    static onSuccessVerification(state, action) {
        const newState = state.clone();
        const observation = action.observation;
        newState.observationsHolder.updatePhoneNumberValue(observation.concept, observation.getValue(), true);
        return newState;
    }
}
