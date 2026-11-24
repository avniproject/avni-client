import General from "../utility/General";
import moment from "moment";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";
import GlobalContext from "../GlobalContext";

const DRAFT_SERVICES = [
    {serviceName: "draftSubjectService", draftType: "DraftSubject", deleteByUUID: (service, uuid) => service.deleteDraftSubjectByUUID(uuid)},
    {serviceName: "draftEncounterService", draftType: "DraftEncounter", deleteByUUID: (service, uuid) => service.deleteDraftByUUID(uuid)},
    {serviceName: "draftEnrolmentService", draftType: "DraftEnrolment", deleteByUUID: (service, uuid) => service.deleteDraftByUUID(uuid)},
    {serviceName: "draftProgramEncounterService", draftType: "DraftProgramEncounter", deleteByUUID: (service, uuid) => service.deleteDraftByUUID(uuid)},
];

class DeleteDrafts extends BaseTask {
    deleteOldDrafts(beanRegistry, {serviceName, draftType, deleteByUUID}, ttlDate) {
        const service = beanRegistry.getService(serviceName);
        // Collected before deleting: Realm results are live and shrink as drafts go.
        const uuids = service.findAll().filtered('updatedOn <= $0', ttlDate).map(draft => draft.uuid);
        General.logInfo("DeleteDrafts", `Found ${uuids.length} ${draftType} records to delete`);
        uuids.forEach(uuid => {
            try {
                deleteByUUID(service, uuid);
            } catch (e) {
                General.logError("DeleteDrafts", `Could not delete ${draftType} ${uuid}: ${e.message}`);
                ErrorHandler.postScheduledJobError(e);
            }
        });
    }

    async execute() {
        try {
            await this.initDependencies();

            General.logInfo("DeleteDrafts", "Starting DeleteDrafts");
            const ttl = 30;
            const ttlDate = moment().subtract(ttl, 'days').endOf('day').toDate();
            General.logInfo("DeleteDrafts", `Deleting older drafts before ${ttlDate}`);
            // GlobalContext.db is always Realm; the registry's services are bound to the active backend.
            const beanRegistry = GlobalContext.getInstance().beanRegistry;
            DRAFT_SERVICES.forEach(draftService => this.deleteOldDrafts(beanRegistry, draftService, ttlDate));

            General.logInfo("DeleteDrafts", "Completed");
        } catch (e) {
            ErrorHandler.postScheduledJobError(e);
        }
    }
}

export default new DeleteDrafts();
