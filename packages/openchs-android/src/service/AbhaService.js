import _ from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {getJSON, post} from "../framework/http/requests";
import AbhaError from "./AbhaError";
import AbhaProfile from "../views/abha/AbhaProfile";
import General from "../utility/General";
import RNFS from "react-native-fs";
import ReactNativeBlobUtil from "react-native-blob-util";
import {downloadWithAuth} from "./AuthAwareDownload";

// Audit records the server does not have yet, kept on the phone so a restart loses none. They carry the ABHA number:
// nothing here logs them, and a data clear for another user drops them (SyncService.clearData).
export const UNSENT_EVENTS_KEY = 'avni.abha.unsentEvents';
// The only answers that mean the server will never take a record. An expired login, a timeout, too many requests,
// a server error or no network can all clear later, so on those the record is kept.
const REFUSED_STATUSES = [400, 403, 409];
// The card files getCardFile writes into the cache folder.
const CARD_FILE_NAME = /^abha-card-.*\.png$/;

// Avni's server holds Eka's secret and answers these online, outside sync. The Eka key in a session is handed to the
// caller and never stored or logged; it lasts about 30 minutes.
@Service("abhaService")
class AbhaService extends BaseService {
    constructor(db, context) {
        super(db, context);
        // Records on their way to the server, by uuid, so a resend does not send one twice at once.
        this.sending = new Set();
        // Every change to the kept records reads and writes the whole list, so changes run one after another.
        this.storage = Promise.resolve();
    }

    // {accessToken, expiresAt, environment: 'sandbox' | 'production', hipId}
    getSession(subjectTypeUUID) {
        return this._get(`/abha/session?subjectTypeUUID=${encodeURIComponent(subjectTypeUUID)}`);
    }

    // The patients in the organisation who hold this ABHA number, or this ABHA address (an ABHA made with a mobile number
    // only has no number). Both travel in the body, the number as digits: request addresses are logged, here and in the
    // server's access log. An answer without the list is a failure: read as "no holder", it would let a second patient
    // take the ABHA.
    findSubjectUUIDs(subjectTypeUUID, abhaNumber, abhaAddress) {
        const digits = AbhaProfile.digitsOnly(abhaNumber);
        const body = _.isNil(abhaAddress) ? {subjectTypeUUID, abhaNumber: digits}
            : {subjectTypeUUID, abhaNumber: _.isEmpty(digits) ? null : digits, abhaAddress};
        return post(`${this.getServerUrl()}/abha/subjects/search`, body)
            .then((response) => response.json())
            .then((body) => {
                const subjectUUIDs = _.get(body, 'subjectUUIDs');
                if (!_.isArray(subjectUUIDs)) throw new Error('ABHA holders search answered without subjectUUIDs');
                return subjectUUIDs;
            })
            .catch(AbhaService._refusalAsAbhaError);
    }

    // Today's Scan & Share check-ins at the user's health centre, in token order.
    getCheckIns() {
        return this._get('/abha/checkIns');
    }

    // The audit record of an ABHA action: kept on the phone, then sent. It resolves true once the server has it, and
    // false otherwise; it never rejects and never holds up the worker. The record stays kept while it is on its way
    // and is forgotten only when the server takes it or refuses it for good, so a record that does not get there
    // goes again with resendUnsentEvents. The server stores each uuid once, so sending one twice is safe.
    recordEvent(event) {
        return this._keep(event).then(() => this._send(event));
    }

    // Keeps the record on the phone without sending it, for an ABHA action whose outcome is not settled yet. Never
    // rejects; a later recordEvent or resendUnsentEvents sends it.
    keepEvent(event) {
        return this._keep(event);
    }

    // Sends every kept record not already on its way: after a registration with ABHA is saved, and with each sync.
    async resendUnsentEvents() {
        const events = await this._kept();
        await Promise.all(_.reject(events, (event) => this.sending.has(event.uuid)).map((event) => this._send(event)));
    }

    static clearUnsentEvents() {
        return AsyncStorage.removeItem(UNSENT_EVENTS_KEY)
            .catch(() => General.logWarn('AbhaService', 'Unsent ABHA audit records could not be cleared'));
    }

    async _send(event) {
        if (this.sending.has(event.uuid)) return false;
        this.sending.add(event.uuid);
        try {
            await post(`${this.getServerUrl()}/abha/events`, event);
            await this._forget(event.uuid);
            return true;
        } catch (error) {
            const status = _.get(error, 'response.status');
            const refused = _.includes(REFUSED_STATUSES, status);
            if (refused) await this._forget(event.uuid);
            General.logWarn('AbhaService', `ABHA event ${event.uuid} not recorded: ${refused ? `refused (Http ${status}), dropped` : 'kept to send again'}`);
            return false;
        } finally {
            this.sending.delete(event.uuid);
        }
    }

    _keep(event) {
        return this._changeKept((events) => [..._.reject(events, ['uuid', event.uuid]), event]);
    }

    _forget(uuid) {
        return this._changeKept((events) => _.reject(events, ['uuid', uuid]));
    }

    // Never rejects. A record that could not be written is still sent; it is only not kept for a resend.
    _changeKept(change) {
        const changed = this.storage.then(async () => {
            const events = await AbhaService._readKept();
            await AsyncStorage.setItem(UNSENT_EVENTS_KEY, JSON.stringify(change(events)));
        });
        this.storage = changed.catch(() => {});
        return changed.catch(() => General.logWarn('AbhaService', 'ABHA audit records could not be kept on the phone'));
    }

    _kept() {
        return this.storage.then(() => AbhaService._readKept()).catch(() => {
            General.logWarn('AbhaService', 'Unsent ABHA audit records could not be read');
            return [];
        });
    }

    // Unreadable contents read as none, so the next write replaces them.
    static async _readKept() {
        const stored = await AsyncStorage.getItem(UNSENT_EVENTS_KEY);
        try {
            const events = JSON.parse(stored || '[]');
            return _.isArray(events) ? events : [];
        } catch (e) {
            return [];
        }
    }

    // The ABHA card image, fetched into the cache folder, and the path of that file. The card is the patient's
    // number, name, photo and QR code: the file is for the card screen, which deletes it when it closes. A failed fetch
    // deletes whatever was written, since a refusal is written to the file too, and throws an AbhaError. abhaLastFour
    // names the ABHA whose card is wanted, so the server never serves a later lookup of another; a header, kept out of
    // request logs.
    async getCardFile(subjectUUID, abhaLastFour) {
        await AbhaService.deleteLeftoverCardFiles();
        const targetPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/abha-card-${General.randomUUID()}.png`;
        try {
            const downloaded = await downloadWithAuth(this.getService("authService"), this.getService("settingsService"),
                `${this.getServerUrl()}/abha/card?subjectUUID=${encodeURIComponent(subjectUUID)}`, targetPath, null,
                /^[0-9]{4}$/.test(abhaLastFour || '') ? {'X-Abha-Last-Four': abhaLastFour} : {});
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

    // Card files a card screen did not get to delete, as when the app was stopped while one was open. Only one card
    // screen is open at a time and it fetches its card after this, so none of these is on show. Never rejects.
    static async deleteLeftoverCardFiles() {
        try {
            const files = await RNFS.readDir(ReactNativeBlobUtil.fs.dirs.CacheDir);
            await Promise.all(_.filter(files, (file) => CARD_FILE_NAME.test(file.name)).map((file) => AbhaService.deleteCardFile(file.path)));
        } catch (e) {
            General.logDebug('AbhaService', 'Leftover ABHA card files not looked for');
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
