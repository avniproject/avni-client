import IndividualRegisterActionMap, {IndividualRegisterActions} from "../action/individual/IndividualRegisterActions";
import Reducer from "./Reducer";
import IndividualProfileActionMap, {IndividualProfileActions} from "../action/individual/IndividualProfileActions";
import ProgramEnrolmentActionMap, {ProgramEnrolmentActions} from '../action/prorgam/ProgramEnrolmentActions';
import IndividualGeneralHistoryActionsMap, {IndividualGeneralHistoryActions} from '../action/individual/IndividualGeneralHistoryActions';
import {
    EncounterActions,
    IndividualEncounterViewActionsMap
} from "../action/individual/EncounterActions";
import {
    DashboardActions,
    DashboardActionsMap
} from "../action/prorgam/DashboardActions";
import {
    ProgramEnrolmentsActions,
    ProgramEnrolmentsActionsMap
} from "../action/prorgam/ProgramEnrolmentsActions";
import {ProgramEnrolmentDashboardActions, ProgramEnrolmentDashboardActionsMap} from '../action/prorgam/ProgramEnrolmentDashboardActions';
import {ProgramEncounterActions, ProgramEncounterActionsMap} from '../action/prorgam/ProgramEncounterActions';
import {IndividualRegistrationDetailsActions, IndividualRegistrationDetailsActionsMap} from '../action/individual/IndividualRegistrationDetailsActions';
import {IndividualSearchActions, IndividualSearchActionsMap} from '../action/individual/IndividualSearchActions';
import {AddressLevelActions} from '../action/AddressLevelActions';

const reducerMapFn = function (beanStore) {
    let reducerMap = {};

    let add = function (actions, actionClass) {
        actions.set('RESET', () => actionClass.getInitialState(beanStore));
        return Reducer.factory(actions, actionClass.getInitialState(beanStore), beanStore);
    };

    reducerMap[reducerKeys.individualSearch] = add(IndividualSearchActionsMap, IndividualSearchActions);
    reducerMap[reducerKeys.addressLevels] = add(new Map([]), AddressLevelActions);
    reducerMap[reducerKeys.individualRegister] = add(IndividualRegisterActionMap, IndividualRegisterActions);
    reducerMap[reducerKeys.individualProfile] = add(IndividualProfileActionMap, IndividualProfileActions);
    reducerMap[reducerKeys.programEnrolment] = add(ProgramEnrolmentActionMap, ProgramEnrolmentActions);
    reducerMap[reducerKeys.individualGeneralHistory] = add(IndividualGeneralHistoryActionsMap, IndividualGeneralHistoryActions);
    reducerMap[reducerKeys.encounter] = add(IndividualEncounterViewActionsMap, EncounterActions);
    reducerMap[reducerKeys.dashboard] = add(DashboardActionsMap, DashboardActions);
    reducerMap[reducerKeys.programEnrolments] = add(ProgramEnrolmentsActionsMap, ProgramEnrolmentsActions);
    reducerMap[reducerKeys.programEnrolmentDashboard] = add(ProgramEnrolmentDashboardActionsMap, ProgramEnrolmentDashboardActions);
    reducerMap[reducerKeys.programEncounter] = add(ProgramEncounterActionsMap, ProgramEncounterActions);
    reducerMap[reducerKeys.individualRegistrationDetails] = add(IndividualRegistrationDetailsActionsMap, IndividualRegistrationDetailsActions);

    return reducerMap;
};

const reducerKeys = {
    programEnrolment: "programEnrolment",
    individualGeneralHistory: "individualGeneralHistory",
    encounter: "encounter",
    individualRegister: "individualRegister",
    individualProfile: 'individualProfile',
    dashboard: 'dashboard',
    programEnrolments: 'programEnrolments',
    programEnrolmentDashboard: 'programEnrolmentDashboard',
    programEncounter: 'programEncounter',
    individualRegistrationDetails: 'individualRegistrationDetails',
    individualSearch: 'individualSearch',
    addressLevels: 'addressLevels'
};

export {reducerMapFn as initReducers};

export default reducerKeys;