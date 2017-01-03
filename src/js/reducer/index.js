import questionnaireActions from "../action/questionnaire";
import IndividualSearchActions from "../action/individual/IndividualSearchActions";
import IndividualRegisterActions from "../action/individual/IndividualRegisterActions";
import configActions from "../action/config";
import Reducer from "./Reducer";
import IndividualSearchCriteria from "../service/query/IndividualSearchCriteria";
import EntityService from "../service/EntityService";
import AddressLevel from "../models/AddressLevel";
import Gender from "../models/Gender";
import Individual from "../models/Individual";
import Encounter from "../models/Encounter";
import Form from "../models/application/Form";

export default (beans) => {
    let reducerMap = {};

    let add = function (actions, initState) {
        return Reducer.factory(actions, initState, beans);
    };

    reducerMap.questionnaires = add(questionnaireActions, []);
    reducerMap.config = add(configActions, []);
    reducerMap.individualSearch = add(IndividualSearchActions, {searchCriteria: IndividualSearchCriteria.empty(), individualSearchResults: []});
    reducerMap.addressLevels = add(new Map([]), beans.get(EntityService).getAll(AddressLevel.schema.name));
    reducerMap.individualRegister = add(IndividualRegisterActions, {individual: new Individual(), genders: beans.get(EntityService).getAll(Gender.schema.name), ageProvidedInYears: true});
    reducerMap.individualEncounter = add(new Map([]), {encounter: new Encounter(), form: beans.get(EntityService).getAll(Form.schema.name)});

    return reducerMap;
}