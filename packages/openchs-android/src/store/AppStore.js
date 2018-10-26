import {createStore, combineReducers, applyMiddleware} from 'redux';
import Reducers from '../reducer';
import General from "../utility/General";
import ErrorHandler from "../utility/ErrorHandler";

class AppStore {
    static create(beans, errorCallback) {
        const combinedReducers = this.createCombinedReducer(beans);
        return createStore(combinedReducers, applyMiddleware(AppStore.middlewareFactory(AppStore.errorHandler, errorCallback)));
    }

    static errorHandler(error, errorCallback, getState, lastAction, dispatch) {
        General.logError('AppStore', 'Posting error');
        ErrorHandler.postError(error, true, errorCallback);
        General.logError('AppStore', 'Posted error');
    }

    static createCombinedReducer(beans) {
        const reducers = Reducers.createReducers(beans);
        return combineReducers(reducers);
    }

    static middlewareFactory(errorHandler, errorCallback) {
        return function (store) {
            return function (next) {
                return function (action) {
                    try {
                        return next(action);
                    } catch (err) {
                        errorHandler(err, errorCallback, store.getState, action, store.dispatch);
                        return err;
                    }
                };
            };
        };
    }
}

export default AppStore;