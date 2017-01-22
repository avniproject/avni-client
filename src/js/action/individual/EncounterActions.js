import G from "../../utility/General";

export class EncounterActions {
    static getInitialState() {
        return {
            formElementGroup: null
        };
    }

    static onLoad(state, formElementGroup, context) {
        return G.setNewState(state, function(newState) {
            newState.formElementGroup = formElementGroup;
        });
    }

    static onPrevious(state, action, context) {
        return G.setNewState(state, function(newState) {
            newState.formElementGroup = state.formElementGroup.previous();
        });
    }

    static onNext(state, cb, context) {
        return G.setNewState(state, function(newState) {
            newState.formElementGroup = state.formElementGroup.next();
            cb(newState.formElementGroup);
        });
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