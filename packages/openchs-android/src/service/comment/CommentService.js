import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Comment, EntityQueue, Individual} from "avni-models";
import EntityService from "../EntityService";
import General from "../../utility/General";
import UserInfoService from "../UserInfoService";

@Service("commentService")
class CommentService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Comment.schema.name;
    }

    saveOrUpdate(comment) {
        const db = this.db;
        this.db.write(() => {
            const savedComment = db.create(this.getSchema(), comment, true);
            let individual = this.getService(EntityService).findByUUID(comment.subject.uuid, Individual.schema.name);
            individual.addComment(savedComment);
            db.create(EntityQueue.schema.name, EntityQueue.create(savedComment, this.getSchema()));
            General.logDebug('CommentService', 'Comment Saved');
        });
        return comment;
    }

    getThreadWiseFirstCommentForSubject(subjectUUID) {
        return this.getAllNonVoided()
            .filtered('subject.uuid = $0', subjectUUID)
            .filtered('TRUEPREDICATE sort(createdDateTime asc) Distinct(commentThread.uuid)')
    }

    getAllBySubjectUUIDAndThreadUUID(subjectUUID, threadUUID) {
        return this.getAllNonVoided()
            .filtered('subject.uuid = $0 and commentThread.uuid = $1',
                subjectUUID,
                threadUUID)
            .sorted('createdDateTime');
    }

    getAllExceptCurrentUser() {
        const {username} = this.getService(UserInfoService).getUserInfo();
        return this.getAllNonVoided()
            .filtered('createdByUsername <> $0', username)
            .sorted('createdDateTime');
    }
}

export default CommentService
