import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import OrganisationConfigService from "./OrganisationConfigService";
import EntityService from "./EntityService";
import {ApprovalStatus, EntityApprovalStatus} from "avni-models";

@Service("entityApprovalStatusService")
class EntityApprovalStatusService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.organisationConfigService = this.getService(OrganisationConfigService);
        this.enableApprovalWorkflow = true; //TODO: read from org config
    }

    saveStatus(entityUUID, entityType, status, db) {
        if (!this.enableApprovalWorkflow) {
            return null;
        }
        const approvalStatus = this.getService(EntityService).findByKey("status", status, ApprovalStatus.schema.name);
        const entityApprovalStatus = EntityApprovalStatus.create(entityUUID, entityType, approvalStatus);
        return db.create(EntityApprovalStatus.schema.name, entityApprovalStatus);
    }


}

export default EntityApprovalStatusService;

