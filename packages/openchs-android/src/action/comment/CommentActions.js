import CommentService from "../../service/comment/CommentService";
import UserInfoService from "../../service/UserInfoService";
import IndividualService from "../../service/IndividualService";
import {Comment} from 'avni-models';

class CommentActions {

    static getInitialState(context) {
        return {
            comments: [],
            userInfo: {},
            subject: {},
            openDeleteDialog: false
        };
    }

    static onLoad(state, action, context) {
        const newState = {...state};
        const {individualUUID} = action.props;
        newState.comments = context.get(CommentService).getAllBySubjectUUID(individualUUID);
        newState.userInfo = context.get(UserInfoService).getUserInfo();
        newState.subject = context.get(IndividualService).findByUUID(individualUUID);
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
        const newState = {...state};
        context.get(CommentService).saveOrUpdate(CommentActions._addUserAndAuditToComment(state, newState.isEdit));
        newState.comments = context.get(CommentService).getAllBySubjectUUID(state.subject.uuid);
        newState.comment = Comment.createEmptyInstance();
        newState.isEdit = false;
        return newState;
    }

    static onEdit(state, action) {
        const newState = {...state};
        newState.isEdit = true;
        newState.comment = action.comment;
        return newState;
    }

    static onDelete(state, action) {
        const newState = {...state};
        newState.openDeleteDialog = action.openDeleteDialog;
        newState.commentToDelete = action.comment;
        return newState;
    }

    static onConfirmDelete(state, action, context) {
        const newState = {...state};
        const comment = state.commentToDelete.cloneForEdit();
        comment.voided = true;
        context.get(CommentService).saveOrUpdate(comment);
        newState.comments = context.get(CommentService).getAllBySubjectUUID(state.subject.uuid);
        newState.openDeleteDialog = false;
        _.unset(newState, 'commentToDelete');
        return newState;
    }

    static _addUserAndAuditToComment(state, isEdit) {
        const comment = state.comment;
        if (isEdit) {
            return comment;
        }
        comment.displayUsername = state.userInfo.getDisplayUsername();
        comment.createdByUsername = state.userInfo.username;
        comment.subject = state.subject;
        comment.lastModifiedDateTime = new Date();
        comment.createdDateTime = new Date();
        return comment;
    }

}

const ActionPrefix = 'Comment';

const CommentActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_CHANGE_TEXT: `${ActionPrefix}.ON_CHANGE_TEXT`,
    ON_SEND: `${ActionPrefix}.ON_SEND`,
    ON_EDIT: `${ActionPrefix}.ON_EDIT`,
    ON_DELETE: `${ActionPrefix}.ON_DELETE`,
    ON_CONFIRM_DELETE: `${ActionPrefix}.ON_CONFIRM_DELETE`,
};

const CommentActionMap = new Map([
    [CommentActionNames.ON_LOAD, CommentActions.onLoad],
    [CommentActionNames.ON_CHANGE_TEXT, CommentActions.onChangeText],
    [CommentActionNames.ON_SEND, CommentActions.onSend],
    [CommentActionNames.ON_EDIT, CommentActions.onEdit],
    [CommentActionNames.ON_DELETE, CommentActions.onDelete],
    [CommentActionNames.ON_CONFIRM_DELETE, CommentActions.onConfirmDelete],
]);

export {CommentActions, CommentActionNames, CommentActionMap}
