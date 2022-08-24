import IndividualService from "../../service/IndividualService";
import _ from "lodash";
import CommentService from "../../service/comment/CommentService";

export class IndividualProfileActions {

    static getInitialState() {
        return {
            eligiblePrograms: [],
            displayActionSelector: false,
            commentsCount: 0,
            displayProgressIndicator: false
        };
    }

    static clone(state) {
        return {
            eligiblePrograms: state.eligiblePrograms.slice(),
            displayActionSelector: state.displayActionSelector,
            commentsCount: state.commentsCount,
            programActions: state.programActions,
            displayProgressIndicator: state.displayProgressIndicator
        }
    }

    static launchActionSelector(state) {
        const newState = IndividualProfileActions.clone(state);
        newState.displayActionSelector = true;
        return newState;
    }

    static hideActionSelector(state) {
        const newState = IndividualProfileActions.clone(state);
        newState.displayActionSelector = false;
        return newState;
    }

    static individualSelected(state, action, context) {
        const individualService = context.get(IndividualService);
        const individualUUID = action.individual.uuid;
        if (_.isNil(individualService.findByUUID(individualUUID))) return state;
        const newState = IndividualProfileActions.clone(state);
        newState.commentsCount = context.get(CommentService).getThreadWiseFirstCommentForSubject(individualUUID).length;
        newState.eligiblePrograms = _.sortBy(individualService.eligiblePrograms(individualUUID), 'displayName');
        newState.programActions = IndividualProfileActions.getProgramActions(newState, action);
        return newState;
    }

    static getProgramActions(newState, action) {
        return newState.eligiblePrograms.map(program => ({
            fn: () => action.programEnrolmentCallback(program),
            label: program.displayName,
            backgroundColor: program.colour,
        }));
    }

    static refreshMessageCounts(state, action, context) {
        const newState = IndividualProfileActions.clone(state);
        newState.commentsCount = context.get(CommentService).getThreadWiseFirstCommentForSubject(action.individualUUID).length;
        return newState;
    }

    static toggleProgressIndicator(state, action) {
        const newState = IndividualProfileActions.clone(state);
        newState.displayProgressIndicator = action.displayProgressIndicator
        return newState;
    }
}

const actions = {
    INDIVIDUAL_SELECTED: "IPA.INDIVIDUAL_SELECTED",
    LAUNCH_ACTION_SELECTOR: "IPA.LAUNCH_ACTION_SELECTOR",
    HIDE_ACTION_SELECTOR: "IPA.HIDE_ACTION_SELECTOR",
    REFRESH_MESSAGE_COUNTS: "IPA.REFRESH_MESSAGE_COUNTS",
    TOGGLE_PROGRESS_INDICATOR: "IPA.TOGGLE_PROGRESS_INDICATOR"
};

export default new Map([
    [actions.INDIVIDUAL_SELECTED, IndividualProfileActions.individualSelected],
    [actions.LAUNCH_ACTION_SELECTOR, IndividualProfileActions.launchActionSelector],
    [actions.HIDE_ACTION_SELECTOR, IndividualProfileActions.hideActionSelector],
    [actions.REFRESH_MESSAGE_COUNTS, IndividualProfileActions.refreshMessageCounts],
    [actions.TOGGLE_PROGRESS_INDICATOR, IndividualProfileActions.toggleProgressIndicator]
]);

export {actions as Actions};
