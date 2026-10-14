import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityMetaData, EntityQueue} from 'openchs-models';
import EntityService from "./EntityService";
import EntityQueueService from "./EntityQueueService";
import {open} from '@op-engineering/op-sqlite';
import General from "../utility/General";
import _ from "lodash";
import moment from "moment";
import DeviceInfo from "react-native-device-info";
import {connectToHub, generateSessionKey, MessageType, startHub} from "../framework/clinicsharing/ClinicTransport";
import {IndividualSearchActionNames as IndividualSearchActions} from '../action/individual/IndividualSearchActions';
import {LandingViewActionsNames as LandingViewActions} from '../action/LandingViewActions';
import PrivilegeService from "./PrivilegeService";
import SyncService from "./SyncService";

// Slice scope: expand only after the toResource→fromResource adapter is verified
// for each type (server renames some reference keys between push and pull formats).
const SHAREABLE_ENTITIES = ['Individual', 'Encounter', 'ProgramEnrolment', 'ProgramEncounter'];

// fromResource reads reference uuids from _links.<key>.href; toResource writes flat
// <key> fields, and the server renames some keys between the two formats.
const LINK_KEY_ALIASES = {
    Individual: {addressLevelUUID: 'addressUUID'},
};

@Service("p2pStarSyncService")
class P2PStarSyncService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.ledgerDb = null;
    }

    getSchema() {
        return EntityQueue.schema.name;
    }

    // --- ledger (own tiny sqlite db; holds only uuids/types, no PHI) ---

    async _ledger() {
        if (this.ledgerDb) return this.ledgerDb;
        const db = open({name: 'p2p_star_ledger.db'});
        await db.execute(`create table if not exists ledger (
            seq integer primary key autoincrement,
            entity_type text not null,
            entity_uuid text not null,
            origin text not null)`);
        await db.execute('create table if not exists meta (key text primary key, value text)');
        this.ledgerDb = db;
        return db;
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

    async deviceId() {
        let id = await this._getMeta('deviceId');
        if (!id) {
            id = General.randomUUID();
            await this._setMeta('deviceId', id);
        }
        return id;
    }

    _sqliteRows(result) {
        return result.rows._array || result.rows || [];
    }

    _txMetaDataParentsFirst() {
        return EntityMetaData.model().filter((md) => md.type === 'tx').reverse();
    }

    _canonicalIndex(entityName) {
        const index = this._txMetaDataParentsFirst().findIndex((md) => md.entityName === entityName);
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    }

    // --- outbox: reuse the exact resources server push would send ---

    collectOutbox() {
        const entityQueueService = this.getService(EntityQueueService);
        const queuedNames = _.uniq(entityQueueService.getPresentEntities().map((item) => item.entity))
            .filter((name) => SHAREABLE_ENTITIES.includes(name))
            .sort((a, b) => this._canonicalIndex(a) - this._canonicalIndex(b));
        return queuedNames.map((entityName) => {
            const metaData = EntityMetaData.findByName(entityName);
            const {entities} = entityQueueService.getAllQueuedItems(metaData);
            return {entityName: entityName, resources: entities.map((e) => e.resource)};
        }).filter((batch) => batch.resources.length > 0);
    }

    // --- apply: through SyncService.applyIncoming, the same save path as server sync ---

    _adaptResource(entityName, resource) {
        const adapted = _.cloneDeep(resource);
        adapted._links = adapted._links || {};
        const aliases = LINK_KEY_ALIASES[entityName] || {};
        Object.keys(adapted).forEach((key) => {
            if (/UUID$/.test(key) && _.isString(adapted[key])) {
                adapted._links[key] = {href: adapted[key]};
                if (aliases[key]) adapted._links[aliases[key]] = {href: adapted[key]};
            }
            // toResource emits observations as [{conceptUUID, value}]; fromResource
            // expects a {conceptUUID: value} map (the server converts; so must we)
            const value = adapted[key];
            if (_.isArray(value) && value.length > 0 && value.every((o) => o && _.isString(o.conceptUUID) && 'value' in o)) {
                adapted[key] = _.fromPairs(value.map((o) => [o.conceptUUID, o.value]));
            }
        });
        return adapted;
    }

    async applyBatches(batches, log) {
        if (!this.db.isSqlite) {
            log('hub sync needs the SQLite database; nothing applied');
            return 0;
        }
        const entityService = this.getService(EntityService);
        const ordered = _.sortBy(batches, (batch) => this._canonicalIndex(batch.entityName));
        let total = 0;
        for (const batch of ordered) {
            if (!SHAREABLE_ENTITIES.includes(batch.entityName)) continue;
            const metaData = EntityMetaData.findByName(batch.entityName);
            const entityResources = batch.resources.map((r) => this._adaptResource(batch.entityName, r));
            const built = [];
            for (const resource of entityResources) {
                try {
                    built.push({resource, entity: metaData.entityClass.fromResource(resource, entityService, entityResources)});
                } catch (error) {
                    log(`skip ${batch.entityName} ${resource.uuid}: ${error.message}`);
                }
            }
            const permitted = this.getService(PrivilegeService).onlyViewableEntities(metaData.schemaName, built.map(({entity}) => entity));
            const kept = built.filter(({entity}) => permitted.includes(entity));
            if (kept.length < built.length) log(`dropped ${built.length - kept.length} ${batch.entityName} outside this user's privileges`);
            if (kept.length === 0) continue;

            await this.getService(SyncService).applyIncoming(metaData, kept.map(({resource}) => resource), kept.map(({entity}) => entity));
            total += kept.length;
            log(`applied ${kept.length} ${batch.entityName}`);
        }
        return total;
    }

    // --- hub side ---

    // Returns what #2173 puts in the hub's QR code.
    async startHub(log) {
        if (this.hub) await this.hub.stop();
        const session = {key: await generateSessionKey(), hubId: await this.deviceId(), epoch: General.randomUUID()};
        this.hub = await startHub({
            ...session, appVersion: DeviceInfo.getVersion(), log,
            onConnection: (connection) => connection.onMessage((message) => this._hubHandleMessage(connection, message, log)),
        });
        return session;
    }

    async stopHub() {
        if (this.hub) await this.hub.stop();
        this.hub = null;
    }

    async _hubHandleMessage(connection, message, log) {
        try {
            if (message.type === MessageType.push) {
                const {applied} = await this._hubHandlePush(message, log);
                connection.send({type: MessageType.pushAck, applied});
            } else if (message.type === MessageType.pull) {
                connection.send({type: MessageType.pullResult, ...await this._hubHandlePull(message, log)});
            }
        } catch (error) {
            log(`Hub failed on ${message.type}: ${error.message}`);
            General.logError('P2PStarSyncService', error);
            connection.close();
        }
    }

    async _hubHandlePush({deviceId, batches}, log) {
        const applied = await this.applyBatches(batches, log);
        const db = await this._ledger();
        for (const batch of batches) {
            for (const resource of batch.resources) {
                await db.execute('insert into ledger (entity_type, entity_uuid, origin) values (?,?,?)',
                    [batch.entityName, resource.uuid, deviceId]);
            }
        }
        return {applied: applied};
    }

    async _mirrorOwnQueue() {
        const db = await this._ledger();
        const selfId = await this.deviceId();
        const mirroredAt = await this._getMeta('mirroredAt');
        const cutoff = mirroredAt ? moment(mirroredAt).toDate() : new Date(0);
        const items = this.findAll(EntityQueue.schema.name).slice()
            .filter((item) => SHAREABLE_ENTITIES.includes(item.entity) && item.savedAt > cutoff)
            .sort((a, b) => a.savedAt - b.savedAt);
        for (const item of items) {
            await db.execute('insert into ledger (entity_type, entity_uuid, origin) values (?,?,?)',
                [item.entity, item.entityUUID, selfId]);
        }
        if (items.length > 0) await this._setMeta('mirroredAt', moment(_.last(items).savedAt).toISOString());
    }

    async _hubHandlePull({deviceId, since}, log) {
        await this._mirrorOwnQueue();
        const db = await this._ledger();
        const rows = this._sqliteRows(await db.execute(
            'select seq, entity_type, entity_uuid, origin from ledger where seq > ? order by seq', [since]));
        const maxSeqRow = this._sqliteRows(await db.execute('select max(seq) as m from ledger'))[0];
        const maxSeq = maxSeqRow.m || since;

        // Dedupe to the winning (latest) row per entity BEFORE excluding the
        // requester's own rows — otherwise a peer's older, defeated edit gets
        // served over the requester's newer one and devices diverge permanently.
        const latest = new Map();
        rows.forEach((row) => latest.set(`${row.entity_type}|${row.entity_uuid}`, row));
        const winners = [...latest.values()].filter((row) => row.origin !== deviceId);
        const byType = _.groupBy(winners, 'entity_type');

        const batches = Object.keys(byType)
            .sort((a, b) => this._canonicalIndex(a) - this._canonicalIndex(b))
            .map((entityName) => {
                const resources = byType[entityName]
                    .map((row) => this.findByKey('uuid', row.entity_uuid, entityName))
                    .filter((entity) => !_.isNil(entity))
                    .map((entity) => entity.toResource);
                return {entityName: entityName, resources: resources};
            })
            .filter((batch) => batch.resources.length > 0);
        log(`serving ${rows.length} ledger rows (${batches.length} types) to ${deviceId.slice(0, 8)}…`);
        return {batches: batches, maxSeq: maxSeq};
    }

    // --- spoke side ---

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

    async syncWithHub({host, key, hubId, epoch}, log) {
        const deviceId = await this.deviceId();
        const since = parseInt((await this._getMeta('cursor')) || '0', 10);
        const outbox = this.collectOutbox();
        let connection;
        try {
            connection = await connectToHub({host, key, hubId, epoch, appVersion: DeviceInfo.getVersion()});
            log(`Pushing ${_.sumBy(outbox, (b) => b.resources.length)} records, pulling since ${since}`);
            const {applied: hubApplied} = await this._reply(connection, {type: MessageType.push, deviceId, batches: outbox}, MessageType.pushAck);
            log(`Hub applied ${hubApplied} pushed records`);
            const {batches, maxSeq} = await this._reply(connection, {type: MessageType.pull, deviceId, since}, MessageType.pullResult);
            const applied = await this.applyBatches(batches, log);
            await this._setMeta('cursor', maxSeq);
            this.dispatchAction(IndividualSearchActions.ON_LOAD);
            this.dispatchAction(LandingViewActions.ON_LOAD, {syncRequired: false});
            log(`Applied ${applied}, cursor now ${maxSeq}`);
        } catch (error) {
            log(error.message);
            General.logError('P2PStarSyncService', error);
        } finally {
            if (connection) connection.close();
        }
    }
}

export default P2PStarSyncService;
