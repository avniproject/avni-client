import questionnaireActions from "../action/questionnaire";
import IndividualSearchActions from "../action/individual/IndividualSearchActions";
import configActions from "../action/config";
import Reducer from "./Reducer";
import IndividualSearchCriteria from "../service/query/IndividualSearchCriteria";

export default (beans) => {
    let reducerMap = {};

    let add = function (actions, initState) {
        return Reducer.factory(actions, initState, beans);
    };

    reducerMap["questionnaires"] = add(questionnaireActions, []);
    reducerMap["config"] = add(configActions, []);
    reducerMap["individualSearch"] = add(IndividualSearchActions, {searchCriteria: IndividualSearchCriteria.empty(), addressLevels: [], individualSearchResults: []});

    return reducerMap;
}