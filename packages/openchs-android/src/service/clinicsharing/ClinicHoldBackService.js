import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {EntityMetaData, EntityQueue} from 'openchs-models';
import _ from "lodash";

const linkedUuids = (resource) => _.compact(_.map(resource, (value, key) => (/uuid$/i.test(key) && _.isString(value) ? value : null)));

// Uploads whose record, or a record it links to, came from another phone wait until the server has
// that record: the server refuses a child before its parent, and credits the first uploader as creator.
@Service("clinicHoldBackService")
class ClinicHoldBackService extends BaseService {
    getSchema() {
        return EntityQueue.schema.name;
    }

    async _state() {
        const db = await this.getService('clinicSpokeService')._state();
        if (!this.tableReady) {
            await db.execute('create table if not exists received_from_peer (uuid text primary key, entity_type text not null, received_at integer not null)');
            this.tableReady = true;
        }
        return db;
    }

    _rows(result) {
        return result.rows._array || result.rows || [];
    }

    // A record this phone still has to upload stays this phone's to upload, or no phone would send it.
    async recordReceived(entityName, uuids) {
        const queued = new Set(this.findAll(EntityQueue.schema.name).slice().map((item) => item.entityUUID));
        const received = uuids.filter((uuid) => !queued.has(uuid));
        if (received.length === 0) return;
        const db = await this._state();
        const now = Date.now();
        await db.executeBatch(received.map((uuid) => [
            'insert into received_from_peer (uuid, entity_type, received_at) values (?, ?, ?) on conflict(uuid) do nothing', [uuid, entityName, now]]));
    }

    async receivedUuids() {
        const db = await this._state();
        return new Set(this._rows(await db.execute('select uuid from received_from_peer')).map((row) => row.uuid));
    }

    // Splits server-downloaded uuids into those to release, and those whose local edit must not be overwritten.
    async receivedAmong(uuids) {
        const received = await this.receivedUuids();
        const release = uuids.filter((uuid) => received.has(uuid));
        const queued = new Set(this.findAll(EntityQueue.schema.name).slice().map((item) => item.entityUUID));
        return {release, keepLocal: release.filter((uuid) => queued.has(uuid))};
    }

    async release(uuids) {
        if (_.isEmpty(uuids)) return 0;
        const db = await this._state();
        await db.executeBatch(uuids.map((uuid) => ['delete from received_from_peer where uuid = ?', [uuid]]));
        return uuids.length;
    }

    // entitiesToPost must be parents first, as pushData builds it, so a hold passes down a chain.
    async withoutHeld(entitiesToPost) {
        const received = await this.receivedUuids();
        const waitingOn = new Map();
        const toPost = entitiesToPost.map(({metaData, entities}) => ({
            metaData,
            entities: entities.filter(({resource}) => {
                const blocker = [resource.uuid, ...linkedUuids(resource)]
                    .map((uuid) => (received.has(uuid) ? uuid : waitingOn.get(uuid)))
                    .find((uuid) => !_.isNil(uuid));
                if (_.isNil(blocker)) return true;
                waitingOn.set(resource.uuid, blocker);
                return false;
            }),
        }));
        const held = entitiesToPost.flatMap(({metaData, entities}) => entities
            .filter(({resource}) => waitingOn.has(resource.uuid))
            .map(({resource}) => ({entityType: metaData.entityName, uuid: resource.uuid, waitingOn: waitingOn.get(resource.uuid)})));
        return {toPost: toPost.filter(({entities}) => entities.length > 0), held};
    }

    async getHeldUploads() {
        const queueService = this.getService('entityQueueService');
        const entitiesToPost = EntityMetaData.model().filter((md) => md.type === 'tx').reverse()
            .map((metaData) => queueService.getAllQueuedItems(metaData))
            .filter(({entities}) => entities.length > 0);
        const {held} = await this.withoutHeld(entitiesToPost);
        const heldUuids = new Set(held.map(({uuid}) => uuid));
        const oldest = _.min(this.findAll(EntityQueue.schema.name).slice()
            .filter((item) => heldUuids.has(item.entityUUID))
            .map((item) => item.savedAt));
        return {count: held.length, oldest: oldest || null, items: held};
    }
}

export default ClinicHoldBackService;
