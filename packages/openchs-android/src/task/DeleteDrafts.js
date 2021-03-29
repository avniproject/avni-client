import General from "../utility/General";
import Realm from "realm";
import {DraftSubject, Schema} from "avni-models";
import moment from "moment";

const DeleteDrafts = (db) => {
    const ttl = 30;
    const ttlDate = moment().subtract(ttl, 'days').endOf('day').toDate();
    General.logInfo("DeleteDrafts", `deleting older drafts before ${ttlDate}`);
    db.objects(DraftSubject.schema.name)
        .filtered('updatedOn <= $0', ttlDate)
        .forEach(draft => db.write(() => db.delete(draft)));
};

export default DeleteDrafts
