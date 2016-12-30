class IndividualRegisterActions {
    static _setValue(state, setter) {
        let newState = Object.assign({}, state);
        setter(newState);
        return newState;
    }

    enterIndividualName(state, action) {
        return IndividualRegisterActions._setValue(state, (newState) => {
            newState.individual.name = action.value;
        });
    }

    enterIndividualDOB(state, action) {
        return IndividualRegisterActions._setValue(state, (newState) => {
            newState.individual.setDateOfBirth(action.value);
            newState.age = newState.individual.getAge().durationValueAsString;
            newState.ageProvidedInYears = newState.individual.getAge().isInYears;
        });
    }

    enterIndividualDOBVerified(state, action) {
        return IndividualRegisterActions._setValue(state, (newState) => {
            newState.individual.dateOfBirthVerified = action.value;
        });
    }

    enterIndividualAge(state, action) {
        return IndividualRegisterActions._setValue(state, (newState) => {
            newState.age = action.value;
            newState.individual.setAge(action.value, state.ageProvidedInYears);
        });
    }

    enterIndividualAgeProvidedInYears(state, action) {
        return IndividualRegisterActions._setValue(state, (newState) => {
            newState.ageProvidedInYears = action.value;
            newState.individual.setAge(state.age, action.value);
        });
    }

    enterIndividualGender(state, action) {
        return IndividualRegisterActions._setValue(state, (newState) => {
            newState.individual.gender = action.value;
        });
    }

    enterIndividualAddressLevel(state, action) {
        console.log(action.value);
        return IndividualRegisterActions._setValue(state, (newState) => {
            newState.individual.lowestAddressLevel = action.value;
        });
    }
}

const actions = {
    REGISTRATION_ENTER_NAME: "REGISTRATION_ENTER_NAME",
    REGISTRATION_ENTER_DOB: "REGISTRATION_ENTER_DOB",
    REGISTRATION_ENTER_DOB_VERIFIED: "REGISTRATION_ENTER_DOB_VERIFIED",
    REGISTRATION_ENTER_AGE: "REGISTRATION_ENTER_AGE",
    REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS: "REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS",
    REGISTRATION_ENTER_GENDER: "REGISTRATION_ENTER_GENDER",
    REGISTRATION_ENTER_ADDRESS_LEVEL: "REGISTRATION_ENTER_ADDRESS_LEVEL"
};

const individualRegisterActions = new IndividualRegisterActions();

export default new Map([
    [actions.REGISTRATION_ENTER_NAME, individualRegisterActions.enterIndividualName],
    [actions.REGISTRATION_ENTER_DOB, individualRegisterActions.enterIndividualDOB],
    [actions.REGISTRATION_ENTER_DOB_VERIFIED,individualRegisterActions.enterIndividualDOBVerified],
    [actions.REGISTRATION_ENTER_AGE,individualRegisterActions.enterIndividualAge],
    [actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS,individualRegisterActions.enterIndividualAgeProvidedInYears],
    [actions.REGISTRATION_ENTER_GENDER,individualRegisterActions.enterIndividualGender],
    [actions.REGISTRATION_ENTER_ADDRESS_LEVEL,individualRegisterActions.enterIndividualAddressLevel]
]);

export {actions as Actions};