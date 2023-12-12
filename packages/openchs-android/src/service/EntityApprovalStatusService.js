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
    ProgramEncounter,
    ProgramEnrolment
} from "openchs-models";
import _ from 'lodash';
import {DashboardReportFilter} from "../model/DashboardReportFilters";
import RealmQueryService from "./query/RealmQueryService";
import GlobalContext from "../GlobalContext";

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

    saveStatus(entityUUID, entityType, status, db, approvalStatusComment, entityTypeUuid) {
        const entityService = this.getService(EntityService);
        const approvalStatus = entityService.findByKey("status", status, ApprovalStatus.schema.name);
        const entityApprovalStatus = EntityApprovalStatus.create(entityUUID, entityType, approvalStatus, approvalStatusComment, false, entityTypeUuid);
        const savedStatus = db.create(this.getSchema(), entityApprovalStatus);
        db.create(EntityQueue.schema.name, EntityQueue.create(savedStatus, this.getSchema()));
        return savedStatus;
    }

    getAllSubjects(approvalStatus_status, reportFilters, formMapping) {
        GlobalContext.getInstance().db.setLogQueries(true);
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

    getAllEntitiesWithStatus(status, schema, filterQuery) {
        const applicableEntitiesSchema = EntityApprovalStatus.getApprovalEntitiesSchema().filter(entity => _.isEmpty(schema) ? true : entity === schema);
        const result = _.map(applicableEntitiesSchema, (schema) => {
            let entities = getEntityApprovalStatuses(this, schema, status);
            entities = _.isEmpty(filterQuery) ? entities : entities.filtered(filterQuery);
            return {title: schema, data: entities};
        });
        return {status, result};
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

    approveEntity(entity, schema) {
        this.saveEntityWithStatus(entity, schema, ApprovalStatus.statuses.Approved);
    }

    rejectEntity(entity, schema, comment) {
        this.saveEntityWithStatus(entity, schema, ApprovalStatus.statuses.Rejected, comment);
    }

    createPendingStatus(entity, schema, db, entityTypeUuid) {
        const entityApprovalStatus = this.saveStatus(entity.uuid, this._getEntityTypeForSchema(schema), ApprovalStatus.statuses.Pending, db, null, entityTypeUuid);
        this._addUpdateApprovalStatus(entity, entityApprovalStatus);
    }

    saveEntityWithStatus(entity, schema, status, comment) {
        const db = this.db;
        const entityTypeUuid = this._getEntityTypeUuid(entity, schema);

        this.db.write(() => {
            this._addUpdateApprovalStatus(entity, this.saveStatus(entity.uuid, this._getEntityTypeForSchema(schema), status, db, comment, entityTypeUuid));
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

    _getEntityTypeForSchema(passedSchema) {
        return _.get(_.find(EntityApprovalStatus.getSchemaEntityTypeList(), ({schema}) => schema === passedSchema), 'entityType');
    }
}

export default EntityApprovalStatusService;

