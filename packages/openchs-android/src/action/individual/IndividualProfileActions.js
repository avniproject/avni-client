import IndividualService from "../../service/IndividualService";
import _ from "lodash";
import CommentService from "../../service/comment/CommentService";
import General from "../../utility/General";

export class IndividualProfileActions {

    static getInitialState() {
        return {
            eligiblePrograms: [],
            displayActionSelector: false,
            displayLocationOptions: false,
            commentsCount: 0,
            displayProgressIndicator: false,
        };
    }

    static clone(state) {
        return {
            eligiblePrograms: state.eligiblePrograms.slice(),
            displayActionSelector: state.displayActionSelector,
            displayLocationOptions: state.displayLocationOptions,
            commentsCount: state.commentsCount,
            programActions: state.programActions,
            displayProgressIndicator: state.displayProgressIndicator,
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
    
    static showLocationOptions(state) {
        const newState = IndividualProfileActions.clone(state);
        newState.displayLocationOptions = true;
        return newState;
    }
    
    static hideLocationOptions(state) {
        const newState = IndividualProfileActions.clone(state);
        newState.displayLocationOptions = false;
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

    static saveSubjectLocation(state, action, context) {
        try {
            const newState = IndividualProfileActions.clone(state);
            const individual = action.individual.cloneForEdit();
            individual.subjectLocation = action.subjectLocation;
            const individualService = context.get(IndividualService);
            individualService.updateSubjectLocation(individual);
            return newState;
        } catch (error) {
            General.logError('IndividualProfileActions.saveSubjectLocation', error);
            return IndividualProfileActions.clone(state);
        }
    }

}

const actions = {
    INDIVIDUAL_SELECTED: "IPA.INDIVIDUAL_SELECTED",
    LAUNCH_ACTION_SELECTOR: "IPA.LAUNCH_ACTION_SELECTOR",
    HIDE_ACTION_SELECTOR: "IPA.HIDE_ACTION_SELECTOR",
    SHOW_LOCATION_OPTIONS: "IPA.SHOW_LOCATION_OPTIONS",
    HIDE_LOCATION_OPTIONS: "IPA.HIDE_LOCATION_OPTIONS",
    REFRESH_MESSAGE_COUNTS: "IPA.REFRESH_MESSAGE_COUNTS",
    TOGGLE_PROGRESS_INDICATOR: "IPA.TOGGLE_PROGRESS_INDICATOR",
    SAVE_SUBJECT_LOCATION: "IPA.SAVE_SUBJECT_LOCATION"
};

export default new Map([
    [actions.INDIVIDUAL_SELECTED, IndividualProfileActions.individualSelected],
    [actions.LAUNCH_ACTION_SELECTOR, IndividualProfileActions.launchActionSelector],
    [actions.HIDE_ACTION_SELECTOR, IndividualProfileActions.hideActionSelector],
    [actions.SHOW_LOCATION_OPTIONS, IndividualProfileActions.showLocationOptions],
    [actions.HIDE_LOCATION_OPTIONS, IndividualProfileActions.hideLocationOptions],
    [actions.REFRESH_MESSAGE_COUNTS, IndividualProfileActions.refreshMessageCounts],
    [actions.TOGGLE_PROGRESS_INDICATOR, IndividualProfileActions.toggleProgressIndicator],
    [actions.SAVE_SUBJECT_LOCATION, IndividualProfileActions.saveSubjectLocation]
]);

export {actions as Actions};
