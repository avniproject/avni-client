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

    getAllEntitiesWithStatus(status, schema, filterQuery) {
        const applicableEntitiesSchema = EntityApprovalStatus.getApprovalEntitiesSchema().filter(entity => _.isEmpty(schema) ? true : entity === schema);
        const result = _.map(applicableEntitiesSchema, (schema) => {
            const entities = this.getAll(schema)
                .filtered(this.getVoidedQuery(schema))
                .filtered(`latestEntityApprovalStatus.approvalStatus.status = $0`, status)
                .filtered(_.isEmpty(filterQuery) ? 'uuid <> null' : filterQuery)
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
        entity.addUpdateApprovalStatus(entityApprovalStatus);
    }

    saveEntityWithStatus(entity, schema, status, comment) {
        const db = this.db;
        const entityTypeUuid = this._getEntityTypeUuid(entity, schema);

        this.db.write(() => {
            entity.addUpdateApprovalStatus(this.saveStatus(entity.uuid, this._getEntityTypeForSchema(schema), status, db, comment, entityTypeUuid));
            db.create(schema, entity, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(entity, schema));
        });
    }

    _getEntityTypeUuid(entity, schema) {
        switch (schema) {
            case(Individual.schema.name) : return _.get(entity, 'subjectType.uuid');
            case(ProgramEnrolment.schema.name) : return _.get(entity, 'program.uuid');
            case(Encounter.schema.name) :
            case(ProgramEncounter.schema.name) :
                return _.get(entity, 'encounterType.uuid');
            case(ChecklistItem.name): return _.get(entity, 'checklist.programEnrolment.program.uuid');
            default : return null;
        }
    }

    _getEntityTypeForSchema(passedSchema) {
        return _.get(_.find(EntityApprovalStatus.getSchemaEntityTypeList(), ({schema}) => schema === passedSchema), 'entityType');
    }
}

export default EntityApprovalStatusService;

