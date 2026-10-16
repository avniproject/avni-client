import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {EntityQueue} from 'openchs-models';
import _ from "lodash";
import General from "../../utility/General";
import ErrorUtil from "../../framework/errorHandling/ErrorUtil";
import ClinicRecordService, {parentsFirstIndex} from "./ClinicRecordService";

// Keys are the shared (toResource) format; a /UUID$/ match would also catch reference data.
const PARENTS = {
    Encounter: [['individualUUID', 'Individual']],
    ProgramEnrolment: [['individualUUID', 'Individual']],
    ProgramEncounter: [['programEnrolmentUUID', 'ProgramEnrolment']],
    Checklist: [['programEnrolmentUUID', 'ProgramEnrolment']],
    ChecklistItem: [['checklistUUID', 'Checklist']],
    IndividualRelationship: [['individualAUUID', 'Individual'], ['individualBUUID', 'Individual']],
    GroupSubject: [['groupSubjectUUID', 'Individual'], ['memberSubjectUUID', 'Individual']],
    Comment: [['subjectUUID', 'Individual'], ['commentThreadUUID', 'CommentThread']],
    SubjectProgramEligibility: [['subjectUUID', 'Individual']],
    Session: [['groupSubjectUUID', 'Individual']],
    AttendanceRecord: [['sessionUUID', 'Session'], ['subjectUUID', 'Individual']],
};
const APPROVED_SCHEMA = {
    Subject: 'Individual', ProgramEnrolment: 'ProgramEnrolment', ProgramEncounter: 'ProgramEncounter',
    Encounter: 'Encounter', ChecklistItem: 'ChecklistItem',
};
export const ORPHAN_REPORT_SOURCE = 'ClinicSharingOrphan';

const rowsOf = (result) => result.rows._array || result.rows || [];

// Applied without its parent, a record is saved with no parent link, which the parent arriving later never restores.
@Service("clinicParkedRecordService")
class ClinicParkedRecordService extends BaseService {
    getSchema() {
        return EntityQueue.schema.name;
    }

    _state() {
        const db = this.getService('clinicSpokeService')._stateSync();
        if (!this.tablesReady) {
            db.executeSync(`create table if not exists parked_records (
                uuid text primary key,
                entity_name text not null,
                resource text not null,
                origin text,
                parked_at integer not null,
                reported integer not null default 0)`);
            db.executeSync('create table if not exists not_viewable (uuid text primary key)');
            this.tablesReady = true;
        }
        return db;
    }

    parentsOf(entityName, resource) {
        const parents = entityName === 'EntityApprovalStatus'
            ? [{uuid: resource.entityUuid, schema: APPROVED_SCHEMA[resource.entityType]}]
            : (PARENTS[entityName] || []).map(([key, schema]) => ({uuid: resource[key], schema}));
        return parents.filter(({uuid, schema}) => _.isString(uuid) && !_.isNil(schema));
    }

    _missingParents(entityName, resource) {
        return this.parentsOf(entityName, resource).filter(({uuid, schema}) => _.isNil(this.findByKey('uuid', uuid, schema)));
    }

    // Children of a record this user may not view are dropped with it, so they are never reported as orphans.
    async withParentsPresent(entityName, resources, origin) {
        const db = this._state();
        const notViewable = new Set(rowsOf(db.executeSync('select uuid from not_viewable')).map((row) => row.uuid));
        const ready = [];
        const parked = [];
        const dropped = [];
        resources.forEach((resource) => {
            const parents = this.parentsOf(entityName, resource);
            if (parents.some(({uuid}) => notViewable.has(uuid))) dropped.push(resource.uuid);
            else if (this._missingParents(entityName, resource).length > 0) parked.push(resource);
            else ready.push(resource);
        });
        const commands = [
            ...this._parkCommands(entityName, parked, origin),
            ...dropped.flatMap((uuid) => [
                ['insert into not_viewable (uuid) values (?) on conflict(uuid) do nothing', [uuid]],
                ['delete from parked_records where uuid = ?', [uuid]],
            ]),
        ];
        if (commands.length > 0) await db.executeBatch(commands);
        return {ready, parked: parked.length, dropped: dropped.length};
    }

    _parkCommands(entityName, resources, origin) {
        const now = Date.now();
        return resources.map((resource) => ['insert into parked_records (uuid, entity_name, resource, origin, parked_at) values (?, ?, ?, ?, ?) on conflict(uuid) do update set resource = excluded.resource',
            [resource.uuid, entityName, JSON.stringify(resource), origin || null, now]]);
    }

    // The sender was already told it arrived, so a record this phone cannot build yet, say for a form it lacks, must not be lost.
    async park(entityName, resources, origin) {
        if (_.isEmpty(resources)) return;
        await this._state().executeBatch(this._parkCommands(entityName, resources, origin));
    }

    async markNotViewable(uuids) {
        if (_.isEmpty(uuids)) return;
        await this._state().executeBatch(uuids.map((uuid) => ['insert into not_viewable (uuid) values (?) on conflict(uuid) do nothing', [uuid]]));
    }

    async unpark(uuids) {
        if (_.isEmpty(uuids)) return;
        await this._state().executeBatch(uuids.map((uuid) => ['delete from parked_records where uuid = ?', [uuid]]));
    }

    _parkedRows() {
        return rowsOf(this._state().executeSync('select uuid, entity_name, resource, origin, parked_at, reported from parked_records'));
    }

    async _retry(log) {
        const rows = this._parkedRows();
        let appliedCount = 0;
        for (const [origin, originRows] of _.toPairs(_.groupBy(rows, (row) => row.origin || ''))) {
            const batches = _.sortBy(_.toPairs(_.groupBy(originRows, 'entity_name')), ([entityName]) => parentsFirstIndex(entityName))
                .map(([entityName, entityRows]) => ({entityName, resources: entityRows.map((row) => JSON.parse(row.resource))}));
            await this.getService(ClinicRecordService).applyBatches(batches, log, origin || undefined);
            const stillParked = new Set(this._parkedRows().map((row) => row.uuid));
            const applied = batches.map(({entityName, resources}) => ({entityName, resources: resources.filter(({uuid}) => !stillParked.has(uuid))}))
                .filter(({resources}) => resources.length > 0);
            appliedCount += _.sumBy(applied, ({resources}) => resources.length);
            // Phones whose hub cursor has passed the record's first ledger row still need it.
            if (origin && applied.length > 0) await this.getService('clinicHubService')._appendLedgerRows(applied, origin);
        }
        return appliedCount;
    }

    _report(rows) {
        rows.forEach((row) => {
            const missing = this._missingParents(row.entity_name, JSON.parse(row.resource))
                .map(({schema, uuid}) => `${schema} ${uuid}`).join(', ');
            const problem = missing ? `is still missing its parent ${missing}` : 'still could not be applied on this phone';
            const error = new Error(`${ORPHAN_REPORT_SOURCE}: ${row.entity_name} ${row.uuid} ${problem}`);
            General.logError(ORPHAN_REPORT_SOURCE, error);
            ErrorUtil.notifyBugsnag(error, ORPHAN_REPORT_SOURCE);
        });
    }

    // Only records parked before this sync began are reported; one a sync ahead of its parent gets the next sync to catch up.
    async afterSync(syncStartedAt, log = _.noop) {
        const applied = await this._retry(log);
        const orphans = this._parkedRows().filter((row) => row.parked_at < syncStartedAt && !row.reported);
        if (orphans.length > 0) {
            this._report(orphans);
            await this._state().executeBatch(orphans.map((row) => ['update parked_records set reported = 1 where uuid = ?', [row.uuid]]));
        }
        return {applied, reported: orphans.length};
    }
}

export default ClinicParkedRecordService;
