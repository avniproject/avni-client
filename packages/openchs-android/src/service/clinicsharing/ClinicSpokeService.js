import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {EntityQueue} from 'openchs-models';
import {open} from '@op-engineering/op-sqlite';
import {AppState} from 'react-native';
import DeviceInfo from "react-native-device-info";
import _ from "lodash";
import General from "../../utility/General";
import ClinicRecordService, {parentsFirstIndex} from "./ClinicRecordService";
import LocalCacheService from "../LocalCacheService";
import {connectToHub, MessageType} from "../../framework/clinicsharing/ClinicTransport";
import {CLINIC_SYNC_INTERVAL_SECONDS, SHAREABLE_ENTITIES} from "../../framework/clinicsharing/ClinicSharingConstants";
import {IndividualSearchActionNames as IndividualSearchActions} from '../../action/individual/IndividualSearchActions';
import {LandingViewActionsNames as LandingViewActions} from '../../action/LandingViewActions';

@Service("clinicSpokeService")
class ClinicSpokeService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.stateName = 'clinic_spoke_state.db';
        this.stateDb = null;
        this.joined = null;
        this.inFlight = null;
    }

    getSchema() {
        return EntityQueue.schema.name;
    }

    // Synchronous so a save can check it inside its write transaction.
    _stateSync() {
        if (this.stateDb) return this.stateDb;
        const db = open({name: this.stateName});
        db.executeSync(`create table if not exists hub_state (
            hub_id text primary key,
            epoch text not null,
            cursor integer not null,
            pushed_up_to integer not null)`);
        db.executeSync('create table if not exists meta (key text primary key, value text)');
        db.executeSync('create table if not exists media_sent (hub_id text not null, file_name text not null, primary key (hub_id, file_name))');
        db.executeSync('create table if not exists pushed_records (hub_id text not null, uuid text not null, saved_at integer not null, primary key (hub_id, uuid))');
        this.stateDb = db;
        return db;
    }

    async _state() {
        return this._stateSync();
    }

    _sqliteRows(result) {
        return result.rows._array || result.rows || [];
    }

    async deviceId() {
        const db = await this._state();
        const rows = this._sqliteRows(await db.execute("select value from meta where key = 'deviceId'"));
        if (rows.length > 0) return rows[0].value;
        const id = General.randomUUID();
        await db.execute("insert into meta (key, value) values ('deviceId', ?)", [id]);
        return id;
    }

    // A new epoch means the hub restarted with an empty view of this phone, so send and pull everything again.
    async _hubState({hubId, epoch}) {
        const db = await this._state();
        const [row] = this._sqliteRows(await db.execute('select epoch, cursor from hub_state where hub_id = ?', [hubId]));
        if (row && row.epoch === epoch) return {cursor: row.cursor};
        await db.execute('insert into hub_state (hub_id, epoch, cursor, pushed_up_to) values (?, ?, 0, 0) on conflict(hub_id) do update set epoch = excluded.epoch, cursor = 0', [hubId, epoch]);
        await db.executeBatch([['delete from media_sent where hub_id = ?', [hubId]], ['delete from pushed_records where hub_id = ?', [hubId]]]);
        return {cursor: 0};
    }

    async _pushedRecords(hubId) {
        const db = await this._state();
        return new Map(this._sqliteRows(await db.execute('select uuid, saved_at from pushed_records where hub_id = ?', [hubId])).map((row) => [row.uuid, row.saved_at]));
    }

    async _savePushed(hubId, items) {
        if (items.length === 0) return;
        const db = await this._state();
        await db.executeBatch(items.map((item) => ['insert into pushed_records (hub_id, uuid, saved_at) values (?, ?, ?) on conflict(hub_id, uuid) do update set saved_at = excluded.saved_at',
            [hubId, item.entityUUID, item.savedAt.getTime()]]));
    }

    async clearState() {
        this.leave();
        const db = await this._state();
        const tables = this._sqliteRows(await db.execute("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")).map((row) => row.name);
        await db.executeBatch(tables.map((table) => [`delete from ${table}`, []]));
    }

    async _saveHubState(hubId, column, value) {
        const db = await this._state();
        await db.execute(`update hub_state set ${column} = ? where hub_id = ?`, [value, hubId]);
    }

    // Each record's latest queue entry, not getAllQueuedItems' oldest; tracked per record, since a clock set back would hide saves from a time mark.
    collectOutbox(pushed) {
        const latestByRecord = _.values(_.groupBy(
            this.findAll(EntityQueue.schema.name).slice().filter((item) => SHAREABLE_ENTITIES.includes(item.entity)),
            'entityUUID'
        )).map((items) => _.maxBy(items, (item) => item.savedAt.getTime()))
            .filter((item) => pushed.get(item.entityUUID) !== item.savedAt.getTime());

        const batches = _.sortBy(_.toPairs(_.groupBy(latestByRecord, 'entity')), ([entityName]) => parentsFirstIndex(entityName))
            .map(([entityName, items]) => ({
                entityName,
                resources: _.sortBy(items, (item) => item.savedAt.getTime())
                    .map((item) => this.findByKey('uuid', item.entityUUID, entityName))
                    .filter((entity) => !_.isNil(entity))
                    .map((entity) => this.getService(ClinicRecordService).toSharedResource(entityName, entity)),
            }))
            .filter((batch) => batch.resources.length > 0);
        const upTo = _.max([0, ...latestByRecord.map((item) => item.savedAt.getTime())]);
        return {batches, sent: latestByRecord, upTo};
    }

    // An edit saved during this sync goes out on the next push; a peer's copy pulled now must not overwrite it.
    _withoutEditsSince(batches, collectedAt) {
        const edited = new Set(this.findAll(EntityQueue.schema.name).slice()
            .filter((item) => item.savedAt.getTime() > collectedAt).map((item) => item.entityUUID));
        if (edited.size === 0) return batches;
        return batches.map((batch) => ({...batch, resources: batch.resources.filter((resource) => !edited.has(resource.uuid))}));
    }

    async syncWithHub({host, port, key, hubId, epoch}, log = _.noop) {
        let connection;
        const startedAt = Date.now();
        try {
            const deviceId = await this.deviceId();
            const {cursor} = await this._hubState({hubId, epoch});
            const collectedAt = Date.now();
            const {batches: outbox, sent, upTo} = this.collectOutbox(await this._pushedRecords(hubId));
            connection = await connectToHub({host, port, key, hubId, epoch, appVersion: DeviceInfo.getVersion()});

            await connection.request({type: MessageType.push, deviceId, batches: outbox, upTo}, MessageType.pushAck);
            await this._savePushed(hubId, sent);

            const {batches, maxSeq} = await connection.request({type: MessageType.pull, deviceId, since: cursor}, MessageType.pullResult);
            const applied = await this.getService(ClinicRecordService).applyBatches(this._withoutEditsSince(batches, collectedAt), log);
            await this._saveHubState(hubId, 'cursor', maxSeq);
            const unparked = (await this.getService('clinicParkedRecordService').afterSync(startedAt, log)).applied;
            if (applied + unparked > 0) await this._refreshOpenLists();

            const mediaSent = await this.getService('clinicMediaService').pushToHub(connection, hubId, log);
            log(`Sent ${_.sumBy(outbox, (b) => b.resources.length)}, received ${applied}, files sent ${mediaSent}`);
            return {sent: _.sumBy(outbox, (b) => b.resources.length), received: applied, mediaSent};
        } catch (error) {
            log(error.message);
            General.logError('ClinicSpokeService', error);
            return {error};
        } finally {
            if (connection) connection.close();
        }
    }

    async _refreshOpenLists() {
        this.dispatchAction(IndividualSearchActions.ON_LOAD);
        const cachedSubjectTypeUUID = await LocalCacheService.getPreviouslySelectedSubjectTypeUuid();
        this.dispatchAction(LandingViewActions.ON_LOAD, {syncRequired: false, cachedSubjectTypeUUID});
    }

    syncNow(log) {
        if (!this.joined) return Promise.resolve(null);
        if (!this.inFlight) {
            this.inFlight = this.syncWithHub(this.joined, log).finally(() => { this.inFlight = null; });
        }
        return this.inFlight;
    }

    join(joinInfo, log) {
        this.leave();
        this.joined = joinInfo;
        this.log = log;
        this._startTimer();
        this.appStateSubscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') this._startTimer();
            else this._stopTimer();
        });
    }

    leave() {
        this._stopTimer();
        if (this.appStateSubscription) this.appStateSubscription.remove();
        this.appStateSubscription = null;
        this.joined = null;
    }

    _startTimer() {
        this._stopTimer();
        this.syncNow(this.log);
        this.timer = setInterval(() => this.syncNow(this.log), CLINIC_SYNC_INTERVAL_SECONDS * 1000);
    }

    _stopTimer() {
        clearInterval(this.timer);
        this.timer = null;
    }
}

export default ClinicSpokeService;
