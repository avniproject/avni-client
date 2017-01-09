import questionnaireActions from "../action/questionnaire";
import IndividualSearchActions from "../action/individual/IndividualSearchActions";
import IndividualRegisterActionMap, {IndividualRegisterActions} from "../action/individual/IndividualRegisterActions";
import configActions from "../action/config";
import Reducer from "./Reducer";
import IndividualSearchCriteria from "../service/query/IndividualSearchCriteria";
import EntityService from "../service/EntityService";
import AddressLevel from "../models/AddressLevel";
import Encounter from "../models/Encounter";
import Form from "../models/application/Form";
import IndividualProfileActionMap, {IndividualProfileActions} from "../action/individual/IndividualProfileActions";

export default (beanStore) => {
    let reducerMap = {};

    let add = function (actions, initState) {
        return Reducer.factory(actions, initState, beanStore);
    };

    reducerMap.questionnaires = add(questionnaireActions, []);
    reducerMap.config = add(configActions, []);
    reducerMap.individualSearch = add(IndividualSearchActions, {searchCriteria: IndividualSearchCriteria.empty(), individualSearchResults: []});
    reducerMap.addressLevels = add(new Map([]), beanStore.get(EntityService).getAll(AddressLevel.schema.name));
    reducerMap.individualRegister = add(IndividualRegisterActionMap, IndividualRegisterActions.getInitialState(beanStore));
    reducerMap.individualEncounter = add(new Map([]), {encounter: new Encounter(), form: beanStore.get(EntityService).getAll(Form.schema.name)});
    reducerMap.individualProfile = add(IndividualProfileActionMap, IndividualProfileActions.getInitialState(beanStore));

    return reducerMap;
}