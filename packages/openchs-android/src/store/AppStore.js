import {createStore, combineReducers} from 'redux';
import Reducers from '../reducer';

class AppStore {
    static create(beans) {
        const reducers = Reducers.createReducers(beans);
        const combinedReducers = combineReducers(reducers);
        return createStore(combinedReducers);
    }
}

export default AppStore;