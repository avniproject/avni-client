import CommentService from "../../service/comment/CommentService";
import UserInfoService from "../../service/UserInfoService";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import {Comment} from 'avni-models';

class CommentActions {

    static getInitialState(context) {
        return {
            comments: [],
            userInfo: {},
            subject: {},
        };
    }

    static onLoad(state, action, context) {
        const newState = {...state};
        const {individualUUID} = action.props;
        newState.comments = context.get(CommentService).getAllBySubjectUUID(individualUUID);
        newState.userInfo = context.get(UserInfoService).getUserInfo();
        newState.subject = context.get(IndividualService).findByUUID(individualUUID);
        return newState;
    }

    static onChangeText(state, action, context) {
        const newState = {...state};
        newState.newCommentText = action.value;
        return newState;
    }

    static onSend(state, action, context) {
        if (_.isEmpty(state.newCommentText)) {
            return state;
        }
        const newState = {...state};
        context.get(CommentService).saveOrUpdate(CommentActions._getCommentFromState(state));
        newState.comments = context.get(CommentService).getAllBySubjectUUID(state.subject.uuid);
        newState.newCommentText = "";
        return newState;
    }

    static _getCommentFromState(state) {
        const comment = {
            text: state.newCommentText,
            subject: state.subject,
            displayUsername: state.userInfo.getDisplayUsername(),
            createdByUsername: state.userInfo.username
        };
        return Comment.create(comment);
    }

}

const ActionPrefix = 'Comment';

const CommentActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_CHANGE_TEXT: `${ActionPrefix}.ON_CHANGE_TEXT`,
    ON_SEND: `${ActionPrefix}.ON_SEND`,
};

const CommentActionMap = new Map([
    [CommentActionNames.ON_LOAD, CommentActions.onLoad],
    [CommentActionNames.ON_CHANGE_TEXT, CommentActions.onChangeText],
    [CommentActionNames.ON_SEND, CommentActions.onSend],
]);

export {CommentActions, CommentActionNames, CommentActionMap}
