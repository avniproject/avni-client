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

    // --- spoke state: its own small sqlite file ---

    async _state() {
        if (this.stateDb) return this.stateDb;
        const db = open({name: this.stateName});
        await db.execute(`create table if not exists hub_state (
            hub_id text primary key,
            epoch text not null,
            cursor integer not null,
            pushed_up_to integer not null)`);
        await db.execute('create table if not exists meta (key text primary key, value text)');
        this.stateDb = db;
        return db;
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
        const [row] = this._sqliteRows(await db.execute('select epoch, cursor, pushed_up_to from hub_state where hub_id = ?', [hubId]));
        if (row && row.epoch === epoch) return {cursor: row.cursor, pushedUpTo: row.pushed_up_to};
        await db.execute('insert into hub_state (hub_id, epoch, cursor, pushed_up_to) values (?, ?, 0, 0) on conflict(hub_id) do update set epoch = excluded.epoch, cursor = 0, pushed_up_to = 0', [hubId, epoch]);
        return {cursor: 0, pushedUpTo: 0};
    }

    async _saveHubState(hubId, column, value) {
        const db = await this._state();
        await db.execute(`update hub_state set ${column} = ? where hub_id = ?`, [value, hubId]);
    }

    // --- outbox ---

    // Reads the upload queue directly rather than through getAllQueuedItems, whose uniqBy keeps each
    // record's oldest entry, so a record edited after a hub send would never be sent again. Never pops.
    collectOutbox(pushedUpTo) {
        const latestByRecord = _.values(_.groupBy(
            this.findAll(EntityQueue.schema.name).slice().filter((item) => SHAREABLE_ENTITIES.includes(item.entity)),
            'entityUUID'
        )).map((items) => _.maxBy(items, (item) => item.savedAt.getTime()))
            .filter((item) => item.savedAt.getTime() > pushedUpTo);

        const batches = _.sortBy(_.toPairs(_.groupBy(latestByRecord, 'entity')), ([entityName]) => parentsFirstIndex(entityName))
            .map(([entityName, items]) => ({
                entityName,
                resources: _.sortBy(items, (item) => item.savedAt.getTime())
                    .map((item) => this.findByKey('uuid', item.entityUUID, entityName))
                    .filter((entity) => !_.isNil(entity))
                    .map((entity) => this.getService(ClinicRecordService).toSharedResource(entityName, entity)),
            }))
            .filter((batch) => batch.resources.length > 0);
        const upTo = _.max([pushedUpTo, ...latestByRecord.map((item) => item.savedAt.getTime())]);
        return {batches, upTo};
    }

    // --- sync ---

    _reply(connection, message, replyType) {
        return new Promise((resolve, reject) => {
            const unsubscribe = connection.onMessage((reply) => {
                if (reply.type !== replyType) return;
                unsubscribe();
                resolve(reply);
            });
            connection.onClose(() => reject(new Error('The hub closed the connection')));
            connection.send(message);
        });
    }

    async syncWithHub({host, port, key, hubId, epoch}, log = _.noop) {
        let connection;
        try {
            const deviceId = await this.deviceId();
            const {cursor, pushedUpTo} = await this._hubState({hubId, epoch});
            const {batches: outbox, upTo} = this.collectOutbox(pushedUpTo);
            connection = await connectToHub({host, port, key, hubId, epoch, appVersion: DeviceInfo.getVersion()});

            const ack = await this._reply(connection, {type: MessageType.push, deviceId, batches: outbox, upTo}, MessageType.pushAck);
            await this._saveHubState(hubId, 'pushed_up_to', ack.upTo);

            const {batches, maxSeq} = await this._reply(connection, {type: MessageType.pull, deviceId, since: cursor}, MessageType.pullResult);
            const applied = await this.getService(ClinicRecordService).applyBatches(batches, log);
            await this._saveHubState(hubId, 'cursor', maxSeq);
            if (applied > 0) await this._refreshOpenLists();
            log(`Sent ${_.sumBy(outbox, (b) => b.resources.length)}, received ${applied}`);
            return {sent: _.sumBy(outbox, (b) => b.resources.length), received: applied};
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

    // --- joined: sync now, then every 30 seconds while the app is in front ---

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
