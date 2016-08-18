import {createStore, combineReducers} from 'redux';
import initReducers from '../reducer';
import _ from 'lodash';

function AppStoreFactory(beans) {
    return createStore(combineReducers(initReducers(beans)));
}
export default AppStoreFactory;