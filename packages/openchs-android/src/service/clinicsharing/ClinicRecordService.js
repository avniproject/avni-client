import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {EntityMetaData, EntityQueue} from 'openchs-models';
import _ from "lodash";
import EntityService from "../EntityService";
import PrivilegeService from "../PrivilegeService";
import SyncService from "../SyncService";
import {SHAREABLE_ENTITIES} from "../../framework/clinicsharing/ClinicSharingConstants";

const txMetaDataParentsFirst = () => EntityMetaData.model().filter((md) => md.type === 'tx').reverse();

export const parentsFirstIndex = (entityName) => {
    const index = txMetaDataParentsFirst().findIndex((md) => md.entityName === entityName);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

// fromResource reads reference uuids from _links.<key>.href; toResource writes flat <key> fields,
// and the server renames some keys between the two formats (approvals even use lowercase "Uuid").
const LINK_KEY_ALIASES = {
    Individual: {addressLevelUUID: 'addressUUID'},
    Comment: {subjectUUID: 'individualUUID'},
    EntityApprovalStatus: {approvalStatusUuid: 'approvalStatusUUID', entityUuid: 'entityUUID'},
};

// Saves records that came from another phone, on the hub and on phones alike.
@Service("clinicRecordService")
class ClinicRecordService extends BaseService {
    getSchema() {
        return EntityQueue.schema.name;
    }

    // toResource is the upload format; the receiving fromResource also needs what the server adds on download.
    toSharedResource(entityName, entity) {
        const resource = entity.toResource;
        if (entityName === 'Comment') {
            return {...resource, displayUsername: entity.displayUsername, createdBy: entity.createdByUsername,
                createdDateTime: entity.createdDateTime, lastModifiedDateTime: entity.lastModifiedDateTime};
        }
        return resource;
    }

    _adaptResource(entityName, resource) {
        const adapted = _.cloneDeep(resource);
        adapted._links = adapted._links || {};
        const aliases = LINK_KEY_ALIASES[entityName] || {};
        Object.keys(adapted).forEach((key) => {
            if (_.isString(adapted[key]) && (/UUID$/.test(key) || aliases[key])) {
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

    // Approvals are queued under one name, but only their per-type metadata names the parent whose
    // latest approval applyIncoming has to refresh.
    _metaDataGroups(batch) {
        if (batch.entityName !== 'EntityApprovalStatus') return [[EntityMetaData.findByName(batch.entityName), batch.resources]];
        return _.toPairs(_.groupBy(batch.resources, 'entityType')).map(([entityType, resources]) =>
            [EntityMetaData.findByName(`${entityType}EntityApprovalStatus`) || EntityMetaData.findByName(batch.entityName), resources]);
    }

    async applyBatches(batches, log) {
        if (!this.db.isSqlite) {
            log('hub sync needs the SQLite database; nothing applied');
            return 0;
        }
        const ordered = _.sortBy(batches, (batch) => parentsFirstIndex(batch.entityName));
        let total = 0;
        for (const batch of ordered) {
            if (!SHAREABLE_ENTITIES.includes(batch.entityName)) continue;
            for (const [metaData, resources] of this._metaDataGroups(batch)) {
                total += await this._applyGroup(batch.entityName, metaData, resources, log);
            }
        }
        return total;
    }

    async _applyGroup(entityName, metaData, resources, log) {
        const entityService = this.getService(EntityService);
        const entityResources = resources.map((r) => this._adaptResource(entityName, r));
        const built = [];
        for (const resource of entityResources) {
            try {
                built.push({resource, entity: metaData.entityClass.fromResource(resource, entityService, entityResources)});
            } catch (error) {
                log(`skip ${entityName} ${resource.uuid}: ${error.message}`);
            }
        }
        const permitted = this.getService(PrivilegeService).onlyViewableEntities(metaData.schemaName, built.map(({entity}) => entity));
        const kept = built.filter(({entity}) => permitted.includes(entity));
        if (kept.length < built.length) log(`dropped ${built.length - kept.length} ${entityName} outside this user's privileges`);
        if (kept.length === 0) return 0;

        await this.getService(SyncService).applyIncoming(metaData, kept.map(({resource}) => resource), kept.map(({entity}) => entity));
        log(`applied ${kept.length} ${entityName}`);
        return kept.length;
    }
}

export default ClinicRecordService;
