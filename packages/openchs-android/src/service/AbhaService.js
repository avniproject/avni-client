import _ from "lodash";
import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {getJSON} from "../framework/http/requests";
import AbhaError from "./AbhaError";

// Avni's server holds Eka's secret and answers these online, outside sync. The Eka key in a session is handed to the
// caller and never stored or logged; it lasts about 30 minutes.
@Service("abhaService")
class AbhaService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    // {accessToken, expiresAt, environment: 'sandbox' | 'production', hipId}
    getSession(subjectTypeUUID) {
        return this._get(`/abha/session?subjectTypeUUID=${encodeURIComponent(subjectTypeUUID)}`);
    }

    // Today's Scan & Share check-ins at the user's health centre, in token order.
    getCheckIns() {
        return this._get('/abha/checkIns');
    }

    _get(path) {
        return getJSON(`${this.getServerUrl()}${path}`).catch(AbhaService._refusalAsAbhaError);
    }

    // A refusal carries the server's response (ServerError, or AuthenticationError for 403) with the reason in its
    // body. An expired login and a failure to reach the server are passed on unchanged.
    static async _refusalAsAbhaError(error) {
        const response = _.get(error, 'response');
        if (_.isNil(response) || response.status === 401) throw error;
        let code = null;
        try {
            code = _.get(await response.json(), 'code', null);
        } catch (e) { /* not JSON: no reason given */ }
        throw new AbhaError(_.isString(code) ? code : null, response.status);
    }
}

export default AbhaService;
