import UserInfoService from "../../service/UserInfoService";
import ProgramService from "../../service/program/ProgramService";
import IndividualService from "../../service/IndividualService";
import _ from 'lodash';
import PrivilegeService from "../../service/PrivilegeService";

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
        const privilegeService = context.get(PrivilegeService);
        const displayProgramTab = privilegeService.displayProgramTab(individual.subjectType);
        const hasAnyGeneralEncounters = privilegeService.hasAnyGeneralEncounters(individual.subjectType);
        const displayGeneralTab = displayProgramTab && hasAnyGeneralEncounters;
        const displayGeneralInfoInProfileTab = hasAnyGeneralEncounters && !displayGeneralTab;
        const tabName = SubjectDashboardViewActions.getTabByNumber(tab, displayProgramTab, displayGeneralTab);
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
            displayProgramTab,
            displayGeneralTab,
            displayGeneralInfoInProfileTab
        };
    }

    static getTabByNumber(tab, displayProgramTab, displayGeneralTab) {
        switch (tab) {
            case 1 :
                return {individualProfile: true};
            case 2 :
                return SubjectDashboardViewActions.checkForEmptyProgramOrEncounter({program: true}, displayProgramTab, displayGeneralTab);
            case 3 :
                return SubjectDashboardViewActions.checkForEmptyProgramOrEncounter({history: true}, displayProgramTab, displayGeneralTab);
            default:
                return SubjectDashboardViewActions.checkForEmptyProgramOrEncounter({program: true}, displayProgramTab, displayGeneralTab);
        }
    }

    static checkForEmptyProgramOrEncounter(defaultValue, displayProgramTab, displayGeneralTab) {
        if (!displayProgramTab && !displayGeneralTab) {
            return {individualProfile: true}
        } else if (!displayGeneralTab) {
            return {program: true}
        } else if (!displayProgramTab) {
            return {history: true}
        } else return defaultValue
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
