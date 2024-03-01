import Geo from "../../framework/geo";
import ErrorUtil from "../../framework/errorHandling/ErrorUtil";

export default class GeolocationActions {
    static setLocationError(state, action) {
        const newState = state.clone();
        const error = action.value;
        if(error.code === Geo.ErrorCodes.INTERNAL_ERROR) {
            ErrorUtil.notifyBugsnag(new Error('Internal error in getting location'), "GeolocationActions");
        } else {
            newState.locationError = error;
        }
        return newState;
    }
}
