import questionnaireActions from "../action/questionnaire";
import IndividualSearchActions from "../action/individual/IndividualSearchActions";
import IndividualRegisterActionMap, {IndividualRegisterActions} from "../action/individual/IndividualRegisterActions";
import IndividualEncounterActionsMap, {IndividualEncounterActions} from "../action/individual/IndividualEncounterActions";
import configActions from "../action/config";
import Reducer from "./Reducer";
import IndividualSearchCriteria from "../service/query/IndividualSearchCriteria";
import EntityService from "../service/EntityService";
import AddressLevel from "../models/AddressLevel";
import IndividualProfileActionMap, {IndividualProfileActions} from "../action/individual/IndividualProfileActions";
import ProgramEnrolmentActionMap, {ProgramEnrolmentActions} from '../action/prorgam/ProgramEnrolmentActions';
import IndividualGeneralHistoryActionsMap, {IndividualGeneralHistoryActions} from '../action/individual/IndividualGeneralHistoryActions';
import EncounterRecommendationActionsMap, {EncounterRecommendationActions} from "../action/individual/EncounterRecommendationActions";
import EncounterActionsMap, {EncounterActions} from "../action/individual/EncounterActions";

const reducerMapFn = function(beanStore) {
    let reducerMap = {};

    let add = function (actions, initState) {
        return Reducer.factory(actions, initState, beanStore);
    };

    reducerMap.questionnaires = add(questionnaireActions, []);
    reducerMap.config = add(configActions, []);
    reducerMap.individualSearch = add(IndividualSearchActions, {searchCriteria: IndividualSearchCriteria.empty(), individualSearchResults: []});
    reducerMap.addressLevels = add(new Map([]), beanStore.get(EntityService).getAll(AddressLevel.schema.name));
    reducerMap.individualRegister = add(IndividualRegisterActionMap, IndividualRegisterActions.getInitialState(beanStore));
    reducerMap[reducerKeys.individualEncounter] = add(IndividualEncounterActionsMap, IndividualEncounterActions.getInitialState(beanStore));
    reducerMap.individualProfile = add(IndividualProfileActionMap, IndividualProfileActions.getInitialState(beanStore));
    reducerMap[reducerKeys.programEnrolment] = add(ProgramEnrolmentActionMap, ProgramEnrolmentActions.getInitialState(beanStore));
    reducerMap[reducerKeys.individualGeneralHistory] = add(IndividualGeneralHistoryActionsMap, IndividualGeneralHistoryActions.getInitialState(beanStore));
    reducerMap[reducerKeys.encounterRecommendation] = add(EncounterRecommendationActionsMap, EncounterRecommendationActions.getInitialState(beanStore));
    reducerMap[reducerKeys.encounter] = add(EncounterActionsMap, EncounterActions.getInitialState(beanStore));

    return reducerMap;
};

const reducerKeys = {
    programEnrolment: "programEnrolment",
    individualGeneralHistory: "individualGeneralHistory",
    encounterRecommendation: "encounterRecommendation",
    encounter: "encounter",
    individualEncounter: "individualEncounter"
};

export {reducerMapFn as initReducers};

export default reducerKeys;