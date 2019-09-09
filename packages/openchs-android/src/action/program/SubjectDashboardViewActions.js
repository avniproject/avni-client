import UserInfoService from "../../service/UserInfoService";
import ProgramService from "../../service/program/ProgramService";
import IndividualService from "../../service/IndividualService";
import _ from 'lodash';

export default class SubjectDashboardViewActions {
    static getInitialState() {
        return {
            individualProfile: false,
            program: false,
            history: false,
            messageDisplayed: true,
        };
    }

    static reset(state) {
        return {
            ...state,
            individualProfile: false,
            program: false,
            history: false,
        }
    }

    static onLoad(state, action, context) {
        const {enrolmentUUID, individualUUID, backFunction, tab, messageDisplayed} = action;
        const newState = SubjectDashboardViewActions.reset(state);
        const hideEnrol = context.get(UserInfoService).getUserSettings().hideEnrol;
        const programsAvailable = context.get(ProgramService).programsAvailable;
        const individual = context.get(IndividualService).findByUUID(individualUUID);
        const tabName = SubjectDashboardViewActions.getTabByNumber(tab);
        return {
            ...newState,
            ...tabName,
            hideEnrol,
            programsAvailable,
            individual,
            enrolmentUUID,
            individualUUID,
            backFunction,
            messageDisplayed: !!_.isNil(messageDisplayed),
        };
    }

    static getTabByNumber(tab) {
        switch (tab) {
            case 1 :
                return {individualProfile: true};
            case 2 :
                return {program: true};
            case 3 :
                return {history: true};
            default:
                return {program: true};
        }
    }

    static onProfileClick(state) {
        const newState = SubjectDashboardViewActions.reset(state);
        return {
            ...newState,
            individualProfile: true,
        }
    }

    static onProgramClick(state) {
        const newState = SubjectDashboardViewActions.reset(state);
        return {
            ...newState,
            program: true,
        }
    }


    static onHistoryClick(state) {
        const newState = SubjectDashboardViewActions.reset(state);
        return {
            ...newState,
            history: true,
        }
    }

    static displayMessage(state) {
        return {
            ...state,
            messageDisplayed: false,
        }
    }

}

const ActionPrefix = 'PET';

export const Names = SubjectDashboardViewActions.Names = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_PROFILE_CLICK: `${ActionPrefix}.ON_PROFILE_CLICK`,
    ON_PROGRAM_CLICK: `${ActionPrefix}.ON_PROGRAM_CLICK`,
    ON_HISTORY_CLICK: `${ActionPrefix}.ON_HISTORY_CLICK`,
    DISPLAY_MESSAGE: `${ActionPrefix}.DISPLAY_MESSAGE`,
};

SubjectDashboardViewActions.Map = new Map([
    [Names.ON_LOAD, SubjectDashboardViewActions.onLoad],
    [Names.ON_PROFILE_CLICK, SubjectDashboardViewActions.onProfileClick],
    [Names.ON_PROGRAM_CLICK, SubjectDashboardViewActions.onProgramClick],
    [Names.ON_HISTORY_CLICK, SubjectDashboardViewActions.onHistoryClick],
    [Names.DISPLAY_MESSAGE, SubjectDashboardViewActions.displayMessage],
]);
