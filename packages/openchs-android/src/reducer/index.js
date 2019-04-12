import IndividualRegisterActionMap, {IndividualRegisterActions} from "../action/individual/IndividualRegisterActions";
import Reducer from "./Reducer";
import IndividualProfileActionMap, {IndividualProfileActions} from "../action/individual/IndividualProfileActions";
import ProgramEnrolmentActionMap, {ProgramEnrolmentActions} from '../action/program/ProgramEnrolmentActions';
import IndividualGeneralHistoryActionsMap, {IndividualGeneralHistoryActions} from '../action/individual/IndividualGeneralHistoryActions';
import {EncounterActions, IndividualEncounterViewActionsMap} from "../action/individual/EncounterActions";
import {ProgramEnrolmentsActions, ProgramEnrolmentsActionsMap} from "../action/program/ProgramEnrolmentsActions";
import {
    ProgramEnrolmentDashboardActions,
    ProgramEnrolmentDashboardActionsMap
} from '../action/program/ProgramEnrolmentDashboardActions';
import {FamilyDashboardActions, FamilyDashboardActionsMap} from '../action/familyFolder/FamilyDashboardActions';
import {MyDashboardActions, MyDashboardActionsMap, MyDashboardPrefix} from '../action/mydashboard/MyDashboardActions';
import {FamilyFolderActions, FamilyFolderActionsMap} from '../action/familyFolder/FamilyFolderActions';
import {ProgramEncounterActions, ProgramEncounterActionsMap} from '../action/program/ProgramEncounterActions';
import {
    IndividualRegistrationDetailsActions,
    IndividualRegistrationDetailsActionsMap
} from '../action/individual/IndividualRegistrationDetailsActions';
import {IndividualSearchActions, IndividualSearchActionsMap} from '../action/individual/IndividualSearchActions';
import {ChecklistActions, ChecklistActionsMap} from '../action/program/ChecklistActions';
import _ from 'lodash';
import {SettingsActions, SettingsActionsMap} from "../action/SettingsActions";
import {StartProgramActions, StartProgramActionsMap} from "../action/program/StartProgramActions";
import {LoginActions, LoginActionsMap} from "../action/LoginActions";
import {
    ProgramEncounterCancelActions,
    ProgramEncounterCancelActionsMap
} from "../action/program/ProgramEncounterCancelActions";
import FamilyRegisterActionMap, {FamilyRegisterActions} from "../action/familyFolder/FamilyRegisterActions";
import IndividualAddRelativeActionsMap, {IndividualAddRelativeActions} from '../action/individual/IndividualAddRelativeActions';
import {ChecklistItemActionMap, ChecklistItemActions} from '../action/program/ChecklistItemActions';
import VideoListActions from '../action/VideoListViewActions';
import EntitySyncStatusActions from "../action/common/EntitySyncStatusActions";
import SubjectRegisterActionsMap, {SubjectRegisterActions} from "../action/subject/SubjectRegisterActions";
import {LandingViewActions, LandingViewActionsMap} from "../action/LandingViewActions";
import {SyncTelemetryActions, SyncTelemetryActionsMap} from "../action/SyncTelemetryActions";

export default class Reducers {
    static reducerKeys = {
        programEnrolment: "programEnrolment",
        individualGeneralHistory: "individualGeneralHistory",
        encounter: "encounter",
        individualRegister: "individualRegister",
        individualProfile: 'individualProfile',
        familyProfile: 'familyProfile',
        programEnrolments: 'programEnrolments',
        programEnrolmentDashboard: 'programEnrolmentDashboard',
        familyDashboard: 'familyDashboard',
        programEncounter: 'programEncounter',
        programEncounterCancel: 'programEncounterCancel',
        individualRegistrationDetails: 'individualRegistrationDetails',
        individualSearch: 'individualSearch',
        addressLevels: 'addressLevels',
        myDashboard: 'myDashboard',
        familyFolder: 'familyFolder',
        checklist: 'checklist',
        settings: 'settings',
        startProgramActions: "startProgramActions",
        loginActions: 'loginActions',
        familyRegister: "familyRegister",
        individualAddRelative: "individualAddRelative",
        checklistItem: "checklistItem",
        videoList: 'videoList',
        entitySyncStatusList: 'entitySyncStatusList',
        subject: 'subject',
        landingView: 'landingView',
        syncTelemetryActions: "syncTelemetryActions"
    };

    static createReducers(beanStore) {
        const reducerMap = {};
        reducerMap[Reducers.reducerKeys.checklist] = Reducers._add(ChecklistActionsMap, ChecklistActions, beanStore);
        reducerMap[Reducers.reducerKeys.individualSearch] = Reducers._add(IndividualSearchActionsMap, IndividualSearchActions, beanStore, 'ISA');
        reducerMap[Reducers.reducerKeys.individualRegister] = Reducers._add(IndividualRegisterActionMap, IndividualRegisterActions, beanStore, 'IRA');
        reducerMap[Reducers.reducerKeys.individualProfile] = Reducers._add(IndividualProfileActionMap, IndividualProfileActions, beanStore);
        reducerMap[Reducers.reducerKeys.familyProfile] = Reducers._add(IndividualProfileActionMap, IndividualProfileActions, beanStore);
        reducerMap[Reducers.reducerKeys.programEnrolment] = Reducers._add(ProgramEnrolmentActionMap, ProgramEnrolmentActions, beanStore);
        reducerMap[Reducers.reducerKeys.individualGeneralHistory] = Reducers._add(IndividualGeneralHistoryActionsMap, IndividualGeneralHistoryActions, beanStore);
        reducerMap[Reducers.reducerKeys.encounter] = Reducers._add(IndividualEncounterViewActionsMap, EncounterActions, beanStore);
        reducerMap[Reducers.reducerKeys.programEnrolments] = Reducers._add(ProgramEnrolmentsActionsMap, ProgramEnrolmentsActions, beanStore);
        reducerMap[Reducers.reducerKeys.programEnrolmentDashboard] = Reducers._add(ProgramEnrolmentDashboardActionsMap, ProgramEnrolmentDashboardActions, beanStore, ProgramEnrolmentDashboardActions.ACTION_PREFIX);
        reducerMap[Reducers.reducerKeys.familyDashboard] = Reducers._add(FamilyDashboardActionsMap, FamilyDashboardActions, beanStore, FamilyDashboardActions.ACTION_PREFIX);
        reducerMap[Reducers.reducerKeys.programEncounter] = Reducers._add(ProgramEncounterActionsMap, ProgramEncounterActions, beanStore);
        reducerMap[Reducers.reducerKeys.individualRegistrationDetails] = Reducers._add(IndividualRegistrationDetailsActionsMap, IndividualRegistrationDetailsActions, beanStore);
        reducerMap[Reducers.reducerKeys.settings] = Reducers._add(SettingsActionsMap, SettingsActions, beanStore);
        reducerMap[Reducers.reducerKeys.startProgramActions] = Reducers._add(StartProgramActionsMap, StartProgramActions, beanStore);
        reducerMap[Reducers.reducerKeys.loginActions] = Reducers._add(LoginActionsMap, LoginActions, beanStore);
        reducerMap[Reducers.reducerKeys.myDashboard] = Reducers._add(MyDashboardActionsMap, MyDashboardActions, beanStore, MyDashboardPrefix);
        reducerMap[Reducers.reducerKeys.familyFolder] = Reducers._add(FamilyFolderActionsMap, FamilyFolderActions, beanStore, FamilyFolderActions);
        reducerMap[Reducers.reducerKeys.programEncounterCancel] = Reducers._add(ProgramEncounterCancelActionsMap, ProgramEncounterCancelActions, beanStore);
        reducerMap[Reducers.reducerKeys.familyRegister] = Reducers._add(FamilyRegisterActionMap, FamilyRegisterActions, beanStore, 'FRA');
        reducerMap[Reducers.reducerKeys.individualAddRelative] = Reducers._add(IndividualAddRelativeActionsMap, IndividualAddRelativeActions, beanStore);
        reducerMap[Reducers.reducerKeys.checklistItem] = Reducers._add(ChecklistItemActionMap, ChecklistItemActions, beanStore);
        reducerMap[Reducers.reducerKeys.videoList] = Reducers._add(VideoListActions.Map, VideoListActions, beanStore);
        reducerMap[Reducers.reducerKeys.entitySyncStatusList] = Reducers._add(EntitySyncStatusActions.Map, EntitySyncStatusActions, beanStore);
        reducerMap[Reducers.reducerKeys.subject] = Reducers._add(SubjectRegisterActionsMap, SubjectRegisterActions, beanStore);
        reducerMap[Reducers.reducerKeys.landingView] = Reducers._add(LandingViewActionsMap, LandingViewActions, beanStore);
        reducerMap[Reducers.reducerKeys.syncTelemetryActions] = Reducers._add(SyncTelemetryActionsMap, SyncTelemetryActions, beanStore);
        return reducerMap;
    };

    static onPossibleExternalStateChange(state, action, context) {
        const newState = Object.assign({}, state);
        newState.possibleExternalStateChange = true;
        return newState;
    }

    static STATE_CHANGE_POSSIBLE_EXTERNALLY = 'STATE_CHANGE_POSSIBLE_EXTERNALLY';
    static ON_ERROR = 'ON_ERROR';

    static _add(actions, actionClass, beanStore, prefix) {
        if (!actions.has('RESET'))
            actions.set('RESET', () => actionClass.getInitialState(beanStore));
        if (!_.isNil(prefix)) {
            actions.set(`${prefix}.${Reducers.STATE_CHANGE_POSSIBLE_EXTERNALLY}`, Reducers.onPossibleExternalStateChange);
        }
        return Reducer.factory(actions, actionClass.getInitialState(beanStore), beanStore, prefix);
    };
}