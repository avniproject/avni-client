import G from '../../utility/General';

export class ProgramEnrolmentActions {
    static getInitialState(context) {
        return {};
    }

    first(state, action, context) {
    }
}

const actions = {
    FIRST: "ffe0f0bf-263d-451e-8972-f3b83081f75f"
};

const _ProgramEnrolmentActions = new ProgramEnrolmentActions();

export default new Map([
    [actions.FIRST, _ProgramEnrolmentActions.first],
]);

export {actions as Actions};