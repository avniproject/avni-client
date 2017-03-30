import {createStore, combineReducers} from 'redux';
import {initReducers} from '../reducer';

class AppStore {
    static create(beans) {
        const combinedReducers = this.createCombinedReducer(beans);
        return createStore(combinedReducers);
    }

    static createCombinedReducer(beans) {
        const reducers = initReducers(beans);
        return combineReducers(reducers);
    }
}

export default AppStore;