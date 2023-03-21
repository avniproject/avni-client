import UserInfoService from "../../service/UserInfoService";
import {orderBy, size} from 'lodash';

class GlificActions {

    static TAB_TYPE_SENT_MSGS = "Sent Messages";
    static TAB_TYPE_SCHEDULED_MSGS = "Scheduled Messages";

    static getInitialState(context) {
        return {
            showSpinnerWhileLoadingSentMessages: true,
            showSpinnerWhileLoadingScheduledMessages: true,
            showSpinnerWhileLoadingGlificContact: true,
            tabType: "Sent Messages",
            sentMessages: [],
            scheduledMessages: [],
            userInfo: {},
            individualUUID: null,
            failedToFetchSentMessages: false,
            setMsgsSentAvailable: false,
            failedToFetchScheduledMessages: false,
            setMsgsScheduledAvailable: false,
        };
    }

    static onLoadScheduledAndSentMsgs(state, action, context) {
        const {newState, individualUUID} = action;
        newState.userInfo = context.get(UserInfoService).getUserInfo();
        newState.individualUUID = individualUUID;
        return newState;
    }


    static onSentMsgsClick(state, action, context) {
        const newState = {...state};
        newState.tabType = "Sent Messages";
        return newState;
    }

    static onScheduledMsgsClick = (state, action, context) => {
        const newState = {...state};
        newState.tabType = "Scheduled Messages";
        return newState;
    }

    static onFetchOfSentMsgs(state, action, context) {
        const newState = {...state};
        newState.sentMessages = action.sentMessages;
        newState.failedToFetchSentMessages = action.failedToFetchSentMessages;
        newState.setMsgsSentAvailable = (size(newState.sentMessages) > 0);
        newState.showSpinnerWhileLoadingSentMessages = false;
        newState.sentMessages = orderBy(newState.sentMessages, "insertedAt", "desc");
        return newState;
    }

    static onFetchOfScheduledMsgs(state, action, context) {
        const newState = {...state};
        newState.scheduledMessages = action.scheduledMessages;
        newState.failedToFetchScheduledMessages = action.failedToFetchScheduledMessages;
        newState.setMsgsScheduledAvailable = (size(newState.scheduledMessages) > 0);
        newState.showSpinnerWhileLoadingScheduledMessages = false;
        newState.scheduledMessages = orderBy(newState.scheduledMessages, "insertedAt", "desc");
        return newState;
    }

  static onFetchOfGlificContact(state, action, context) {
    const newState = {...state};
    newState.glificContact = action.glificContact;
    newState.showSpinnerWhileLoadingGlificContact = false;
    return newState;
  }
}

const ActionPrefix = 'Glific';

const GlificActionNames = {
    ON_LOAD_SCHEDULED_AND_SENT_MSGS: `${ActionPrefix}.ON_LOAD_SCHEDULED_AND_SENT_MSGS`,
    ON_SENT_MSGS_CLICK: `${ActionPrefix}.ON_SENT_MSGS_CLICK`,
    ON_SCHEDULED_MSGS_CLICK: `${ActionPrefix}.ON_SCHEDULED_MSGS_CLICK`,
    ON_FETCH_OF_SENT_MSGS: `${ActionPrefix}.ON_FETCH_OF_SENT_MSGS`,
    ON_FETCH_OF_SCHEDULED_MSGS: `${ActionPrefix}.ON_FETCH_OF_SCHEDULED_MSGS`,
    ON_FETCH_OF_GLIFIC_CONTACT: `${ActionPrefix}.ON_FETCH_OF_GLIFIC_CONTACT`,
};

const GlificActionMap = new Map([
    [GlificActionNames.ON_LOAD_SCHEDULED_AND_SENT_MSGS, GlificActions.onLoadScheduledAndSentMsgs],
    [GlificActionNames.ON_SENT_MSGS_CLICK, GlificActions.onSentMsgsClick],
    [GlificActionNames.ON_SCHEDULED_MSGS_CLICK, GlificActions.onScheduledMsgsClick],
    [GlificActionNames.ON_FETCH_OF_SENT_MSGS, GlificActions.onFetchOfSentMsgs],
    [GlificActionNames.ON_FETCH_OF_SCHEDULED_MSGS, GlificActions.onFetchOfScheduledMsgs],
    [GlificActionNames.ON_FETCH_OF_GLIFIC_CONTACT, GlificActions.onFetchOfGlificContact],
]);

export {GlificActions, GlificActionNames, GlificActionMap}
