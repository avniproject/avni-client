import IndividualService from "../../service/IndividualService";
import ProgramService from "../../service/program/ProgramService";
import SettingsService from "../../service/SettingsService";

export class IndividualGeneralHistoryActions {
    static getInitialState() {
        return {};
    }

    static loadHistory(state, action, context) {
        return {
            individual: context.get(IndividualService).findByUUID(action.individualUUID),
            programsAvailable: context.get(ProgramService).programsAvailable,
            showCount: SettingsService.IncrementalEncounterDisplayCount
        };
    }

    static clone(state) {
        return {
            individual: state.individual,
            programsAvailable: state.programsAvailable,
            showCount: state.showCount
        };
    }

    static onShowMore(state) {
        const newState = IndividualGeneralHistoryActions.clone(state);
        newState.showCount = state.showCount + SettingsService.IncrementalEncounterDisplayCount;
        return newState;
    }
}

const actions = {
    LOAD_HISTORY: "IGHA.LOAD_HISTORY",
    SHOW_MORE: "IGHA.SHOW_MORE"
};

export default new Map([
    [actions.LOAD_HISTORY, IndividualGeneralHistoryActions.loadHistory],
    [actions.SHOW_MORE, IndividualGeneralHistoryActions.onShowMore]
]);

export {actions as Actions};