import questionnaireActions from '../action/questionnaire';
import configActions from '../action/config';
import Reducer from './Reducer';

export default (beans) => {
    var reducerMap = {};
    [
        {
            stateKey: "questionnaires",
            actions: questionnaireActions,
            initState: []
        },
        {
            stateKey: "config",
            actions: configActions,
            initState: []
        }
    ].forEach(({stateKey, actions, initState})=> {
        reducerMap[stateKey] = Reducer.factory(actions, initState, beans);
    });
    return reducerMap;
}