import IndividualRegisterActionMap, {IndividualRegisterActions} from "../action/individual/IndividualRegisterActions";
import Reducer from "./Reducer";
import IndividualProfileActionMap, {IndividualProfileActions} from "../action/individual/IndividualProfileActions";
import ProgramEnrolmentActionMap, {ProgramEnrolmentActions} from '../action/program/ProgramEnrolmentActions';
import BeneficiaryIdentificationActions from '../action/beneficiaryMode/BeneficiaryIdentificationActions';
import BeneficiaryDashboardActions from '../action/beneficiaryMode/BeneficiaryDashboardActions';
import IndividualGeneralHistoryActionsMap, {IndividualGeneralHistoryActions} from '../action/individual/IndividualGeneralHistoryActions';
import {EncounterActions, IndividualEncounterViewActionsMap} from "../action/individual/EncounterActions";
import {ProgramEnrolmentsActions, ProgramEnrolmentsActionsMap} from "../action/program/ProgramEnrolmentsActions";
import {ProgramEnrolmentDashboardActions, ProgramEnrolmentDashboardActionsMap} from '../action/program/ProgramEnrolmentDashboardActions';
import {FamilyDashboardActions, FamilyDashboardActionsMap} from '../action/familyFolder/FamilyDashboardActions';
import {MyDashboardActions, MyDashboardActionsMap, MyDashboardPrefix} from '../action/mydashboard/MyDashboardActions';
import {ActionPrefix, FilterActionMap, FiltersActions} from '../action/mydashboard/FiltersActions'
import {FamilyFolderActions, FamilyFolderActionsMap} from '../action/familyFolder/FamilyFolderActions';
import {ProgramEncounterActions, ProgramEncounterActionsMap} from '../action/program/ProgramEncounterActions';
import {IndividualRegistrationDetailsActions, IndividualRegistrationDetailsActionsMap} from '../action/individual/IndividualRegistrationDetailsActions';
import {IndividualSearchActions, IndividualSearchActionsMap} from '../action/individual/IndividualSearchActions';
import {ChecklistActions, ChecklistActionsMap} from '../action/program/ChecklistActions';
import _ from 'lodash';
import {SettingsActions, SettingsActionsMap} from "../action/SettingsActions";
import {StartProgramActions, StartProgramActionsMap} from "../action/program/StartProgramActions";
import {LoginActions, LoginActionsMap} from "../action/LoginActions";
import {ProgramEncounterCancelActions, ProgramEncounterCancelActionsMap} from "../action/program/ProgramEncounterCancelActions";
import FamilyRegisterActionMap, {FamilyRegisterActions} from "../action/familyFolder/FamilyRegisterActions";
import IndividualAddRelativeActionsMap, {IndividualAddRelativeActions} from '../action/individual/IndividualAddRelativeActions';
import {ChecklistItemActionMap, ChecklistItemActions} from '../action/program/ChecklistItemActions';
import VideoListActions from '../action/VideoListViewActions';
import EntitySyncStatusActions from "../action/common/EntitySyncStatusActions";
import SubjectRegisterActionsMap, {SubjectRegisterActions} from "../action/subject/SubjectRegisterActions";
import {LandingViewActions, LandingViewActionsMap} from "../action/LandingViewActions";
import {SyncTelemetryActions, SyncTelemetryActionsMap} from "../action/SyncTelemetryActions";
import {CompletedVisitsFilterAction, CompletedVisitsFilterActionMap} from '../action/program/CompletedVisitsFilterAction';
import {CompletedEncountersActionMap, CompletedEncountersActions} from "../action/encounter/CompletedEncountersActions";
import SubjectDashboardViewActions from '../action/program/SubjectDashboardViewActions'
import {SyncActionMap, SyncActions} from '../action/SyncActions';
import {CustomFilterActions, CustomFilterMap} from '../action/mydashboard/CustomFilterActions'
import {GenderFilterActions, GenderFilterMap} from '../action/mydashboard/GenderFilterActions'
import {AddMemberActionMap, MemberAction} from "../action/groupSubject/MemberAction";
import {CustomDashboardActionMap, CustomDashboardActions} from "../action/customDashboard/CustomDashboardActions";
import {ApprovalActionMap, ApprovalActions} from "../action/approval/ApprovalActions";
import {NewsActionMap, NewsActions} from "../action/news/NewsActions";
import {CommentActionMap, CommentActions} from "../action/comment/CommentActions";
import {MenuActionMap, MenuActions} from "../action/MenuActions";
import {TaskActionMap, TaskActions} from "../action/task/TaskActions";
import {ManualProgramEligibilityActionMap, ManualProgramEligibilityActions} from "../action/program/ManualProgramEligibilityActions";

export default class Reducers {
    static reducerKeys = {
        beneficiaryIdentification: 'beneficiaryIdentification',
        beneficiaryDashboard: 'beneficiaryDashboard',
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
        syncTelemetryActions: "syncTelemetryActions",
        filterAction: "filterAction",
        completedVisitsFilterAction: "CompletedVisitsFilterAction",
        completedEncounters: "CompletedEncounters",
        subjectDashboardView: "subjectDashboardView",
        syncComponentAction: "syncComponent",
        customFilterActions: "customFilterActions",
        genderFilterActions: "genderFilterActions",
        addNewMember: "addNewMember",
        customDashboard: "customDashboard",
        approval: "approval",
        news: "news",
        comment: "comment",
        menuView: "menuView",
        task: "Task",
        manualProgramEligibility: "manualProgramEligibility",
    };

    static createReducers(beanStore) {
        const reducerMap = {};
        reducerMap[Reducers.reducerKeys.checklist] = Reducers._add(ChecklistActionsMap, ChecklistActions, beanStore);
        reducerMap[Reducers.reducerKeys.individualSearch] = Reducers._add(IndividualSearchActionsMap, IndividualSearchActions, beanStore, 'ISA');
        reducerMap[Reducers.reducerKeys.individualRegister] = Reducers._add(IndividualRegisterActionMap, IndividualRegisterActions, beanStore, 'IRA');
        reducerMap[Reducers.reducerKeys.individualProfile] = Reducers._add(IndividualProfileActionMap, IndividualProfileActions, beanStore);
        reducerMap[Reducers.reducerKeys.familyProfile] = Reducers._add(IndividualProfileActionMap, IndividualProfileActions, beanStore);
        reducerMap[Reducers.reducerKeys.programEnrolment] = Reducers._add(ProgramEnrolmentActionMap, ProgramEnrolmentActions, beanStore);
        reducerMap[Reducers.reducerKeys.beneficiaryIdentification] = Reducers._add(BeneficiaryIdentificationActions.Map, BeneficiaryIdentificationActions, beanStore);
        reducerMap[Reducers.reducerKeys.beneficiaryDashboard] = Reducers._add(BeneficiaryDashboardActions.Map, BeneficiaryDashboardActions, beanStore);
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
        reducerMap[Reducers.reducerKeys.filterAction] = Reducers._add(FilterActionMap, FiltersActions, beanStore, ActionPrefix);
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
        reducerMap[Reducers.reducerKeys.completedVisitsFilterAction] = Reducers._add(CompletedVisitsFilterActionMap, CompletedVisitsFilterAction, beanStore);
        reducerMap[Reducers.reducerKeys.completedEncounters] = Reducers._add(CompletedEncountersActionMap, CompletedEncountersActions, beanStore);
        reducerMap[Reducers.reducerKeys.subjectDashboardView] = Reducers._add(SubjectDashboardViewActions.Map, SubjectDashboardViewActions, beanStore);
        reducerMap[Reducers.reducerKeys.syncComponentAction] = Reducers._add(SyncActionMap, SyncActions, beanStore);
        reducerMap[Reducers.reducerKeys.customFilterActions] = Reducers._add(CustomFilterMap, CustomFilterActions, beanStore);
        reducerMap[Reducers.reducerKeys.genderFilterActions] = Reducers._add(GenderFilterMap, GenderFilterActions, beanStore);
        reducerMap[Reducers.reducerKeys.addNewMember] = Reducers._add(AddMemberActionMap, MemberAction, beanStore);
        reducerMap[Reducers.reducerKeys.customDashboard] = Reducers._add(CustomDashboardActionMap, CustomDashboardActions, beanStore);
        reducerMap[Reducers.reducerKeys.approval] = Reducers._add(ApprovalActionMap, ApprovalActions, beanStore);
        reducerMap[Reducers.reducerKeys.news] = Reducers._add(NewsActionMap, NewsActions, beanStore);
        reducerMap[Reducers.reducerKeys.comment] = Reducers._add(CommentActionMap, CommentActions, beanStore);
        reducerMap[Reducers.reducerKeys.menuView] = Reducers._add(MenuActionMap, MenuActions, beanStore);
        reducerMap[Reducers.reducerKeys.task] = Reducers._add(TaskActionMap, TaskActions, beanStore);
        reducerMap[Reducers.reducerKeys.manualProgramEligibility] = Reducers._add(ManualProgramEligibilityActionMap, ManualProgramEligibilityActions, beanStore);
        return reducerMap;
    };

    static onPossibleExternalStateChange(state, action, context) {
        const newState = _.assignIn({}, state);
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
