import General from "../../../src/utility/General";
import {Comment} from 'openchs-models';

class TestCommentFactory {
    static create({uuid = General.randomUUID(), text = General.randomUUID(), displayUsername = General.randomUUID(), createdByUsername = General.randomUUID(),
                      createdDateTime = new Date(), lastModifiedDateTime = new Date(), commentThread, subject}) {
        const comment = new Comment();
        comment.uuid = uuid;
        comment.text = text;
        comment.displayUsername = displayUsername;
        comment.createdByUsername = createdByUsername;
        comment.createdDateTime = createdDateTime;
        comment.lastModifiedDateTime = lastModifiedDateTime;
        comment.commentThread = commentThread;
        comment.subject = subject;
        return comment;
    }
}

export default TestCommentFactory;
