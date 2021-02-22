import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import OrganisationConfigService from "./OrganisationConfigService";
import EntityService from "./EntityService";
import {
    ApprovalStatus,
    ChecklistItem,
    Encounter,
    EntityApprovalStatus,
    EntityQueue,
    Individual,
    ProgramEncounter,
    ProgramEnrolment,
} from "avni-models";

@Service("entityApprovalStatusService")
class EntityApprovalStatusService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.enableApprovalWorkflow = this.getService(OrganisationConfigService).getSettings().enableApprovalWorkflow;
    }

    getSchema() {
        return EntityApprovalStatus.schema.name;
    }

    saveStatus(entityUUID, entityType, status, db, approvalStatusComment) {
        if (!this.enableApprovalWorkflow) {
            return null;
        }
        const approvalStatus = this.getService(EntityService).findByKey("status", status, ApprovalStatus.schema.name);
        const entityApprovalStatus = EntityApprovalStatus.create(entityUUID, entityType, approvalStatus, approvalStatusComment);
        const savedStatus = db.create(this.getSchema(), entityApprovalStatus);
        db.create(EntityQueue.schema.name, EntityQueue.create(savedStatus, this.getSchema()));
        return savedStatus;
    }

    getAllEntitiesWithStatus(status) {
        const entityWithApprovalWorkflow = [
            Individual.schema.name,
            ProgramEnrolment.schema.name,
            Encounter.schema.name,
            ProgramEncounter.schema.name,
            ChecklistItem.schema.name
        ];
        const result = _.map(entityWithApprovalWorkflow, (schema) => {
            const entities = this.getAll(schema)
                .filtered(schema === ChecklistItem.schema.name ? 'uuid <> null' : 'voided = false')
                .filtered(`latestEntityApprovalStatus.approvalStatus.status = $0`, status);
            return {title: schema, data: entities};
        });
        return {status, result};
    }

    approveEntity(entity, schema) {
        this.saveEntityWithStatus(entity, schema, ApprovalStatus.statuses.Approved);
    }

    rejectEntity(entity, schema, comment) {
        this.saveEntityWithStatus(entity, schema, ApprovalStatus.statuses.Rejected, comment);
    }

    createPendingStatus(entityUUID, schema, db) {
        return this.saveStatus(entityUUID, this._getEntityTypeForSchema(schema), ApprovalStatus.statuses.Pending, db);
    }

    saveEntityWithStatus(entity, schema, status, comment) {
        const db = this.db;
        this.db.write(() => {
            entity.latestEntityApprovalStatus = this.saveStatus(entity.uuid, this._getEntityTypeForSchema(schema), status, db, comment);
            db.create(schema, entity, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(entity, schema));
        });
    }

    _getEntityTypeForSchema(schema) {
        const schemaToEntityTypeMap = {
            [Individual.schema.name]: EntityApprovalStatus.entityType.Subject,
            [ProgramEnrolment.schema.name]: EntityApprovalStatus.entityType.ProgramEnrolment,
            [Encounter.schema.name]: EntityApprovalStatus.entityType.Encounter,
            [ProgramEncounter.schema.name]: EntityApprovalStatus.entityType.ProgramEncounter,
            [ChecklistItem.schema.name]: EntityApprovalStatus.entityType.ChecklistItem
        };
        return schemaToEntityTypeMap[schema];
    }

}

export default EntityApprovalStatusService;

