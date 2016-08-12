import {createStore, combineReducers} from 'redux';
import stateReducers from '../reducer';
import _ from 'lodash';

function AppStoreFactory(beans) {
    return createStore(combineReducers(_.mapValues(stateReducers, (reducer) => reducer.factory(beans))));
}
export default AppStoreFactory;