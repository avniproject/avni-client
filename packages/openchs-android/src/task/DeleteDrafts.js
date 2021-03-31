import General from "../utility/General";
import {DraftSubject} from "avni-models";
import moment from "moment";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";

class DeleteDrafts extends BaseTask {
    execute() {
        try {
            this.assertDbPresent();

            General.logInfo("DeleteDrafts", "Starting DeleteDrafts");
            const ttl = 30;
            const ttlDate = moment().subtract(ttl, 'days').endOf('day').toDate();
            General.logInfo("DeleteDrafts", `Deleting older drafts before ${ttlDate}`);
            this.db.objects(DraftSubject.schema.name)
                .filtered('updatedOn <= $0', ttlDate)
                .forEach(draft => this.db.write(() => this.db.delete(draft)));
            General.logInfo("DeleteDrafts", "Completed");
        } catch (e) {
            ErrorHandler.postScheduledJobError(e);
        }
    }
}

export default new DeleteDrafts();