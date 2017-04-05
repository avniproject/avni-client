import _ from 'lodash';

export default class Reducer {
    static factory(actions, initState, beans) {
        actions.forEach((action, name) => {
            if (_.isNil(action)) {
                throw Error(`Action function is undefined for ${name}`);
            }
        });

        return (state = initState, action) => {
            if (!(actions.has(action.type))) return state;

            try {
                return actions.get(action.type)(state, action, beans);
            } catch (e) {
                return actions.get('ON_ERROR')(state, action, beans, e);
            }
        }
    }
}