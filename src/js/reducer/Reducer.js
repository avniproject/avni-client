import _ from 'lodash';
import Reducers from './index';
import General from "../utility/General";

export default class Reducer {
    static factory(actions, initState, beans, prefix) {
        actions.forEach((action, name) => {
            if (_.isNil(action)) {
                throw Error(`Action function is undefined for ${name}`);
            }
        });

        return (state = initState, action) => {
            try {
                const genericActionName = `${prefix}.${action.type}`;
                if (actions.has(genericActionName)) {
                    General.logDebug('Reducer', `Found generic action ${genericActionName}. Invoking.`);
                    return actions.get(genericActionName)(state, action, beans);
                }

                if (!(actions.has(action.type)))
                    return state;

                return actions.get(action.type)(state, action, beans);
            } catch (e) {
                const errorAction = actions.get(`${prefix}.${Reducers.ON_ERROR}`);
                const errorActionDefined = _.isNil(errorAction);
                General.logDebug('Reducer', `Got error: ${e}. Error action: ${errorAction}`);
                if (errorActionDefined) {
                    throw e;
                } else {
                    return errorAction(state, action, beans, e);
                }
            }
        }
    }
}