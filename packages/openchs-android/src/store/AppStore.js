import {createStore, combineReducers, applyMiddleware} from 'redux';
import Reducers from '../reducer';
import General from "../utility/General";
import ErrorHandler from "../utility/ErrorHandler";

class AppStore {
    static create(beans) {
        const combinedReducers = this.createCombinedReducer(beans);
        return __DEV__?
            createStore(combinedReducers):
            createStore(combinedReducers, applyMiddleware(AppStore.middlewareFactory(AppStore.errorHandler)));
    }

    static errorHandler(error, getState, lastAction, dispatch) {
        General.logError('AppStore', 'Posting error');
        ErrorHandler.postError(error, true);
        General.logError('AppStore', 'Posted error');
    }

    static createCombinedReducer(beans) {
        const reducers = Reducers.createReducers(beans);
        return combineReducers(reducers);
    }

    static middlewareFactory(errorHandler) {
        return function (store) {
            return function (next) {
                return function (action) {
                    try {
                        return next(action);
                    } catch (err) {
                        errorHandler(err, store.getState, action, store.dispatch);
                        return err;
                    }
                };
            };
        };
    }
}

export default AppStore;