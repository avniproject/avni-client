import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityMetaData, EntityQueue} from 'openchs-models';
import EntityService from "./EntityService";
import EntityQueueService from "./EntityQueueService";
import {open} from '@op-engineering/op-sqlite';
import General from "../utility/General";
import _ from "lodash";
import moment from "moment";
import P2PSpike from "../framework/p2p/P2PSpike";
import {IndividualSearchActionNames as IndividualSearchActions} from '../action/individual/IndividualSearchActions';
import {LandingViewActionsNames as LandingViewActions} from '../action/LandingViewActions';
import {jsonArrayListPropFor} from "../framework/db/SchemaGenerator";

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

    // --- apply: same machinery as server-sync pull, minus EntitySyncStatus/telemetry ---

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

    _associateParent(entityResources, entities, entityMetaData) {
        const entityService = this.getService(EntityService);
        const parentEntities = _.zip(entityResources, entities)
            .map(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChild(entity, entityMetaData.entityClass, entityResource, entityService));
        return _.values(_.groupBy(parentEntities, 'uuid'))
            .map((withSameUuid) => entityMetaData.parent.entityClass.merge(entityMetaData.entityClass.schema.name)(withSameUuid));
    }

    _associateMultipleParents(entityResources, entities, entityMetaData) {
        const entityService = this.getService(EntityService);
        const parentEntities = _.zip(entityResources, entities)
            .flatMap(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChildToMultipleParents(entity, entityMetaData.entityClass, entityResource, entityService));
        return _.values(_.groupBy(parentEntities, 'uuid'))
            .map((entities) => entityMetaData.parent.entityClass.mergeMultipleParents(entityMetaData.entityClass.schema.name, entities));
    }

    async applyBatches(batches, log) {
        const entityService = this.getService(EntityService);
        const ordered = _.sortBy(batches, (batch) => this._canonicalIndex(batch.entityName));
        let total = 0;
        for (const batch of ordered) {
            if (!SHAREABLE_ENTITIES.includes(batch.entityName)) continue;
            const metaData = EntityMetaData.findByName(batch.entityName);
            const entityResources = batch.resources.map((r) => this._adaptResource(batch.entityName, r));
            const entities = [];
            for (const resource of entityResources) {
                try {
                    entities.push(metaData.entityClass.fromResource(resource, entityService, entityResources));
                } catch (error) {
                    log(`skip ${batch.entityName} ${resource.uuid}: ${error.message}`);
                }
            }
            if (entities.length === 0) continue;

            if (this.db.isSqlite && typeof this.db.bulkCreate === 'function') {
                await this.db.bulkCreate(metaData.schemaName, entities);
                if (!_.isEmpty(metaData.parent) && !_.isNil(jsonArrayListPropFor(metaData.parent.schemaName, metaData.schemaName))) {
                    const mergedParents = metaData.hasMoreThanOneAssociation
                        ? this._associateMultipleParents(entityResources, entities, metaData)
                        : this._associateParent(entityResources, entities, metaData);
                    await this.db.bulkCreate(metaData.parent.schemaName, mergedParents);
                }
            } else {
                let createFns = this.getCreateEntityFunctions(metaData.schemaName, entities);
                if (!_.isEmpty(metaData.parent)) {
                    const mergedParents = metaData.hasMoreThanOneAssociation
                        ? this._associateMultipleParents(entityResources, entities, metaData)
                        : this._associateParent(entityResources, entities, metaData);
                    createFns = createFns.concat(this.getCreateEntityFunctions(metaData.parent.entityName, mergedParents));
                }
                this.bulkSaveOrUpdate(createFns);
            }
            total += entities.length;
            log(`applied ${entities.length} ${batch.entityName}`);
        }
        return total;
    }

    // --- hub side ---

    async startHub(log) {
        await this.deviceId();
        P2PSpike.setStarHandlers({
            onPush: (message) => this._hubHandlePush(message, log),
            onPull: (message) => this._hubHandlePull(message, log),
        });
        P2PSpike.startHub(log);
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

    async getSavedHubIp() {
        return this._getMeta('hubIp');
    }

    async syncWithHub(host, log) {
        if (host) await this._setMeta('hubIp', host);
        const deviceId = await this.deviceId();
        const since = parseInt((await this._getMeta('cursor')) || '0', 10);
        const outbox = this.collectOutbox();
        log(`A★ sync: pushing ${_.sumBy(outbox, (b) => b.resources.length)} entities, pulling since seq ${since}`);
        P2PSpike.starSync(host, {deviceId: deviceId, since: since, batches: outbox}, log, async ({batches, maxSeq}) => {
            try {
                const applied = await this.applyBatches(batches, log);
                await this._setMeta('cursor', maxSeq);
                this.dispatchAction(IndividualSearchActions.ON_LOAD);
                this.dispatchAction(LandingViewActions.ON_LOAD, {syncRequired: false});
                log(`A★ done: applied ${applied}, cursor now ${maxSeq}`);
            } catch (error) {
                log(`A★ apply failed: ${error.message}`);
                General.logError('P2PStarSyncService', error);
            }
        });
    }
}

export default P2PStarSyncService;
