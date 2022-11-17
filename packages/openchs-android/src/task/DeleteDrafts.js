import General from "../utility/General";
import {DraftSubject} from "openchs-models";
import moment from "moment";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";
import GlobalContext from "../GlobalContext";

class DeleteDrafts extends BaseTask {
    execute() {
        try {
            this.initDependencies();

            General.logInfo("DeleteDrafts", "Starting DeleteDrafts");
            const ttl = 30;
            const ttlDate = moment().subtract(ttl, 'days').endOf('day').toDate();
            General.logInfo("DeleteDrafts", `Deleting older drafts before ${ttlDate}`);
            const db = GlobalContext.getInstance().db;
            db.objects(DraftSubject.schema.name)
                .filtered('updatedOn <= $0', ttlDate)
                .forEach(draft => db.write(() => db.delete(draft)));
            General.logInfo("DeleteDrafts", "Completed");
        } catch (e) {
            ErrorHandler.postScheduledJobError(e);
        }
    }
}

export default new DeleteDrafts();
