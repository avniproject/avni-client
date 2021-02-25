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
import _ from 'lodash';

@Service("entityApprovalStatusService")
class EntityApprovalStatusService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    init() {}

    getSchema() {
        return EntityApprovalStatus.schema.name;
    }

    saveStatus(entityUUID, entityType, status, db, approvalStatusComment) {
        const enableApprovalWorkflow = this.getService(OrganisationConfigService).getSettings().enableApprovalWorkflow;
        if (!enableApprovalWorkflow) {
            return null;
        }
        const approvalStatus = this.getService(EntityService).findByKey("status", status, ApprovalStatus.schema.name);
        const entityApprovalStatus = EntityApprovalStatus.create(entityUUID, entityType, approvalStatus, approvalStatusComment);
        const savedStatus = db.create(this.getSchema(), entityApprovalStatus);
        db.create(EntityQueue.schema.name, EntityQueue.create(savedStatus, this.getSchema()));
        return savedStatus;
    }

    getAllEntitiesWithStatus(status, schema, filterQuery) {
        const entityWithApprovalWorkflow = [
            Individual.schema.name,
            ProgramEnrolment.schema.name,
            Encounter.schema.name,
            ProgramEncounter.schema.name,
            ChecklistItem.schema.name
        ];
        const applicableEntities = entityWithApprovalWorkflow.filter(entity => _.isEmpty(schema) ? true : entity === schema);
        const result = _.map(applicableEntities, (schema) => {
            const entities = this.getAll(schema)
                .filtered(schema === ChecklistItem.schema.name ? 'uuid <> null' : 'voided = false')
                .filtered(`latestEntityApprovalStatus.approvalStatus.status = $0`, status)
                .filtered(_.isEmpty(filterQuery) ? 'uuid <> null' : filterQuery);
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

    _getEntityTypeForSchema(passedSchema) {
        return _.get(_.find(EntityApprovalStatus.getSchemaEntityTypeList(), ({schema}) => schema === passedSchema), 'entityType');
    }

    _getSchemaForEntityType(passedEntityType) {
        return _.get(_.find(EntityApprovalStatus.getSchemaEntityTypeList(), ({entityType}) => entityType === passedEntityType), 'schema');
    }
}

export default EntityApprovalStatusService;

