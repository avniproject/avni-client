import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {EntityQueue} from 'openchs-models';
import {open} from '@op-engineering/op-sqlite';
import {AppState, NativeEventEmitter, NativeModules} from 'react-native';
import DeviceInfo from "react-native-device-info";
import _ from "lodash";
import fs from 'react-native-fs';
import General from "../../utility/General";
import ClinicRecordService, {parentsFirstIndex} from "./ClinicRecordService";
import {CLINIC_PORT, generateSessionKey, MessageType, startHub} from "../../framework/clinicsharing/ClinicTransport";
import {SHAREABLE_ENTITIES} from "../../framework/clinicsharing/ClinicSharingConstants";

const STOP_REQUESTED_EVENT = 'ClinicHubStopRequested';
const SERVICE_ROLE = 'hub';
const MEDIA_MESSAGES = [MessageType.mediaPush, MessageType.mediaData, MessageType.mediaRequest];
export const RECENT_PHONE_WINDOW_MS = 5 * 60 * 1000;

@Service("clinicHubService")
class ClinicHubService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.ledgerName = 'clinic_hub_ledger.db';
        this.ledgerDb = null;
        this.lock = Promise.resolve();
        this.lastSyncByDevice = new Map();
        this.listeners = new Set();
        this.sharing = null;
        this.hotspotStopped = false;
        this.campEnding = false;
        this.campPhones = new Map();
    }

    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    _changed() {
        this.listeners.forEach((listener) => listener());
    }

    recentPhoneCount(withinMs = RECENT_PHONE_WINDOW_MS) {
        const since = Date.now() - withinMs;
        return [...this.lastSyncByDevice.values()].filter(({syncedAt}) => syncedAt >= since).length;
    }

    phonesSynced() {
        return _.orderBy([...this.lastSyncByDevice.values()], 'syncedAt', 'desc')
            .map((phone) => ({...phone, ..._.pick(this.campPhones.get(phone.deviceId), ['leftAt', 'skipped'])}));
    }

    async campActive() {
        if (!this.ledgerDb && !(await this._hasLedger())) return false;
        return (await this._getMeta('campActive')) === 'true';
    }

    // Each phone leaves at its next sync, which is already its last send and fetch.
    async endCamp() {
        await this._setMeta('campEnding', true);
        this.campEnding = true;
        this._changed();
    }

    // For a phone that is gone, so the hub can close without it.
    async skipPhone(deviceId) {
        await this._saveCampPhone(deviceId, {skipped: true});
    }

    everyPhoneLeft() {
        return this.phonesSynced().every(({leftAt, skipped}) => leftAt || skipped);
    }

    // Closing a camp ends sharing and drops what the hub kept for it, photo copies included.
    async closeCamp() {
        // A start under way would set the camp on again after it was cleared.
        if (this.starting) await this.starting.catch(_.noop);
        await this.clearLedger();
        this._changed();
    }

    // Kept in the hub file, so the list of phones and who has left survives a hub restart.
    async _saveCampPhone(deviceId, change) {
        const phone = {...this.campPhones.get(deviceId), ...change};
        this.campPhones.set(deviceId, phone);
        const synced = this.lastSyncByDevice.get(deviceId) || {};
        const db = await this._ledger();
        await db.execute(`insert into camp_phones (device_id, name, synced_at, left_at, skipped) values (?, ?, ?, ?, ?)
            on conflict(device_id) do update set name = excluded.name, synced_at = excluded.synced_at, left_at = excluded.left_at, skipped = excluded.skipped`,
        [deviceId, synced.name || null, synced.syncedAt || null, phone.leftAt || null, phone.skipped ? 1 : 0]);
        this._changed();
    }

    async _loadCampPhones() {
        const db = await this._ledger();
        this.lastSyncByDevice.clear();
        this.campPhones.clear();
        this._sqliteRows(await db.execute('select device_id, name, synced_at, left_at, skipped from camp_phones')).forEach((row) => {
            if (row.synced_at) this.lastSyncByDevice.set(row.device_id, {deviceId: row.device_id, name: row.name || row.device_id, syncedAt: row.synced_at});
            this.campPhones.set(row.device_id, {leftAt: row.left_at || undefined, skipped: row.skipped === 1});
        });
    }

    getSharing() {
        return this.sharing;
    }

    // Only the first start of a camp asks for permissions; a restart starts by itself, but only on screen, as Android
    // refuses the foreground service from the background, and only with the permissions still granted.
    async resumeCamp(log) {
        if (this.sharing || this.starting || AppState.currentState !== 'active' || !(await this.campActive())) return null;
        const {canStartHub} = require("../../framework/clinicsharing/ClinicHubWifi");
        const {ClinicRole, hasClinicHubPermissions} = require("../../framework/clinicsharing/ClinicHubPermissions");
        if (!canStartHub()) return null;
        if (!(await hasClinicHubPermissions(ClinicRole.hub))) throw Object.assign(new Error('A permission the hub needs was taken back'), {code: 'hotspotNotAllowed'});
        return this.startSharing(log);
    }

    isStarting() {
        return !_.isNil(this.starting);
    }

    // One start at a time: a second start would stop the first one's server, and Android refuses a second hotspot while one starts.
    startSharing(log = _.noop, options = {}) {
        if (!this.starting) {
            this.starting = this._startSharing(log, options).finally(() => {
                this.starting = null;
                this._changed();
            });
            this._changed();
        }
        return this.starting;
    }

    // The hub's server and its hotspot start and stop together; required lazily, as the join module needs native Wi-Fi.
    async _startSharing(log, {port = CLINIC_PORT} = {}) {
        this.hotspotStopped = false;
        const resuming = (await this._getMeta('campActive')) === 'true';
        // A phone that becomes the hub has left any camp it joined, and must not keep offering its Rejoin.
        const spoke = this.getService('clinicSpokeService');
        if (await spoke.camp()) await spoke.leaveCamp();
        const session = await this.startHub(log, {port});
        const hubJoin = require("../../framework/clinicsharing/ClinicHubJoin").default;
        // Watched before the start, so a hotspot that stops while starting is never shown as a code.
        let stoppedWhileStarting = false;
        this.stopWatchingHotspot = require("../../framework/clinicsharing/ClinicHubWifi").onHotspotStopped(() => {
            if (this.sharing) {
                // Android stops the hotspot when this phone's Wi-Fi is turned on; the screen says so rather than going blank.
                this.hotspotStopped = true;
                this.stopSharing().catch((error) => General.logError('ClinicHubService', error));
            } else stoppedWhileStarting = true;
        });
        try {
            const sharing = await hubJoin.startHubNetwork(session);
            if (stoppedWhileStarting) throw Object.assign(new Error("The hub's Wi-Fi stopped while it was starting"), {code: 'hotspotStopped'});
            this.sharing = sharing;
        } catch (error) {
            this.stopWatchingHotspot();
            this.stopWatchingHotspot = null;
            await this.stopHub();
            await hubJoin.stopHubNetwork().catch(_.noop);
            throw error;
        }
        if (resuming) await this._loadCampPhones();
        else {
            this.lastSyncByDevice.clear();
            this.campPhones.clear();
        }
        await this._setMeta('campActive', true);
        this.campEnding = (await this._getMeta('campEnding')) === 'true';
        this._changed();
        return this.sharing;
    }

    async stopSharing() {
        if (this.stopWatchingHotspot) this.stopWatchingHotspot();
        this.stopWatchingHotspot = null;
        const wasSharing = !_.isNil(this.sharing);
        this.sharing = null;
        await this.stopHub();
        if (wasSharing) await require("../../framework/clinicsharing/ClinicHubJoin").default.stopHubNetwork().catch((error) => General.logError('ClinicHubService', error));
        this._changed();
    }

    getSchema() {
        return EntityQueue.schema.name;
    }

    async _ledger() {
        if (this.ledgerDb) return this.ledgerDb;
        const db = open({name: this.ledgerName});
        await db.execute(`create table if not exists ledger (
            seq integer primary key autoincrement,
            entity_type text not null,
            entity_uuid text not null,
            origin text not null,
            created_at integer not null)`);
        await db.execute('create index if not exists ledger_created_at on ledger (created_at)');
        await db.execute('create table if not exists meta (key text primary key, value text)');
        await db.execute('create table if not exists mirrored (uuid text primary key, saved_at integer not null)');
        await db.execute('create table if not exists camp_phones (device_id text primary key, name text, synced_at integer, left_at integer, skipped integer not null default 0)');
        const campPhoneColumns = this._sqliteRows(await db.execute('pragma table_info(camp_phones)')).map((column) => column.name);
        if (!campPhoneColumns.includes('name')) await db.execute('alter table camp_phones add column name text');
        if (!campPhoneColumns.includes('synced_at')) await db.execute('alter table camp_phones add column synced_at integer');
        await db.execute(`create table if not exists hub_media (
            file_name text primary key,
            media_type text not null,
            entity_name text not null,
            entity_uuid text not null,
            received_at integer not null)`);
        this.ledgerDb = db;
        return db;
    }

    _sqliteRows(result) {
        return result.rows._array || result.rows || [];
    }

    async _getMeta(key) {
        const db = await this._ledger();
        const rows = this._sqliteRows(await db.execute('select value from meta where key = ?', [key]));
        return rows.length > 0 ? rows[0].value : null;
    }

    async _setMeta(key, value) {
        const db = await this._ledger();
        await db.execute('insert into meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value', [key, `${value}`]);
    }

    async hubId() {
        let id = await this._getMeta('hubId');
        if (!id) {
            id = General.randomUUID();
            await this._setMeta('hubId', id);
        }
        return id;
    }

    async _appendLedgerRows(batches, origin) {
        const db = await this._ledger();
        const createdAt = Date.now();
        const commands = batches.flatMap((batch) => batch.resources.map((resource) =>
            ['insert into ledger (entity_type, entity_uuid, origin, created_at) values (?,?,?,?)', [batch.entityName, resource.uuid, origin, createdAt]]));
        if (commands.length > 0) await db.executeBatch(commands);
    }

    // A new epoch tells phones to send and fetch everything again, so a restart within a camp keeps the epoch and changes only the key.
    async _beginSession() {
        const inCamp = (await this._getMeta('campActive')) === 'true';
        const epoch = (inCamp && await this._getMeta('epoch')) || General.randomUUID();
        const session = {key: await generateSessionKey(), hubId: await this.hubId(), epoch};
        await this._setMeta('epoch', session.epoch);
        return session;
    }

    async startHub(log = _.noop, {port} = {}) {
        await this.stopHub();
        await this.getService('clinicMediaService').discardStrayParts();
        const session = await this._beginSession();
        this.transport = await startHub({
            ...session, port, appVersion: DeviceInfo.getVersion(), setup: this.getService(ClinicRecordService).setupVersion(), log,
            onConnection: (connection) => connection.onMessage((message) => this._replyTo(connection, message, log)),
        });
        const nativeHub = NativeModules.ClinicHub;
        if (nativeHub) {
            this.stopSubscription = new NativeEventEmitter(nativeHub).addListener(STOP_REQUESTED_EVENT, () => this.stopSharing());
            nativeHub.startForegroundService(SERVICE_ROLE);
        }
        return session;
    }

    async clearLedger() {
        await this.stopSharing();
        const db = await this._ledger();
        await this.getService('clinicMediaService').discardHubCopies(db);
        const tables = this._sqliteRows(await db.execute("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")).map((row) => row.name);
        await db.executeBatch(tables.map((table) => [`delete from ${table}`, []]));
        this.campEnding = false;
        this.campPhones.clear();
        this.lastSyncByDevice.clear();
    }

    async stopHub() {
        if (this.stopSubscription) this.stopSubscription.remove();
        this.stopSubscription = null;
        if (this.transport) await this.transport.stop();
        this.transport = null;
        if (NativeModules.ClinicHub) NativeModules.ClinicHub.stopForegroundService(SERVICE_ROLE);
    }

    _exclusively(work) {
        const run = this.lock.then(work, work);
        this.lock = run.catch(_.noop);
        return run;
    }

    async _replyTo(connection, message, log) {
        if (MEDIA_MESSAGES.includes(message.type)) return this._handleMedia(connection, message, log);
        try {
            const reply = await this._handleMessage(message, log);
            if (reply) connection.send(reply);
        } catch (error) {
            log(`Hub failed on ${message.type}: ${error.message}`);
            General.logError('ClinicHubService', error);
            connection.close();
        }
    }

    // Outside the record lock, so a large file doesn't stall other phones; in order per connection, as chunks must be.
    _handleMedia(connection, message, log) {
        connection.mediaWork = (connection.mediaWork || Promise.resolve())
            .then(() => this.getService('clinicMediaService').handleOnHub(connection, message, log))
            .catch((error) => {
                log(`Hub failed on ${message.type}: ${error.message}`);
                General.logError('ClinicHubService', error);
                connection.close();
            });
        return connection.mediaWork;
    }

    _handleMessage(message, log) {
        const handle = {[MessageType.push]: this._handlePush, [MessageType.pull]: this._handlePull}[message.type];
        if (!handle) return Promise.resolve(null);
        return this._exclusively(() => handle.call(this, message, log));
    }

    async _handlePush({deviceId, phoneName, batches, upTo}, log) {
        const startedAt = Date.now();
        const applied = await this.getService(ClinicRecordService).applyBatches(batches, log, deviceId);
        await this._appendLedgerRows(batches, deviceId);
        // Only once its records are kept, so a phone whose syncs all fail never shows as just synced.
        await this._noteSync(deviceId, phoneName);
        await this.getService('clinicParkedRecordService').afterSync(startedAt, log);
        return {type: MessageType.pushAck, upTo, applied};
    }

    // Tracked per record, not by a time mark: a phone clock set back would hide every save made after it.
    async _mirrorOwnQueue() {
        const db = await this._ledger();
        const mirrored = new Map(this._sqliteRows(await db.execute('select uuid, saved_at from mirrored')).map((row) => [row.uuid, row.saved_at]));
        const items = _.values(_.groupBy(this.findAll(EntityQueue.schema.name).slice().filter((item) => SHAREABLE_ENTITIES.includes(item.entity)), 'entityUUID'))
            .map((queued) => _.maxBy(queued, (item) => item.savedAt.getTime()))
            .filter((item) => mirrored.get(item.entityUUID) !== item.savedAt.getTime())
            .sort((a, b) => a.savedAt - b.savedAt);
        if (items.length === 0) return;
        await this._appendLedgerRows(items.map((item) => ({entityName: item.entity, resources: [{uuid: item.entityUUID}]})), await this.hubId());
        await db.executeBatch(items.map((item) => ['insert into mirrored (uuid, saved_at) values (?, ?) on conflict(uuid) do update set saved_at = excluded.saved_at',
            [item.entityUUID, item.savedAt.getTime()]]));
    }

    _hasLedger() {
        return fs.exists(`${fs.DocumentDirectoryPath}/../databases/${this.ledgerName}`);
    }

    // One record saved without its parent must not fail every phone's pull.
    _sharedResourceOrNull(entityName, entity, log) {
        try {
            return this.getService(ClinicRecordService).toSharedResource(entityName, entity);
        } catch (error) {
            log(`Not serving ${entityName} ${entity.uuid}: ${error.message}`);
            General.logError('ClinicHubService', error);
            return null;
        }
    }

    async _noteSync(deviceId, phoneName) {
        this.lastSyncByDevice.set(deviceId, {deviceId, name: phoneName || deviceId, syncedAt: Date.now()});
        await this._saveCampPhone(deviceId, {});
    }

    async _handlePull({deviceId, phoneName, since}, log) {
        await this._mirrorOwnQueue();
        const db = await this._ledger();
        const rows = this._sqliteRows(await db.execute(
            'select seq, entity_type, entity_uuid, origin from ledger where seq > ? order by seq', [since]));
        const maxSeq = _.get(_.last(rows), 'seq', since);

        // Dedupe before excluding the requester's rows, or a peer's older edit is served over the requester's newer one.
        const latest = new Map();
        rows.forEach((row) => {
            latest.delete(row.entity_uuid);
            latest.set(row.entity_uuid, row);
        });
        const byType = _.groupBy([...latest.values()].filter((row) => row.origin !== deviceId), 'entity_type');

        const batches = Object.keys(byType)
            .sort((a, b) => parentsFirstIndex(a) - parentsFirstIndex(b))
            .map((entityName) => ({
                entityName,
                resources: byType[entityName]
                    .map((row) => this.findByKey('uuid', row.entity_uuid, entityName))
                    .filter((entity) => !_.isNil(entity))
                    .map((entity) => this._sharedResourceOrNull(entityName, entity, log))
                    .filter((resource) => !_.isNil(resource)),
            }))
            .filter((batch) => batch.resources.length > 0);
        log(`Serving ${rows.length} ledger rows (${batches.length} types) to ${deviceId}`);
        await this._noteSync(deviceId, phoneName);
        // The phone pushed before this pull, so this reply ends its last send and fetch.
        if (this.campEnding) await this._saveCampPhone(deviceId, {leftAt: Date.now()});
        return {type: MessageType.pullResult, batches, maxSeq, epoch: await this._getMeta('epoch'), campEnded: this.campEnding || undefined};
    }
}

export default ClinicHubService;
