import questionnaireActions from '../action/questionnaire';
import configActions from '../action/config';
import sessionActions from '../action/session';
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
        },
        {
            stateKey: "sessions",
            actions: sessionActions,
            initState: {}
        }
    ].forEach(({stateKey, actions, initState})=> {
        reducerMap[stateKey] = Reducer.factory(actions, initState, beans);
    });
    return reducerMap;
}