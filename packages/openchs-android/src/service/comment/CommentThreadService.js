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
        this.transactionManager.write(() => {
            const savedCommentThread = this.repository.create(commentThread, true);
            this.getRepository(EntityQueue.schema.name).create(EntityQueue.create(savedCommentThread, this.getSchema()));
            General.logDebug('CommentThreadService', 'Comment Thread Saved');
        });
        return commentThread;
    }
}

export default CommentThreadService;
