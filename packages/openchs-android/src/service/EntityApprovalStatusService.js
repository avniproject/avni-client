import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import OrganisationConfigService from "./OrganisationConfigService";
import EntityService from "./EntityService";
import {
    ApprovalStatus,
    EntityApprovalStatus,
    EntityQueue,
    Individual,
    ProgramEnrolment,
    Encounter,
    ProgramEncounter,
    ChecklistItem,
} from "avni-models";

@Service("entityApprovalStatusService")
class EntityApprovalStatusService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.organisationConfigService = this.getService(OrganisationConfigService);
        this.enableApprovalWorkflow = true; //TODO: read from org config
    }

    getSchema() {
        return EntityApprovalStatus.schema.name;
    }

    saveStatus(entityUUID, entityType, status, db) {
        if (!this.enableApprovalWorkflow) {
            return null;
        }
        const approvalStatus = this.getService(EntityService).findByKey("status", status, ApprovalStatus.schema.name);
        const entityApprovalStatus = EntityApprovalStatus.create(entityUUID, entityType, approvalStatus);
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


}

export default EntityApprovalStatusService;

