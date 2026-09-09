import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import {
    ApprovalStatus,
    BaseEntity,
    ChecklistItem,
    Encounter,
    EntityApprovalStatus,
    EntityQueue, Form,
    Individual,
    ObservationsHolder,
    ProgramEncounter,
    ProgramEnrolment
} from "openchs-models";
import _ from 'lodash';
import {DashboardReportFilter} from "../model/DashboardReportFilter";
import RealmQueryService from "./query/RealmQueryService";

function getEntityApprovalStatuses(service, schema, status) {
    return service.getAll(schema)
        .filtered(service.getVoidedQuery(schema))
        .filtered(`latestEntityApprovalStatus.approvalStatus.status = $0`, status);
}

function getEntityTypeQuery(formMapping, matchingFormTypes, entityTypePath, formMappingEntityTypeUUIDPath) {
    if (_.isNil(formMapping)) return "uuid <> null";
    if (matchingFormTypes.includes(formMapping.form.formType)) return `${entityTypePath}.uuid = "${_.get(formMapping, formMappingEntityTypeUUIDPath)}"`;
    return "uuid = null";
}

function getChecklistItemQuery(formMapping) {
    if (_.isNil(formMapping) || formMapping.form.formType === Form.formTypes.ChecklistItem) return "$checklistItem.uuid <> null";
    return "$checklistItem.uuid = null";
}

@Service("entityApprovalStatusService")
class EntityApprovalStatusService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
    }

    getSchema() {
        return EntityApprovalStatus.schema.name;
    }

    /**
     * observations carries the answers given on the Approval or Rejection form, and is trailing and
     * defaulted so every existing caller is unaffected - createPendingStatus in particular, which runs on
     * every registration and encounter in an approval-enabled organisation and never has answers.
     */
    saveStatus(entityUUID, entityType, status, db, approvalStatusComment, entityTypeUuid, observations = []) {
        const entityService = this.getService(EntityService);
        const approvalStatus = entityService.findByKey("status", status, ApprovalStatus.schema.name);
        // An answer given on the form holds its value as an object until it is saved - a coded multi-select
        // as MultipleCodedValues, a primitive as PrimitiveValue - while Realm's valueJSON is a string. Every
        // other service that persists observations converts them first; without it Realm rejects the write
        // with "Expected 'observations[0]' to be a string". Harmless for the callers that pass none.
        ObservationsHolder.convertObsForSave(observations);
        const entityApprovalStatus = EntityApprovalStatus.create(entityUUID, entityType, approvalStatus, approvalStatusComment, false, entityTypeUuid, observations);
        const savedStatus = db.create(this.getSchema(), entityApprovalStatus);
        db.create(EntityQueue.schema.name, EntityQueue.create(savedStatus, this.getSchema()));
        return savedStatus;
    }

    getAllSubjects(approvalStatus_status, reportFilters, formMapping) {
        const {
            IndividualProfile,
            ProgramEnrolment,
            ProgramExit,
            Encounter,
            ProgramEncounter,
            ProgramEncounterCancellation,
            IndividualEncounterCancellation
        } = Form.formTypes;
        const addressFilter = DashboardReportFilter.getAddressFilter(reportFilters);
        let entities = RealmQueryService.filterBasedOnAddress(Individual.schema.name, this.getAll(Individual.schema.name), addressFilter);
        entities = entities.filtered(
            `(latestEntityApprovalStatus.approvalStatus.status = $0 and voided = false and ${getEntityTypeQuery(formMapping, [IndividualProfile], "subjectType", "subjectType.uuid")}) 
        
            or (voided = false and subquery(enrolments, $enrolment, $enrolment.latestEntityApprovalStatus.approvalStatus.status = $1 and $enrolment.voided = false and ${getEntityTypeQuery(formMapping, [ProgramEnrolment, ProgramExit], "$enrolment.program", "entityUUID")}).@count > 0)
              
            or (voided = false and subquery(encounters, $encounter, $encounter.latestEntityApprovalStatus.approvalStatus.status = $2 and $encounter.voided = false and ${getEntityTypeQuery(formMapping, [Encounter, IndividualEncounterCancellation], "$encounter.encounterType", "observationsTypeEntityUUID")}).@count > 0)
            
            or (voided = false and subquery(enrolments.encounters, $encounter, $encounter.programEnrolment.voided = false and $encounter.latestEntityApprovalStatus.approvalStatus.status = $3 and $encounter.voided = false and ${getEntityTypeQuery(formMapping, [ProgramEncounter, ProgramEncounterCancellation], "$encounter.encounterType", "observationsTypeEntityUUID")}).@count > 0)
            
            or (voided = false and subquery(enrolments.checklists.items, $checklistItem, $checklistItem.latestEntityApprovalStatus.approvalStatus.status = $4 and ${getChecklistItemQuery(formMapping)}).@count > 0) 
            
            SORT(firstName ASC)`,
            approvalStatus_status, approvalStatus_status, approvalStatus_status, approvalStatus_status, approvalStatus_status);
        return entities;
    }

    getAllEntitiesForReports(approvalStatus_status, reportFilters) {
        const applicableEntitiesSchema = EntityApprovalStatus.getApprovalEntitiesSchema();
        const result = _.map(applicableEntitiesSchema, (schema) => {
            let entities = getEntityApprovalStatuses(this, schema, approvalStatus_status);
            const addressFilter = DashboardReportFilter.getAddressFilter(reportFilters);
            entities = RealmQueryService.filterBasedOnAddress(schema, entities, addressFilter)
            return {title: schema, data: entities};
        });
        return {status: approvalStatus_status, result};
    }

    getVoidedQuery(schema) {
        switch (schema) {
            case Individual.schema.name:
                return 'voided = false';
            case ProgramEnrolment.schema.name:
            case Encounter.schema.name:
                return 'voided = false and individual.voided = false';
            case ProgramEncounter.schema.name:
                return 'voided = false and programEnrolment.voided = false and programEnrolment.individual.voided = false';
            case ChecklistItem.schema.name:
                return 'checklist.programEnrolment.voided = false';
        }
    }

    approveEntity(entity, schema, observations = []) {
        this.saveEntityWithStatus(entity, schema, ApprovalStatus.statuses.Approved, null, observations);
    }

    rejectEntity(entity, schema, comment, observations = []) {
        this.saveEntityWithStatus(entity, schema, ApprovalStatus.statuses.Rejected, comment, observations);
    }

    /**
     * Replaces the answers on a decision that has already been recorded, leaving the decision itself
     * alone (avniproject/avni-client#2093).
     *
     * The status and the moment it was taken do not move. An approver correcting a mistyped figure has
     * not approved the record a second time, and writing a second Approved row would put two approvals in
     * the record's history for one decision - and, because the current status is the latest row by
     * statusDateTime, would silently re-date the approval as well.
     *
     * The row is pushed by uuid, which the server upserts, so the correction reaches every other device
     * as an update to the same decision rather than as a new one.
     */
    updateDecisionAnswers(entityApprovalStatus, observations = []) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(observations);
        this.db.write(() => {
            // The stored row is fetched and its answers assigned, rather than a partial object being
            // upserted over it. Assignment cannot touch the status, its date, or the audit fields even by
            // accident, and it needs no reasoning about which update mode allows a partial write.
            const storedDecision = db.objectForPrimaryKey(this.getSchema(), entityApprovalStatus.uuid);
            if (_.isNil(_.get(storedDecision, 'uuid'))) {
                throw new Error(`No approval decision ${entityApprovalStatus.uuid} to correct. Refusing to write the answers somewhere else.`);
            }
            storedDecision.observations = observations;
            db.create(EntityQueue.schema.name, EntityQueue.create(storedDecision, this.getSchema()));
        });
    }

    createPendingStatus(entity, schema, db, entityTypeUuid) {
        const entityApprovalStatus = this.saveStatus(entity.uuid, this.getEntityTypeForSchema(schema), ApprovalStatus.statuses.Pending, db, null, entityTypeUuid);
        this._addUpdateApprovalStatus(entity, entityApprovalStatus);
    }

    /**
     * The single save path for both flows - the mapped form and the comment box. Keeping them converged
     * here is deliberate: a separate path for the form case would drift from this one, and this is where
     * the approval decision, the record, and both EntityQueue rows are written in one Realm transaction.
     * An exception mid-write rolls all of it back, so a failed save looks like nothing happened rather
     * than a partial sync.
     */
    saveEntityWithStatus(entity, schema, status, comment, observations = []) {
        const db = this.db;
        const entityTypeUuid = this._getEntityTypeUuid(entity, schema);

        this.db.write(() => {
            this._addUpdateApprovalStatus(entity, this.saveStatus(entity.uuid, this.getEntityTypeForSchema(schema), status, db, comment, entityTypeUuid, observations));
            db.create(schema, entity, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(entity, schema));
        });
    }

    _addUpdateApprovalStatus(entity, approvalStatus) {
        if (!BaseEntity.collectionHasEntity(entity.approvalStatuses, approvalStatus)) {
            entity.approvalStatuses.push(approvalStatus);
        }
        entity.setLatestEntityApprovalStatus(_.maxBy(entity.approvalStatuses, 'statusDateTime'));
    }

    _getEntityTypeUuid(entity, schema) {
        switch (schema) {
            case(Individual.schema.name) :
                return _.get(entity, 'subjectType.uuid');
            case(ProgramEnrolment.schema.name) :
                return _.get(entity, 'program.uuid');
            case(Encounter.schema.name) :
            case(ProgramEncounter.schema.name) :
                return _.get(entity, 'encounterType.uuid');
            case(ChecklistItem.name):
                return _.get(entity, 'checklist.programEnrolment.program.uuid');
            default :
                return null;
        }
    }

    // Public: ApprovalFormActions needs the same schema-to-entity-type mapping when it builds the
    // unsaved decision behind an Approval or Rejection form, so this is part of the service's contract
    // rather than an internal helper.
    getEntityTypeForSchema(passedSchema) {
        return _.get(_.find(EntityApprovalStatus.getSchemaEntityTypeList(), ({schema}) => schema === passedSchema), 'entityType');
    }
}

export default EntityApprovalStatusService;

