import General from "../../../src/utility/General";
import {CommentThread} from "openchs-models";

class TestCommentThreadFactory {
    static create({uuid = General.randomUUID(), status = CommentThread.threadStatus.Open, openDateTime = new Date(), resolvedDateTime}) {
        const commentThread = new CommentThread();
        commentThread.uuid = uuid;
        commentThread.status = status;
        commentThread.openDateTime = openDateTime;
        commentThread.resolvedDateTime = resolvedDateTime;
        return commentThread;
    }
}

export default TestCommentThreadFactory;
