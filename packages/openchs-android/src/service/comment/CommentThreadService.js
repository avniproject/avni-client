import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import General from "../../utility/General";
import {CommentThread, EntityQueue} from "avni-models";

@Service("commentThreadService")
class CommentThreadService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return CommentThread.schema.name;
    }

    saveOrUpdate(commentThread) {
        const db = this.db;
        this.db.write(() => {
            const savedCommentThread = db.create(this.getSchema(), commentThread, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(savedCommentThread, this.getSchema()));
            General.logDebug('CommentThreadService', 'Comment Thread Saved');
        });
        return commentThread;
    }
}

export default CommentThreadService;
