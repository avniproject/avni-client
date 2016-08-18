import {createStore, combineReducers} from 'redux';
import initReducers from '../reducer';
import _ from 'lodash';

function AppStoreFactory(beans) {
    var reducers = initReducers(beans);
    console.log(reducers);
    return createStore(combineReducers(reducers));
}
export default AppStoreFactory;