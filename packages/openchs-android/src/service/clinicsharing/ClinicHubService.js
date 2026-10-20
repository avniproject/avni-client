import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {EntityQueue} from 'openchs-models';
import {open} from '@op-engineering/op-sqlite';
import {NativeEventEmitter, NativeModules, PermissionsAndroid, Platform} from 'react-native';
import DeviceInfo from "react-native-device-info";
import _ from "lodash";
import fs from 'react-native-fs';
import General from "../../utility/General";
import ClinicRecordService, {parentsFirstIndex} from "./ClinicRecordService";
import {CLINIC_PORT, generateSessionKey, MessageType, startHub} from "../../framework/clinicsharing/ClinicTransport";
import {LEDGER_PRUNE_INTERVAL_MS, LEDGER_RETENTION_DAYS, SHAREABLE_ENTITIES} from "../../framework/clinicsharing/ClinicSharingConstants";

const DAY_MS = 24 * 60 * 60 * 1000;
const STOP_REQUESTED_EVENT = 'ClinicHubStopRequested';
const MEDIA_MESSAGES = [MessageType.mediaPush, MessageType.mediaData, MessageType.mediaRequest];
export const RECENT_PHONE_WINDOW_MS = 5 * 60 * 1000;

@Service("clinicHubService")
class ClinicHubService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.ledgerName = 'clinic_hub_ledger.db';
        this.ledgerDb = null;
        this.lock = Promise.resolve();
        this.lastPrunedAt = 0;
        this.lastSyncByDevice = new Map();
        this.listeners = new Set();
        this.sharing = null;
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
        return _.orderBy([...this.lastSyncByDevice.values()], 'syncedAt', 'desc');
    }

    getSharing() {
        return this.sharing;
    }

    // The hub's server and its hotspot start and stop together; required lazily, as the join module needs native Wi-Fi.
    async startSharing(log = _.noop, {port = CLINIC_PORT} = {}) {
        const session = await this.startHub(log, {port});
        const hubJoin = require("../../framework/clinicsharing/ClinicHubJoin").default;
        // Watched before the start, so a hotspot that stops while starting is never shown as a code.
        let stoppedWhileStarting = false;
        this.stopWatchingHotspot = require("../../framework/clinicsharing/ClinicHubWifi").onHotspotStopped(() => {
            if (this.sharing) this.stopSharing();
            else stoppedWhileStarting = true;
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
        this.lastSyncByDevice.clear();
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

    async pruneLedger() {
        const db = await this._ledger();
        await db.execute('delete from ledger where created_at < ?', [Date.now() - LEDGER_RETENTION_DAYS * DAY_MS]);
        await this.getService('clinicMediaService').cleanUpCopies(db);
        this.lastPrunedAt = Date.now();
    }

    // Pruned when phones sync rather than on a timer: JS timers stall while the hub's screen is off.
    async _pruneIfDue() {
        if (Date.now() - this.lastPrunedAt > LEDGER_PRUNE_INTERVAL_MS) await this.pruneLedger();
    }

    // A new epoch and key on every start tells phones to send everything again.
    async _beginSession() {
        const session = {key: await generateSessionKey(), hubId: await this.hubId(), epoch: General.randomUUID()};
        await this._setMeta('epoch', session.epoch);
        return session;
    }

    async startHub(log = _.noop, {port} = {}) {
        await this.stopHub();
        await this._requestNotificationPermission();
        await this.pruneLedger();
        const session = await this._beginSession();
        this.transport = await startHub({
            ...session, port, appVersion: DeviceInfo.getVersion(), log, isBusy: () => this._serverSyncRunning(),
            onConnection: (connection) => connection.onMessage((message) => this._replyTo(connection, message, log)),
        });
        const nativeHub = NativeModules.ClinicHub;
        if (nativeHub) {
            this.stopSubscription = new NativeEventEmitter(nativeHub).addListener(STOP_REQUESTED_EVENT, () => this.stopSharing());
            nativeHub.startForegroundService();
        }
        return session;
    }

    async clearLedger() {
        await this.stopSharing();
        const db = await this._ledger();
        await this.getService('clinicMediaService').discardHubCopies(db);
        const tables = this._sqliteRows(await db.execute("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")).map((row) => row.name);
        await db.executeBatch(tables.map((table) => [`delete from ${table}`, []]));
        this.lastPrunedAt = 0;
    }

    async stopHub() {
        if (this.stopSubscription) this.stopSubscription.remove();
        this.stopSubscription = null;
        if (this.transport) await this.transport.stop();
        this.transport = null;
        if (NativeModules.ClinicHub) NativeModules.ClinicHub.stopForegroundService();
    }

    async _requestNotificationPermission() {
        if (Platform.OS !== 'android' || Platform.Version < 33) return;
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
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
        return this._exclusively(async () => {
            await this._pruneIfDue();
            return handle.call(this, message, log);
        });
    }

    async _handlePush({deviceId, phoneName, batches, upTo}, log) {
        // Applying records now would roll back the server sync's open batch; the phone retries on its next sync.
        if (this._serverSyncRunning()) throw new Error('syncing with the server');
        const startedAt = Date.now();
        this._noteSync(deviceId, phoneName);
        const applied = await this.getService(ClinicRecordService).applyBatches(batches, log, deviceId);
        await this._appendLedgerRows(batches, deviceId);
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

    // Server sync pops the hub phone's queue; what it pops, even while the hub is stopped, would never reach the list a phone pulls.
    async mirrorOwnQueue() {
        if (!this.transport && !(await this._hasLedger())) return;
        return this._exclusively(() => this._mirrorOwnQueue());
    }

    _hasLedger() {
        return fs.exists(`${fs.DocumentDirectoryPath}/../databases/${this.ledgerName}`);
    }

    _serverSyncRunning() {
        return !!_.get(this.getService('syncService'), 'serverSyncRunning');
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

    _noteSync(deviceId, phoneName) {
        this.lastSyncByDevice.set(deviceId, {deviceId, name: phoneName || deviceId, syncedAt: Date.now()});
        this._changed();
    }

    async _handlePull({deviceId, phoneName, since}, log) {
        this._noteSync(deviceId, phoneName);
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
        return {type: MessageType.pullResult, batches, maxSeq, epoch: await this._getMeta('epoch')};
    }
}

export default ClinicHubService;
