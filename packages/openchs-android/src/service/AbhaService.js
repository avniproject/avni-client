import _ from "lodash";
import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {getJSON, post} from "../framework/http/requests";
import AbhaError from "./AbhaError";
import AbhaProfile from "../views/abha/AbhaProfile";
import General from "../utility/General";
import RNFS from "react-native-fs";
import ReactNativeBlobUtil from "react-native-blob-util";
import {downloadWithAuth} from "./AuthAwareDownload";

// Avni's server holds Eka's secret and answers these online, outside sync. The Eka key in a session is handed to the
// caller and never stored or logged; it lasts about 30 minutes.
@Service("abhaService")
class AbhaService extends BaseService {
    constructor(db, context) {
        super(db, context);
        // Audit records that did not reach the server, by uuid. In memory only: they carry the ABHA number.
        this.unsentEvents = new Map();
    }

    // {accessToken, expiresAt, environment: 'sandbox' | 'production', hipId}
    getSession(subjectTypeUUID) {
        return this._get(`/abha/session?subjectTypeUUID=${encodeURIComponent(subjectTypeUUID)}`);
    }

    // The patients in the organisation who hold this ABHA number. The number travels in the body, as digits:
    // request addresses are logged, here and in the server's access log.
    findSubjectUUIDs(subjectTypeUUID, abhaNumber) {
        return post(`${this.getServerUrl()}/abha/subjects/search`, {subjectTypeUUID, abhaNumber: AbhaProfile.digitsOnly(abhaNumber)})
            .then((response) => response.json())
            .then((body) => _.get(body, 'subjectUUIDs') || [])
            .catch(AbhaService._refusalAsAbhaError);
    }

    // Today's Scan & Share check-ins at the user's health centre, in token order.
    getCheckIns() {
        return this._get('/abha/checkIns');
    }

    // The audit record of an ABHA action. It never rejects and never holds up the worker: a record that does not
    // reach the server is kept and sent again by resendUnsentEvents. The server stores each uuid once, so a resend
    // is safe. A record the server refuses is dropped, since it would be refused again.
    recordEvent(event) {
        this.unsentEvents.delete(event.uuid);
        return post(`${this.getServerUrl()}/abha/events`, event)
            .then(() => true)
            .catch(AbhaService._refusalAsAbhaError)
            .catch((error) => {
                const refused = error instanceof AbhaError && error.status >= 400 && error.status < 500;
                if (!refused) this.unsentEvents.set(event.uuid, event);
                General.logWarn('AbhaService', `ABHA event ${event.uuid} not recorded: ${refused ? `refused (Http ${error.status})` : 'kept to send again'}`);
                return false;
            });
    }

    resendUnsentEvents() {
        return Promise.all([...this.unsentEvents.values()].map((event) => this.recordEvent(event)));
    }

    // The ABHA card image, fetched into the cache folder, and the path of that file. The card is the patient's
    // number, name, photo and QR code: the file is for the card screen, which deletes it when it closes. A failed fetch
    // deletes whatever was written, since a refusal is written to the file too, and throws an AbhaError.
    async getCardFile(subjectUUID) {
        const targetPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/abha-card-${General.randomUUID()}.png`;
        try {
            const downloaded = await downloadWithAuth(this.getService("authService"), this.getService("settingsService"),
                `${this.getServerUrl()}/abha/card?subjectUUID=${encodeURIComponent(subjectUUID)}`, targetPath, null);
            const status = downloaded.info().status;
            if (status === 200) return downloaded.path();
            let code = null;
            try {
                code = _.get(await downloaded.json(), 'code', null);
            } catch (e) { /* not JSON: no reason given */ }
            throw new AbhaError(_.isString(code) ? code : null, status);
        } catch (error) {
            await AbhaService.deleteCardFile(targetPath);
            throw error;
        }
    }

    // Never rejects: a file already gone is what was wanted.
    static async deleteCardFile(path) {
        try {
            await RNFS.unlink(path);
        } catch (e) {
            General.logDebug('AbhaService', 'ABHA card file already gone');
        }
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
