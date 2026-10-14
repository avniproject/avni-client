import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {EntityQueue} from 'openchs-models';
import {open} from '@op-engineering/op-sqlite';
import {NativeEventEmitter, NativeModules, PermissionsAndroid, Platform} from 'react-native';
import DeviceInfo from "react-native-device-info";
import _ from "lodash";
import moment from "moment";
import General from "../../utility/General";
import ClinicRecordService, {parentsFirstIndex} from "./ClinicRecordService";
import {generateSessionKey, MessageType, startHub} from "../../framework/clinicsharing/ClinicTransport";
import {LEDGER_PRUNE_INTERVAL_MS, LEDGER_RETENTION_DAYS, SHAREABLE_ENTITIES} from "../../framework/clinicsharing/ClinicSharingConstants";

const DAY_MS = 24 * 60 * 60 * 1000;
const STOP_REQUESTED_EVENT = 'ClinicHubStopRequested';

@Service("clinicHubService")
class ClinicHubService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.ledgerName = 'clinic_hub_ledger.db';
        this.ledgerDb = null;
        this.lock = Promise.resolve();
        this.lastPrunedAt = 0;
    }

    getSchema() {
        return EntityQueue.schema.name;
    }

    // --- ledger: its own small sqlite file, holding only uuids and types ---

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
        this.lastPrunedAt = Date.now();
    }

    // Pruned when phones sync rather than on a timer: JS timers stall while the hub's screen is off.
    async _pruneIfDue() {
        if (Date.now() - this.lastPrunedAt > LEDGER_PRUNE_INTERVAL_MS) await this.pruneLedger();
    }

    // --- session ---

    // A new epoch and key on every start tells phones to send everything again; the key goes in #2173's QR code.
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
            ...session, port, appVersion: DeviceInfo.getVersion(), log,
            onConnection: (connection) => connection.onMessage((message) => this._replyTo(connection, message, log)),
        });
        const nativeHub = NativeModules.ClinicHub;
        if (nativeHub) {
            this.stopSubscription = new NativeEventEmitter(nativeHub).addListener(STOP_REQUESTED_EVENT, () => this.stopHub());
            nativeHub.startForegroundService();
        }
        return session;
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

    // --- messages ---

    _exclusively(work) {
        const run = this.lock.then(work, work);
        this.lock = run.catch(_.noop);
        return run;
    }

    async _replyTo(connection, message, log) {
        try {
            const reply = await this._handleMessage(message, log);
            if (reply) connection.send(reply);
        } catch (error) {
            log(`Hub failed on ${message.type}: ${error.message}`);
            General.logError('ClinicHubService', error);
            connection.close();
        }
    }

    _handleMessage(message, log) {
        const handle = {[MessageType.push]: this._handlePush, [MessageType.pull]: this._handlePull}[message.type];
        if (!handle) return Promise.resolve(null);
        return this._exclusively(async () => {
            await this._pruneIfDue();
            return handle.call(this, message, log);
        });
    }

    async _handlePush({deviceId, batches, upTo}, log) {
        const applied = await this.getService(ClinicRecordService).applyBatches(batches, log);
        await this._appendLedgerRows(batches, deviceId);
        return {type: MessageType.pushAck, upTo, applied};
    }

    async _mirrorOwnQueue() {
        const mirroredAt = await this._getMeta('mirroredAt');
        const cutoff = mirroredAt ? moment(mirroredAt).toDate() : new Date(0);
        const items = this.findAll(EntityQueue.schema.name).slice()
            .filter((item) => SHAREABLE_ENTITIES.includes(item.entity) && item.savedAt > cutoff)
            .sort((a, b) => a.savedAt - b.savedAt);
        if (items.length === 0) return;
        await this._appendLedgerRows(items.map((item) => ({entityName: item.entity, resources: [{uuid: item.entityUUID}]})), await this.hubId());
        await this._setMeta('mirroredAt', moment(_.last(items).savedAt).toISOString());
    }

    async _handlePull({deviceId, since}, log) {
        await this._mirrorOwnQueue();
        const db = await this._ledger();
        const rows = this._sqliteRows(await db.execute(
            'select seq, entity_type, entity_uuid, origin from ledger where seq > ? order by seq', [since]));
        const maxSeq = _.get(_.last(rows), 'seq', since);

        // Dedupe to the latest row per record BEFORE excluding the requester's own rows; otherwise a
        // peer's older, overwritten edit is served over the requester's newer one and phones diverge.
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
                    .map((entity) => this.getService(ClinicRecordService).toSharedResource(entityName, entity)),
            }))
            .filter((batch) => batch.resources.length > 0);
        log(`Serving ${rows.length} ledger rows (${batches.length} types) to ${deviceId}`);
        return {type: MessageType.pullResult, batches, maxSeq, epoch: await this._getMeta('epoch')};
    }
}

export default ClinicHubService;
