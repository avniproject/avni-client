import _ from 'lodash';
import Actions from '../../action';
import SessionFactory from '../../factory/SessionFactory';
import AppState from '../../hack/AppState';

const createSession = function (state = {}, action, beans) {
    const existingSession = state[action.questionnaireUUID];
    state[action.questionnaireUUID] = existingSession || SessionFactory.getSession(action.questionnaireUUID);
    return state;
};

export default new Map([[Actions.CREATE_SESSION, createSession]]);
