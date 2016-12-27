import questionnaireActions from "../action/questionnaire";
import IndividualSearchActions from "../action/individual/IndividualSearchActions";
import configActions from "../action/config";
import Reducer from "./Reducer";

export default (beans) => {
    const reducerMap = {};

    let add = function (actions, initState) {
        return Reducer.factory(actions, initState, beans);
    };

    reducerMap["questionnaires"] = add(questionnaireActions, []);
    reducerMap["config"] = add(configActions, []);
    reducerMap["individualSearch"] = add(IndividualSearchActions, {searchCriteria: {}, addressLevels: [], individualSearchResults: []});

    return reducerMap;
}