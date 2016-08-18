import {createStore, combineReducers} from 'redux';
import initReducers from '../reducer';

function AppStoreFactory(beans) {
    return createStore(combineReducers(initReducers(beans)));
}
export default AppStoreFactory;