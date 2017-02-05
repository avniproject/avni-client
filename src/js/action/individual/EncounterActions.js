export class EncounterActions {
    static getInitialState() {
        return {
            formElementGroup: null
        };
    }

    static onLoad(state, formElementGroup, context) {
        state.formElementGroup = formElementGroup;
        return state;
    }

    static onPrevious(state, action, context) {
        state.formElementGroup = state.formElementGroup.previous();
        return state;
    }

    static onNext(state, cb, context) {
        state.formElementGroup = state.formElementGroup.next();
        cb(state.formElementGroup);
        return state;
    }
}

const actions = {
    ON_LOAD: '77eaac22-82ec-499f-9045-9713e7c0baf7',
    PREVIOUS: '4ebe84f9-6230-42af-ba0d-88d78c05005a',
    NEXT: '14bd2402-c588-4f16-9c63-05a85751977e'
};

export default new Map([
    [actions.ON_LOAD, EncounterActions.onLoad],
    [actions.PREVIOUS, EncounterActions.onPrevious],
    [actions.NEXT, EncounterActions.onNext]
]);

export {actions as Actions};