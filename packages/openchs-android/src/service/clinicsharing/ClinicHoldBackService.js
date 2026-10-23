import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {EntityMetaData, EntityQueue} from 'openchs-models';
import _ from "lodash";
import General from "../../utility/General";
import ErrorUtil from "../../framework/errorHandling/ErrorUtil";
import {HELD_UPLOAD_WARNING_DAYS} from "../../framework/clinicsharing/ClinicSharingConstants";

export const HELD_UPLOAD_REPORT_SOURCE = 'ClinicSharingHeldUpload';
const DAY_MS = 24 * 60 * 60 * 1000;

const linkedUuids = (resource) => _.compact(_.map(resource, (value, key) => (/uuid$/i.test(key) && _.isString(value) ? value : null)));

// The server refuses a child before its parent and credits the first uploader as creator, so these wait for it.
@Service("clinicHoldBackService")
class ClinicHoldBackService extends BaseService {
    getSchema() {
        return EntityQueue.schema.name;
    }

    async _state() {
        const db = await this.getService('clinicSpokeService')._state();
        if (!this.tableReady) {
            await db.execute('create table if not exists received_from_peer (uuid text primary key, entity_type text not null, received_at integer not null)');
            await db.execute('create table if not exists held_reported (uuid text primary key)');
            this.tableReady = true;
        }
        return db;
    }

    _rows(result) {
        return result.rows._array || result.rows || [];
    }

    // A record this phone still has to upload stays this phone's to upload, or no phone would send it.
    async recordReceived(entityName, uuids) {
        // Nothing links to an approval, and the server drops one repeating the latest status, so it would never come down.
        if (entityName === 'EntityApprovalStatus') return;
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
    _waitingOn(entitiesToPost, received) {
        const waitingOn = new Map();
        entitiesToPost.forEach(({entities}) => entities.forEach(({resource}) => {
            const blocker = [resource.uuid, ...linkedUuids(resource)]
                .map((uuid) => (received.has(uuid) ? uuid : waitingOn.get(uuid)))
                .find((uuid) => !_.isNil(uuid));
            if (!_.isNil(blocker)) waitingOn.set(resource.uuid, blocker);
        }));
        return waitingOn;
    }

    async withoutHeld(entitiesToPost) {
        const waitingOn = this._waitingOn(entitiesToPost, await this.receivedUuids());
        const toPost = entitiesToPost.map(({metaData, entities}) => ({
            metaData,
            entities: entities.filter(({resource}) => !waitingOn.has(resource.uuid)),
        }));
        const held = entitiesToPost.flatMap(({metaData, entities}) => entities
            .filter(({resource}) => waitingOn.has(resource.uuid))
            .map(({resource}) => ({entityType: metaData.entityName, uuid: resource.uuid, waitingOn: waitingOn.get(resource.uuid)})));
        return {toPost: toPost.filter(({entities}) => entities.length > 0), held};
    }

    // Held uploads safe to try before a reset: the server refuses one whose parent it lacks.
    // An edit of another phone's record is left out, as the server would credit this user with creating it.
    async heldToTry(entitiesToPost) {
        const waitingOn = this._waitingOn(entitiesToPost, await this.receivedUuids());
        // A hold rooted in a record this phone is itself uploading is an edit of another phone's record, or depends on one.
        const queued = new Set(entitiesToPost.flatMap(({entities}) => entities.map(({resource}) => resource.uuid)));
        return entitiesToPost.map(({metaData, entities}) => ({
            metaData,
            entities: entities.filter(({resource}) => waitingOn.has(resource.uuid) && !queued.has(waitingOn.get(resource.uuid))),
        })).filter(({entities}) => entities.length > 0);
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

    // The same mark as the clinic sharing screen's warning, so support sees a phone stuck behind a teammate's lost phone. Once per record.
    async reportLongWaiting(now) {
        const {items} = await this.getHeldUploads();
        if (items.length === 0) return 0;
        const firstSavedAt = _.mapValues(_.groupBy(this.findAll(EntityQueue.schema.name).slice(), 'entityUUID'),
            (rows) => _.min(rows.map((row) => new Date(row.savedAt).getTime())));
        const db = await this._state();
        const reported = new Set(this._rows(await db.execute('select uuid from held_reported')).map((row) => row.uuid));
        const due = items.filter(({uuid}) => !reported.has(uuid) && now - firstSavedAt[uuid] >= HELD_UPLOAD_WARNING_DAYS * DAY_MS);
        due.forEach(({entityType, uuid, waitingOn}) => {
            const error = new Error(`${HELD_UPLOAD_REPORT_SOURCE}: ${entityType} ${uuid} has waited ${HELD_UPLOAD_WARNING_DAYS} days for ${waitingOn}`);
            General.logError(HELD_UPLOAD_REPORT_SOURCE, error);
            ErrorUtil.notifyBugsnag(error, HELD_UPLOAD_REPORT_SOURCE);
        });
        if (due.length > 0) await db.executeBatch(due.map(({uuid}) => ['insert into held_reported (uuid) values (?) on conflict(uuid) do nothing', [uuid]]));
        return due.length;
    }
}

export default ClinicHoldBackService;
