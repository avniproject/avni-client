import _ from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {getJSON, post} from "../framework/http/requests";
import AbhaError from "./AbhaError";
import AbhaProfile from "../views/abha/AbhaProfile";
import AbhaBranding from "../views/abha/AbhaBranding";
import General from "../utility/General";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import RNFS from "react-native-fs";
import ReactNativeBlobUtil from "react-native-blob-util";
import {downloadWithAuth} from "./AuthAwareDownload";

// Audit records the server does not have yet, kept on the phone so a restart loses none. They carry the ABHA number:
// nothing here logs them, and a data clear for another user drops them (SyncService.clearData).
export const UNSENT_EVENTS_KEY = 'avni.abha.unsentEvents';
// Their own keychain entry, encrypted by the Android keystore; the database key's entry has no service name.
const KEYCHAIN_ENTRY = {service: UNSENT_EVENTS_KEY};
const KEYCHAIN_USERNAME = 'avni.abha';
// A phone that cannot reach the server for long keeps only the newest, so the keychain entry stays bounded.
export const MAX_UNSENT_EVENTS = 500;
// The only answers that mean the server will never take a record. An expired login, a timeout, too many requests,
// a server error or no network can all clear later, so on those the record is kept.
const REFUSED_STATUSES = [400, 403, 409];
// A full sync drops these quietly too: ABHA is off, so they are no loss to report.
const UNREPORTED_REFUSAL = 'ABHA_DISABLED';
// Enough to send quickly, few enough that a phone with hundreds waiting does not open them all at once.
const SEND_BATCH = 20;
// Bugsnag groups by name: a loss on the phone stays apart from the server's refusals.
const LOST = 'AbhaRecordLost';
const REFUSED = 'AbhaRecordRefused';
const UNREADABLE_KEPT = 'Unsent ABHA audit records unreadable: lost';
// The card files getCardFile writes into the cache folder.
const CARD_FILE_NAME = /^abha-card-.*\.png$/;
// True once a clear has emptied the kept records in this app run, until ABHA is seen on again.
let unsentEventsCleared = false;
// Raised by every clear: a send or a change begun before it was for the previous user, so it stops.
let clearCount = 0;

// Avni's server holds Eka's secret and answers these online, outside sync. The Eka key in a session is handed to the
// caller and never stored or logged; it lasts about 30 minutes.
@Service("abhaService")
class AbhaService extends BaseService {
    constructor(db, context) {
        super(db, context);
        // Records on their way to the server: uuid to the promise of the server's answer, which a second send waits on.
        this.sending = new Map();
        // Every change to the kept records reads and writes the whole list, so changes run one after another.
        this.storage = Promise.resolve();
    }

    // Android can stop the app while a card screen is open, as with its Save-as picker, leaving that screen's file.
    init() {
        AbhaService.deleteLeftoverCardFiles();
    }

    // {accessToken, expiresAt, environment: 'sandbox' | 'production', hipId}
    // Every way into Eka's screens fetches a session first, so the build's branding is read here and is ready when
    // AbhaView builds its page. Reading it never fails the session.
    getSession(subjectTypeUUID) {
        return Promise.all([this._get(`/abha/session?subjectTypeUUID=${encodeURIComponent(subjectTypeUUID)}`), AbhaBranding.load()])
            .then(([session]) => session);
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

    // The audit record of an ABHA action: kept on the phone, then sent. It resolves true once the server has it, and
    // false otherwise; it never rejects and never holds up the worker. The record stays kept while it is on its way
    // and is forgotten only when the server takes it or refuses it for good, so a record that does not get there
    // goes again with resendUnsentEvents. The server stores each uuid once, so sending one twice is safe.
    // A record not kept is reported lost only when the server did not settle it either.
    async recordEvent(event) {
        const clears = clearCount;
        // One already on its way was kept before it went.
        const kept = this.sending.has(event.uuid) || await this._keep(event);
        const {taken, settled} = await this._sendAll([event], clears);
        if (!kept && !settled.has(event.uuid)) AbhaService.report(LOST, 'ABHA audit records not kept on the phone: 1');
        return taken.has(event.uuid);
    }

    // Keeps the record on the phone without sending it, for an ABHA action whose outcome is not settled yet. Never
    // rejects; a later recordEvent or resendUnsentEvents sends it.
    async keepEvent(event) {
        if (!(await this._keep(event))) AbhaService.report(LOST, 'ABHA audit records not kept on the phone: 1');
    }

    // Sends every kept record, waiting for any already on its way: after a registration with ABHA is saved, and with
    // each sync.
    async resendUnsentEvents() {
        const clears = clearCount;
        await this._sendAll(await this._kept(), clears);
    }

    // Never rejects. Clears the AsyncStorage key too, in case a read has not moved its records yet.
    static async clearUnsentEvents() {
        clearCount++;
        const attempt = (clear) => Promise.resolve().then(clear).then(() => true, () => false);
        const cleared = await Promise.all([
            attempt(() => Keychain.resetGenericPassword(KEYCHAIN_ENTRY)),
            attempt(() => AsyncStorage.removeItem(UNSENT_EVENTS_KEY)),
        ]);
        if (_.every(cleared)) unsentEventsCleared = true;
        else General.logWarn('AbhaService', 'Unsent ABHA audit records could not be cleared');
    }

    // For each sync while the organisation has ABHA off: the first clear that succeeds holds for the rest of the app run.
    static async clearUnsentEventsOnce() {
        if (unsentEventsCleared) return;
        await AbhaService.clearUnsentEvents();
    }

    // ABHA is on, so records can be kept again: the next sync with ABHA off clears them.
    static unsentEventsMayBeKept() {
        unsentEventsCleared = false;
    }

    // Sends SEND_BATCH at a time and forgets each batch's taken and refused records in one write, since every write
    // re-encrypts the whole list. A record already on its way is waited for, not sent again. A clear since `clears`
    // stops it before the next batch: the rest were the previous user's, and would go under the next user's login.
    // Never rejects; resolves to the uuids the server took and those it settled (took or refused). Logs and reports give
    // counts only: Bugsnag keeps log lines as breadcrumbs.
    async _sendAll(events, clears) {
        const unique = _.uniqBy(events, 'uuid');
        const others = _.filter(unique, (event) => this.sending.has(event.uuid))
            .map((event) => this.sending.get(event.uuid).then((outcome) => [event.uuid, outcome]));
        const mine = _.reject(unique, (event) => this.sending.has(event.uuid));
        const answerOf = new Map();
        mine.forEach((event) => this.sending.set(event.uuid, new Promise((resolve) => answerOf.set(event.uuid, resolve))));
        const outcomes = new Map();
        try {
            for (const batch of _.chunk(mine, SEND_BATCH)) {
                if (clearCount !== clears) break;
                const answers = await Promise.all(batch.map((event) => this._post(event)));
                batch.forEach((event, i) => outcomes.set(event.uuid, answers[i]));
                const settled = new Set(_.filter(batch, (event) => AbhaService._settled(outcomes.get(event.uuid))).map((event) => event.uuid));
                if (settled.size > 0) await this._changeKept((kept) => _.reject(kept, (event) => settled.has(event.uuid)), clears);
                batch.forEach((event) => answerOf.get(event.uuid)(outcomes.get(event.uuid)));
            }
        } finally {
            mine.forEach((event) => {
                answerOf.get(event.uuid)(outcomes.get(event.uuid) || {});
                this.sending.delete(event.uuid);
            });
        }
        AbhaService._sayNotRecorded([...outcomes.values()]);
        (await Promise.all(others)).forEach(([uuid, outcome]) => outcomes.set(uuid, outcome));
        const uuidsWhere = (test) => new Set([...outcomes].filter(([, outcome]) => test(outcome)).map(([uuid]) => uuid));
        return {taken: uuidsWhere((outcome) => outcome.taken), settled: uuidsWhere(AbhaService._settled)};
    }

    static _settled(outcome) {
        return !!(outcome.taken || outcome.refused);
    }

    // {taken}, {refused, status, code} for an answer that means never, or {} when the record can go again. Never rejects.
    async _post(event) {
        try {
            await post(`${this.getServerUrl()}/abha/events`, event);
            return {taken: true};
        } catch (error) {
            const status = _.get(error, 'response.status');
            if (!_.includes(REFUSED_STATUSES, status)) return {};
            let code = null;
            try {
                code = _.get(await error.response.json(), 'code', null);
            } catch (e) { /* not JSON: no reason given */ }
            return {refused: true, status, code};
        }
    }

    // One line, and one report, for each answer the server refused with in a send.
    static _sayNotRecorded(outcomes) {
        const refusals = _.filter(outcomes, 'refused');
        const keptCount = _.filter(outcomes, (outcome) => !AbhaService._settled(outcome)).length;
        _.forEach(_.groupBy(refusals, 'status'), (refused, status) => {
            General.logWarn('AbhaService', `ABHA audit records not recorded: ${refused.length} refused (Http ${status}), dropped`);
            const reported = _.reject(refused, ['code', UNREPORTED_REFUSAL]).length;
            if (reported > 0) AbhaService.report(REFUSED, `ABHA audit records dropped: ${reported} refused (Http ${status})`);
        });
        if (keptCount > 0) General.logWarn('AbhaService', `ABHA audit records not recorded: ${keptCount} kept to send again`);
    }

    // Never rejects; false when the record could not be kept.
    _keep(event) {
        return this._changeKept((events) => [..._.reject(events, ['uuid', event.uuid]), event]);
    }

    // Never rejects; false when the change was not made. A record that could not be written is still sent; it is only
    // not kept for a resend. A change begun before a clear is dropped, so it cannot bring back what the clear removed;
    // that is on purpose, not a failure.
    _changeKept(change, clears = clearCount) {
        const changed = this.storage.then(async () => {
            if (clearCount !== clears) return;
            const events = await AbhaService._readKept();
            if (clearCount !== clears) return;
            await AbhaService._writeKept(change(events));
        });
        this.storage = changed.catch(() => {});
        return changed.then(() => true, () => {
            General.logWarn('AbhaService', 'ABHA audit records could not be kept on the phone');
            return false;
        });
    }

    // In line with the changes, since a read can move records out of AsyncStorage and so write.
    _kept() {
        const read = this.storage.then(() => AbhaService._readKept());
        this.storage = read.catch(() => {});
        return read.catch(() => {
            General.logWarn('AbhaService', 'Unsent ABHA audit records could not be read');
            return [];
        });
    }

    // Records in AsyncStorage move to the keychain before their key is removed, so a failure between the two loses none.
    // Contents that cannot be read are lost: reported, and removed at once, so the loss is reported once.
    // An entry the keystore can no longer decrypt is as unreadable, and is reset so records can be kept again.
    static async _readKept() {
        let kept;
        try {
            kept = AbhaService._parsed(_.get(await Keychain.getGenericPassword(KEYCHAIN_ENTRY), 'password'));
        } catch (e) {
            kept = null;
        }
        if (_.isNil(kept)) {
            AbhaService._sayUnreadable();
            await Keychain.resetGenericPassword(KEYCHAIN_ENTRY);
            kept = [];
        }
        const legacy = await AsyncStorage.getItem(UNSENT_EVENTS_KEY).catch(() => null);
        if (_.isNil(legacy)) return kept;
        let moved = AbhaService._parsed(legacy);
        if (_.isNil(moved)) {
            AbhaService._sayUnreadable();
            moved = [];
        }
        const events = [..._.reject(moved, (event) => _.some(kept, ['uuid', _.get(event, 'uuid')])), ...kept];
        const written = await AbhaService._writeKept(events);
        await AsyncStorage.removeItem(UNSENT_EVENTS_KEY).catch(() => {});
        return written;
    }

    // The records kept, or null when the contents cannot be read.
    static _parsed(stored) {
        try {
            const events = JSON.parse(stored || '[]');
            return _.isArray(events) ? events : null;
        } catch (e) {
            return null;
        }
    }

    static _sayUnreadable() {
        General.logWarn('AbhaService', UNREADABLE_KEPT);
        AbhaService.report(LOST, UNREADABLE_KEPT);
    }

    // The newest MAX_UNSENT_EVENTS, oldest first; the warning and the report give only how many went. None left removes
    // the entry, so it exists only while records are unsent.
    static async _writeKept(events) {
        const kept = _.takeRight(events, MAX_UNSENT_EVENTS);
        if (_.isEmpty(kept)) await Keychain.resetGenericPassword(KEYCHAIN_ENTRY);
        else await Keychain.setGenericPassword(KEYCHAIN_USERNAME, JSON.stringify(kept), KEYCHAIN_ENTRY);
        // Only once written: a failed write drops nothing.
        if (kept.length < events.length) {
            const dropped = `ABHA audit records over the limit of ${MAX_UNSENT_EVENTS}: ${events.length - kept.length} oldest dropped`;
            General.logWarn('AbhaService', dropped);
            AbhaService.report(LOST, dropped);
        }
        return kept;
    }

    // A lost record strands that patient's visits on the server, so Bugsnag hears of each loss under its kind's name: a
    // count, never a record. Never throws.
    static report(name, line) {
        try {
            const error = new Error(line);
            error.name = name;
            ErrorUtil.notifyBugsnag(error, 'AbhaService').catch(() => {});
        } catch (e) { /* reporting never holds up the records */ }
    }

    // The ABHA card image, fetched into the cache folder, and the path of that file. The card is the patient's
    // number, name, photo and QR code: the file is for the card screen, which deletes it when it closes. A failed fetch
    // deletes whatever was written, since a refusal is written to the file too, and throws an AbhaError. abhaLastFour,
    // else abhaAddress for an ABHA with no number, names the ABHA whose card is wanted, so the server never serves a later
    // lookup of another; headers, kept out of request logs.
    async getCardFile(subjectUUID, abhaLastFour, abhaAddress) {
        await AbhaService.deleteLeftoverCardFiles();
        const targetPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/abha-card-${General.randomUUID()}.png`;
        try {
            const downloaded = await downloadWithAuth(this.getService("authService"), this.getService("settingsService"),
                `${this.getServerUrl()}/abha/card?subjectUUID=${encodeURIComponent(subjectUUID)}`, targetPath, null,
                AbhaService.cardHeaders(abhaLastFour, abhaAddress));
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

    static cardHeaders(abhaLastFour, abhaAddress) {
        if (/^[0-9]{4}$/.test(abhaLastFour || '')) return {'X-Abha-Last-Four': abhaLastFour};
        const address = _.trim(abhaAddress);
        return _.isEmpty(address) ? {} : {'X-Abha-Address': address};
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
