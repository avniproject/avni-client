import CommentService from "../../service/comment/CommentService";
import UserInfoService from "../../service/UserInfoService";
import IndividualService from "../../service/IndividualService";
import {Comment, CommentThread} from 'avni-models';
import CommentThreadService from "../../service/comment/CommentThreadService";

class CommentActions {

    static getInitialState(context) {
        return {
            comments: [],
            userInfo: {},
            subject: {}
        };
    }

    static onLoad(state, action, context) {
        const newState = {...state};
        const {individualUUID} = action;
        newState.threadComments = context.get(CommentService).getThreadWiseFirstCommentForSubject(individualUUID);
        newState.userInfo = context.get(UserInfoService).getUserInfo();
        newState.subject = context.get(IndividualService).findByUUID(individualUUID);
        newState.comment = Comment.createEmptyInstance();
        return newState;
    }

    static onThreadLoad(state, action, context) {
        const newState = {...state};
        const {threadUUID} = action;
        newState.comments = context.get(CommentService).getAllBySubjectUUIDAndThreadUUID(state.subject.uuid, threadUUID);
        newState.comment = Comment.createEmptyInstance();
        return newState;
    }

    static onChangeText(state, action) {
        const newState = {...state};
        newState.comment = state.comment.editComment(action.value);
        return newState;
    }

    static onSend(state, action, context) {
        if (state.comment.isEmpty()) {
            return state;
        }
        const {threadUUID} = action;
        const newState = {...state};
        context.get(CommentService).saveOrUpdate(CommentActions._addUserAndAuditToComment(state, newState.isEdit, threadUUID, context));
        newState.threadComments = context.get(CommentService).getThreadWiseFirstCommentForSubject(state.subject.uuid);
        newState.comments = context.get(CommentService).getAllBySubjectUUIDAndThreadUUID(state.subject.uuid, threadUUID);
        newState.comment = Comment.createEmptyInstance();
        newState.isEdit = false;
        return newState;
    }

    static onEdit(state, action) {
        const newState = {...state};
        newState.isEdit = true;
        newState.comment = action.comment.cloneForEdit();
        return newState;
    }

    static onDelete(state, action, context) {
        const newState = {...state};
        const commentToDelete = action.comment.cloneForEdit();
        commentToDelete.voided = true;
        context.get(CommentService).saveOrUpdate(commentToDelete);
        newState.comments = context.get(CommentService).getAllBySubjectUUIDAndThreadUUID(state.subject.uuid, commentToDelete.commentThread.uuid);
        return newState;
    }

    static onThreadResolve(state, action, context) {
        const newState = {...state};
        const {threadUUID} = action;
        const commentThread = context.get(CommentThreadService).findByUUID(threadUUID);
        context.get(CommentThreadService).saveOrUpdate(commentThread.markResolved());
        newState.threadComments = context.get(CommentService).getThreadWiseFirstCommentForSubject(state.subject.uuid);
        newState.comments = context.get(CommentService).getAllBySubjectUUIDAndThreadUUID(state.subject.uuid, threadUUID);
        newState.comment = Comment.createEmptyInstance();
        return newState;
    }

    static _addUserAndAuditToComment(state, isEdit, threadUUID, context) {
        const comment = state.comment;
        comment.commentThread = this.getThreadForComment(comment, threadUUID, context);
        if (isEdit) {
            comment.lastModifiedDateTime = new Date();
            return comment;
        }
        comment.displayUsername = state.userInfo.getDisplayUsername();
        comment.createdByUsername = state.userInfo.username;
        comment.subject = state.subject;
        comment.lastModifiedDateTime = new Date();
        comment.createdDateTime = new Date();
        return comment;
    }

    static getThreadForComment(comment, threadUUID, context) {
        if (threadUUID) {
            const commentThread = context.get(CommentThreadService).findByUUID(threadUUID);
            return commentThread.isResolved() ? context.get(CommentThreadService).saveOrUpdate(commentThread.openThread()) : commentThread;
        } else {
            const commentThread = comment.commentThread.cloneForEdit();
            commentThread.status = CommentThread.threadStatus.Open;
            commentThread.openDateTime = new Date();
            return context.get(CommentThreadService).saveOrUpdate(commentThread);
        }
    }
}

const ActionPrefix = 'Comment';

const CommentActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_THREAD_LOAD: `${ActionPrefix}.ON_THREAD_LOAD`,
    ON_CHANGE_TEXT: `${ActionPrefix}.ON_CHANGE_TEXT`,
    ON_SEND: `${ActionPrefix}.ON_SEND`,
    ON_EDIT: `${ActionPrefix}.ON_EDIT`,
    ON_DELETE: `${ActionPrefix}.ON_DELETE`,
    ON_THREAD_RESOLVE: `${ActionPrefix}.ON_THREAD_RESOLVE`,
};

const CommentActionMap = new Map([
    [CommentActionNames.ON_LOAD, CommentActions.onLoad],
    [CommentActionNames.ON_THREAD_LOAD, CommentActions.onThreadLoad],
    [CommentActionNames.ON_CHANGE_TEXT, CommentActions.onChangeText],
    [CommentActionNames.ON_SEND, CommentActions.onSend],
    [CommentActionNames.ON_EDIT, CommentActions.onEdit],
    [CommentActionNames.ON_DELETE, CommentActions.onDelete],
    [CommentActionNames.ON_THREAD_RESOLVE, CommentActions.onThreadResolve],
]);

export {CommentActions, CommentActionNames, CommentActionMap}
