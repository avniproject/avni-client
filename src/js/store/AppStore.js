import {createStore, combineReducers} from 'redux';
import Reducers from '../reducer';

class AppStore {
    static create(beans) {
        const combinedReducers = this.createCombinedReducer(beans);
        return createStore(combinedReducers);
    }

    static createCombinedReducer(beans) {
        const reducers = Reducers.createReducers(beans);
        return combineReducers(reducers);
    }
}

export default AppStore;