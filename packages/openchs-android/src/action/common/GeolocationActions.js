import Geo from "../../framework/geo";
import bugsnag from "../../utility/bugsnag";

export default class GeolocationActions {
    static setLocationError(state, action) {
        const newState = state.clone();
        const error = action.value;
        console.log(`GLA error ${JSON.stringify(error)}`);
        if(error.code === Geo.ErrorCodes.INTERNAL_ERROR) {
            bugsnag.notify(new Error('Internal error in getting location'));
        } else {
            newState.locationError = error;
        }
        return newState;
    }
}