import {createStore, combineReducers} from 'redux';
import {initReducers} from '../reducer';

function AppStoreFactory(beans) {
    const reducers = initReducers(beans);
    return createStore(combineReducers(reducers));
}
export default AppStoreFactory;